import { api } from '../api/client';
import { recordingToWav } from './interviewVoice';

export type PeerParticipant = { id: string; name: string; photo_url?: string; client_id: string | null; seen_ms: number; mic: boolean; camera: boolean; consent: boolean };
export type PeerNote = { id: string; user_id: string; source: 'note' | 'transcript'; speaker_role: string; content: string; created_ms: number };
export type PeerReport = { summary: string; coverage: string; strengths: string[]; mistakes: { quote: string; issue: string; improvement: string }[]; nextSteps: string[]; reviewedEntries: number; totalEntries: number };
export type PeerRoomData = { id: string; host_id: string; guest_id?: string; interviewer_id: string; title: string; status: 'WAITING' | 'ACTIVE' | 'COMPLETED'; epoch: number; revision: number; content_revision: number; created_ms: number; expires_ms: number; started_ms?: number; ended_ms?: number; serverTime: number; participants: PeerParticipant[]; notes?: PeerNote[]; feedback?: { author_id: string; clarity: number; strengths: string; improvements: string }[]; report?: PeerReport | null; signals?: { seq: number; kind: string; payload: any }[] };
export type PeerConfig = { iceServers: RTCIceServer[]; relayAvailable: boolean; transcriptionAvailable: boolean; analysisAvailable: boolean };
export type CallState = { mic: boolean; camera: boolean; connection: string; error: string; transcriptError: string; pending: number; local: MediaStream | null; remote: MediaStream | null };
export const initialCall: CallState = { mic: false, camera: false, connection: 'joining', error: '', transcriptError: '', pending: 0, local: null, remote: null };

/** A room owns its tracks and connection. Camera/mic are only requested by explicit controls. */
export class PeerCall {
  state: CallState = { ...initialCall };
  private clientId = crypto.randomUUID();
  private disposed = false;
  private timer?: ReturnType<typeof setTimeout>;
  private pc?: RTCPeerConnection;
  private epoch = -1;
  private cursor = 0;
  private candidates: RTCIceCandidateInit[] = [];
  private audioSender?: RTCRtpSender;
  private videoSender?: RTCRtpSender;
  private offerStarted = false;
  private connectionTimer?: ReturnType<typeof setTimeout>;
  private sendQueue = Promise.resolve();
  private room?: PeerRoomData;
  private local = new MediaStream();
  private mediaBusy = new Set<string>();
  private recorder?: MediaRecorder;
  private recordTimer?: ReturnType<typeof setTimeout>;
  private uploads = new Set<Promise<void>>();
  private audioContext?: AudioContext;
  private analyser?: AnalyserNode;
  private recordingFinished?: Promise<void>;
  private consent = false;
  private recordingRole?: string;
  private ended = false;
  private controller = new AbortController();
  constructor(private id: string, private uid: string, private config: PeerConfig,
    private onRoom: (room: PeerRoomData) => void, private onState: (state: CallState) => void) {}
  private emit(update: Partial<CallState>) { this.state = { ...this.state, ...update }; if (!this.disposed) this.onState(this.state); }
  private path(suffix: string) { return `/peer/rooms/${this.id}/${suffix}`; }
  private async request<T = any>(suffix: string, body: unknown) {
    const timeout = new AbortController();
    const parent = this.controller.signal;
    const abort = () => timeout.abort();
    parent.addEventListener('abort', abort, { once: true });
    if (parent.aborted) timeout.abort();
    const timer = setTimeout(abort, 15000);
    try { return await api<T>(this.path(suffix), { method: 'POST', body: JSON.stringify(body), signal: timeout.signal }); }
    finally { clearTimeout(timer); parent.removeEventListener('abort', abort); }
  }
  async start() {
    const controller = this.controller;
    try {
      this.config = await api<PeerConfig>('/peer/config', { signal: controller.signal });
      if (this.disposed || controller !== this.controller) return;
      const r = await this.request<PeerRoomData>('connect', { clientId: this.clientId });
      if (this.disposed || controller !== this.controller) return;
      this.onRoom(r); this.room = r; this.consent = !!r.participants.find(p => p.id === this.uid)?.consent;
      this.emit({ connection: 'waiting', error: '' });
      await this.poll();
    } catch (e) { if (!this.disposed && controller === this.controller) this.emit({ error: (e as Error).message, connection: 'failed' }); }
  }
  private async poll() {
    if (this.disposed) return;
    const controller = this.controller;
    try {
      const r = await this.request<PeerRoomData>('sync', { clientId: this.clientId, epoch: Math.max(0,this.epoch), cursor: this.cursor, mic: this.state.mic, camera: this.state.camera });
      if (this.disposed || controller !== this.controller) return;
      this.room = r; this.onRoom(r);
      if (r.status === 'COMPLETED') {
        if (!this.ended) { this.ended = true; clearTimeout(this.connectionTimer); this.emit({ pending: this.uploads.size + (this.recorder ? 1 : 0) }); this.stopRecording(); this.stopTracks(); this.pc?.close(); this.emit({ connection: 'ended', mic: false, camera: false }); }
      } else {
        if (r.epoch !== this.epoch) await this.buildConnection(r);
        const other = r.participants.find(p => p.id !== this.uid);
        if (other?.client_id && other.seen_ms > r.serverTime - 15000) {
          if (this.uid === r.host_id && !this.offerStarted) {
            this.offerStarted = true;
            const pc = this.pc!;
            await pc.setLocalDescription(await pc.createOffer());
            await this.send('description', pc.localDescription!.toJSON());
          }
        } else if (this.pc?.connectionState !== 'connected') this.emit({ connection: 'waiting' });
        for (const signal of r.signals || []) {
          if (signal.seq <= this.cursor) continue;
          await this.receive(signal.kind, signal.payload);
          this.cursor = signal.seq;
        }
        this.updateRecording();
      }
      if (this.state.error.startsWith('Connection to SkillNex')) this.emit({ error: '' });
    } catch (e) {
      if (!this.disposed && controller === this.controller) this.emit({ error: 'Connection to SkillNex interrupted. ' + (e as Error).message });
    } finally {
      if (!this.disposed && controller === this.controller) this.timer = setTimeout(() => void this.poll(), this.ended ? 5000 : 1800);
    }
  }
  private async buildConnection(r: PeerRoomData) {
    clearTimeout(this.connectionTimer);
    this.pc?.close(); this.epoch = r.epoch; this.cursor = 0; this.candidates = []; this.offerStarted = false;
    const pc = new RTCPeerConnection({ iceServers: this.config.iceServers }); this.pc = pc;
    const remote = new MediaStream();
    this.emit({ remote, connection: 'connecting', error: '' });
    this.audioSender = undefined; this.videoSender = undefined;
    // Only the offerer creates media sections. The answerer uses the offered
    // transceivers, including when both devices were off when the offer arrived.
    if (this.uid === r.host_id) {
      pc.addTransceiver('audio', { direction: 'sendrecv', streams: [this.local] });
      pc.addTransceiver('video', { direction: 'sendrecv', streams: [this.local] });
      await this.attachTracks(pc);
    }
    pc.ontrack = e => {
      if (this.pc !== pc || this.disposed || this.ended) return;
      remote.addTrack(e.track);
      const update = () => { if (this.pc === pc && !this.disposed) this.emit({ remote }); };
      e.track.onunmute = update; e.track.onmute = update; e.track.onended = update;
      update();
    };
    pc.onicecandidate = e => { if (e.candidate && this.pc === pc) void this.send('candidate', e.candidate.toJSON()).catch(() => {}); };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc || this.disposed || this.ended) return;
      clearTimeout(this.connectionTimer);
      this.emit({ connection: pc.connectionState });
      if (pc.connectionState === 'connected') this.emit({ error: '' });
      else if (pc.connectionState === 'failed') this.connectionFailed();
      else if (pc.connectionState === 'connecting' || pc.connectionState === 'disconnected') {
        this.connectionTimer = setTimeout(() => { if (this.pc === pc && !this.disposed && !this.ended && pc.connectionState !== 'connected') this.connectionFailed(); }, 25000);
      }
    };
  }
  private connectionFailed() {
    this.emit({ connection: 'failed', error: this.config.relayAvailable
      ? 'Audio/video could not reach your partner. Press Reconnect on either device to retry the call.'
      : 'Audio/video cannot cross these networks yet because this site has no call relay configured. Reconnecting alone may not help.' });
  }
  private async attachTracks(pc: RTCPeerConnection) {
    for (const t of pc.getTransceivers()) {
      const kind = t.receiver.track.kind;
      if (kind !== 'audio' && kind !== 'video') continue;
      t.direction = 'sendrecv';
      t.sender.setStreams(this.local);
      if (kind === 'audio') this.audioSender = t.sender; else this.videoSender = t.sender;
      await t.sender.replaceTrack(this.local.getTracks().find(track => track.kind === kind && track.readyState === 'live') || null);
    }
  }
  private send(kind: string, payload: unknown) {
    const epoch = this.epoch;
    const task = this.sendQueue.then(async () => {
      if (this.disposed || epoch !== this.epoch || this.ended) return;
      await this.request('signal', { clientId: this.clientId, epoch, kind, payload });
    });
    this.sendQueue = task.catch(e => { if (!this.disposed && epoch === this.epoch) this.emit({ error: (e as Error).message }); });
    return task;
  }
  private async receive(kind: string, payload: any) {
    const pc = this.pc; if (!pc) return;
    if (kind === 'description') {
      await pc.setRemoteDescription(payload);
      for (const c of this.candidates) await pc.addIceCandidate(c);
      this.candidates = [];
      if (payload.type === 'offer') {
        await this.attachTracks(pc);
        await pc.setLocalDescription(await pc.createAnswer());
        await this.send('description', pc.localDescription!.toJSON());
      }
    } else if (pc.remoteDescription) await pc.addIceCandidate(payload);
    else this.candidates.push(payload);
  }
  async reconnect() {
    if (this.disposed || this.ended) return;
    clearTimeout(this.connectionTimer); this.pc?.close();
    clearTimeout(this.timer); this.controller.abort(); this.controller = new AbortController();
    this.emit({ connection: 'connecting', remote: null, error: '' });
    // start() fetches fresh relay credentials before connecting.
    this.clientId = crypto.randomUUID(); this.epoch = -1; this.cursor = 0;
    await this.start();
  }
  async toggle(kind: 'audio' | 'video') {
    if (this.disposed || this.ended || this.mediaBusy.has(kind)) return;
    if (!this.room) { this.emit({ error: 'Wait for your room to connect before starting your microphone or camera.' }); return; }
    this.mediaBusy.add(kind);
    try {
      const tracks = kind === 'audio' ? this.local.getAudioTracks() : this.local.getVideoTracks();
      const sender = kind === 'audio' ? this.audioSender : this.videoSender;
      if (tracks.length) {
        if (kind === 'audio') { this.emit({ mic: false }); this.stopRecording(); }
        await sender?.replaceTrack(null);
        tracks.forEach(t => { t.stop(); this.local.removeTrack(t); });
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone and camera need HTTPS and a supported browser.');
        const stream = await navigator.mediaDevices.getUserMedia(kind === 'audio' ? { audio: { echoCancellation: true, noiseSuppression: true }, video: false } : { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
        if (this.disposed || this.ended) { stream.getTracks().forEach(t => t.stop()); return; }
        const track = stream.getTracks()[0]; this.local.addTrack(track);
        track.onended = () => { this.local.removeTrack(track); this.refreshMedia(); if (kind === 'audio') this.stopRecording(); };
        await (kind === 'audio' ? this.audioSender : this.videoSender)?.replaceTrack(track);
      }
      this.refreshMedia(); if (this.state.connection !== 'failed') this.emit({ error: '' }); this.updateRecording();
    } catch (e) {
      const name = (e as DOMException).name;
      this.emit({ error: name === 'NotAllowedError' ? `${kind === 'audio' ? 'Microphone' : 'Camera'} permission was denied. Allow it in your browser's site settings, then try again.` : name === 'NotFoundError' ? `No ${kind === 'audio' ? 'microphone' : 'camera'} was found. Check your device connection.` : (e as Error).message });
    } finally { this.mediaBusy.delete(kind); }
  }
  private refreshMedia() { this.emit({ mic: this.local.getAudioTracks().length > 0, camera: this.local.getVideoTracks().length > 0, local: new MediaStream(this.local.getTracks()) }); }
  async setConsent(enabled: boolean) {
    await this.request('consent', { enabled }); this.consent = enabled;
    this.emit({ transcriptError: '' });
    if (!enabled) this.stopRecording(false);
    this.updateRecording();
  }
  private updateRecording() {
    const currentRole = this.room?.interviewer_id === this.uid ? 'interviewer' : 'candidate';
    if (this.recorder && this.recordingRole !== currentRole) { this.stopRecording(); return; }
    if (!this.consent || !this.config.transcriptionAvailable || this.room?.status !== 'ACTIVE' || !this.state.mic || this.recorder || this.ended || this.state.transcriptError) return;
    if (typeof MediaRecorder === 'undefined') { this.emit({ transcriptError: 'This browser cannot capture a transcript. You can save written answers in Notes.' }); return; }
    const stream = new MediaStream(this.local.getAudioTracks());
    const chunks: BlobPart[] = []; const clipId = crypto.randomUUID();
    const role = currentRole;
    let spoke = false;
    let levels: ReturnType<typeof setInterval> | undefined;
    let source: MediaStreamAudioSourceNode | undefined;
    let analyser: AnalyserNode | undefined;
    try {
      this.audioContext ||= new AudioContext();
      void this.audioContext.resume();
      source = this.audioContext.createMediaStreamSource(stream);
      analyser = this.audioContext.createAnalyser(); analyser.fftSize = 512; source.connect(analyser); this.analyser = analyser;
      const samples = new Float32Array(512);
      levels = setInterval(() => { analyser!.getFloatTimeDomainData(samples); if (Math.sqrt(samples.reduce((s,v)=>s+v*v,0)/samples.length)>0.008) spoke = true; }, 250);
      const recorder = new MediaRecorder(stream); this.recorder = recorder;
      this.recordingRole = role;
      let save = true; (recorder as MediaRecorder & { discard?: () => void }).discard = () => { save = false; };
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      let resolveFinished!: () => void;
      this.recordingFinished = new Promise<void>(resolve => { resolveFinished = resolve; });
      recorder.onstop = () => {
        clearInterval(levels); source?.disconnect(); analyser?.disconnect(); this.analyser = undefined;
        if (this.recorder === recorder) this.recorder = undefined;
        if (save && spoke && chunks.length && !this.disposed) {
          const job = this.upload(new Blob(chunks, { type: recorder.mimeType }), clipId, role);
          this.uploads.add(job); this.emit({ pending: this.uploads.size });
          void job.finally(() => { this.uploads.delete(job); this.emit({ pending: this.uploads.size }); });
        }
        this.emit({ pending: this.uploads.size }); resolveFinished(); if (!this.disposed) this.updateRecording();
      };
      recorder.onerror = () => { this.emit({ transcriptError: 'Transcript capture stopped. Use written notes or turn transcript off and on to retry.' }); this.stopRecording(false); };
      recorder.start(); this.recordTimer = setTimeout(() => { if (recorder.state === 'recording') recorder.stop(); }, 30000);
    } catch (e) {
      clearInterval(levels); source?.disconnect(); analyser?.disconnect(); this.recorder = undefined;
      this.emit({ transcriptError: 'Transcript could not start. ' + (e as Error).message });
    }
  }
  private async upload(blob: Blob, clipId: string, speakerRole: string) {
    try {
      const encoded = await recordingToWav(blob);
      if (this.disposed) return;
      const data = new FormData(); data.append('audio', encoded.wav, 'speech.wav'); data.append('clipId', clipId); data.append('speakerRole', speakerRole); data.append('language', 'en-IN');
      await api(this.path('transcribe'), { method: 'POST', body: data, signal: this.controller.signal });
    } catch (e) { if (!this.disposed) this.emit({ transcriptError: 'A transcript segment could not be saved. Add missing answers in Notes. ' + (e as Error).message }); }
  }
  private stopRecording(save = true) {
    clearTimeout(this.recordTimer);
    if (!save) (this.recorder as (MediaRecorder & { discard?: () => void }) | undefined)?.discard?.();
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }
  async finish() {
    clearTimeout(this.connectionTimer);
    this.ended = true; this.emit({ pending: this.uploads.size + (this.recorder ? 1 : 0) }); this.stopRecording(); this.stopTracks(); this.pc?.close();
    this.emit({ connection: 'ended', mic: false, camera: false });
    await this.recordingFinished; await Promise.all([...this.uploads]);
  }
  private stopTracks() { this.local.getTracks().forEach(t => t.stop()); }
  destroy() {
    this.disposed = true; clearTimeout(this.timer); clearTimeout(this.connectionTimer); this.stopRecording(false); this.stopTracks(); this.pc?.close(); void this.audioContext?.close(); this.controller.abort();
    void fetch('/api' + this.path('leave'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: this.clientId }), keepalive: true }).catch(() => {});
  }
}
