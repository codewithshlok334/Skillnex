import { api, ApiError } from '../api/client';
import { recordingToWav } from './interviewVoice';

export type PeerParticipant = { id: string; name: string; photo_url?: string; client_id: string | null; seen_ms: number; mic: boolean; camera: boolean; consent: boolean };
export type PeerNote = { id: string; user_id: string; source: 'note' | 'transcript'; speaker_role: string; content: string; created_ms: number; shared?: boolean };
export type PeerMistake = { noteId?: string; quote: string; issue: string; improvement: string };
export type PeerParticipantReport = { userId: string; name: string; roles: string[]; coverage: string; evidenceEntries: number; totalEvidenceEntries?: number; status?: 'reviewed' | 'insufficient_evidence'; overallScore: number | null; criteria: { key: string; label: string; score: number | null; reason: string }[]; strengths: string[]; mistakes: PeerMistake[]; improvements: string[]; nextSteps: string[] };
export type PeerReviewV2 = { version: 2; summary: string; coverage: string; reviewedEntries: number; totalEntries: number; participants: PeerParticipantReport[] };
export type PeerLegacyReport = { version?: 1; summary: string; coverage: string; reviewedEntries: number; totalEntries: number; strengths: string[]; mistakes: PeerMistake[]; nextSteps: string[] };
export type PeerReport = PeerReviewV2 | PeerLegacyReport;
export type PeerRoomData = { id: string; host_id: string; guest_id?: string; interviewer_id: string; title: string; status: 'WAITING' | 'ACTIVE' | 'COMPLETED'; epoch: number; revision: number; content_revision: number; created_ms: number; expires_ms: number; started_ms?: number; ended_ms?: number; serverTime: number; participants: PeerParticipant[]; notes?: PeerNote[]; feedback?: { author_id: string; clarity: number; strengths: string; improvements: string }[]; report?: PeerReport | null; signals?: { seq: number; kind: string; payload: any }[] };
export type PeerConfig = { iceServers: RTCIceServer[]; relayAvailable: boolean; transcriptionAvailable: boolean; analysisAvailable: boolean };
export type CallState = { mic: boolean; camera: boolean; connection: string; error: string; transcriptError: string; pending: number; local: MediaStream | null; remote: MediaStream | null; micLevel: number; micIssue: string; microphones: { deviceId: string; label: string }[]; selectedMicrophone: string };
export const initialCall: CallState = { mic: false, camera: false, connection: 'joining', error: '', transcriptError: '', pending: 0, local: null, remote: null, micLevel: 0, micIssue: '', microphones: [], selectedMicrophone: '' };

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
  private lastDescription?: string;
  private audioSender?: RTCRtpSender;
  private videoSender?: RTCRtpSender;
  private offerStarted = false;
  private connectionTimer?: ReturnType<typeof setTimeout>;
  private pendingSignals: { kind: string; payload: unknown }[] = [];
  private attaching = Promise.resolve();
  private recoveryTimer?: ReturnType<typeof setTimeout>;
  private recoveryAttempts = 0;
  private reconnecting = false;
  private meterContext?: AudioContext;
  private meterSource?: MediaStreamAudioSourceNode;
  private meterTimer?: ReturnType<typeof setInterval>;
  private room?: PeerRoomData;
  private local = new MediaStream();
  private replacingTracks = new Set<MediaStreamTrack>();
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
  // Reconnecting signaling must not cancel a transcript that is still saving.
  private transcriptController = new AbortController();
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
        if (this.disposed || controller !== this.controller) return;
        const other = r.participants.find(p => p.id !== this.uid);
        if (other?.client_id && other.seen_ms > r.serverTime - 15000) {
          if (this.uid === r.host_id && !this.offerStarted) {
            const pc = this.pc!;
            await pc.setLocalDescription(await pc.createOffer());
            if (!this.current(pc)) return;
            this.offerStarted = true;
            this.queueSignal('description', pc.localDescription!.toJSON());
          }
        } else if (this.pc?.connectionState !== 'connected') this.emit({ connection: 'waiting' });
        for (const signal of r.signals || []) {
          if (signal.seq <= this.cursor) continue;
          await this.receive(signal.kind, signal.payload);
          if (this.disposed || controller !== this.controller) return;
          this.cursor = signal.seq;
        }
        await this.flushSignals();
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
    clearTimeout(this.recoveryTimer); this.recoveryTimer = undefined;
    this.pc?.close(); this.epoch = r.epoch; this.cursor = 0; this.candidates = []; this.pendingSignals = []; this.offerStarted = false; this.lastDescription = undefined;
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
      if (!remote.getTracks().includes(e.track)) remote.addTrack(e.track);
      const update = () => { if (this.pc === pc && !this.disposed) this.emit({ remote }); };
      e.track.onunmute = update; e.track.onmute = update; e.track.onended = update;
      update();
    };
    pc.onicecandidate = e => { if (e.candidate && this.current(pc)) this.queueSignal('candidate', e.candidate.toJSON()); };
    pc.onconnectionstatechange = () => {
      if (this.pc !== pc || this.disposed || this.ended) return;
      clearTimeout(this.connectionTimer);
      this.emit({ connection: pc.connectionState });
      if (pc.connectionState === 'connected') { clearTimeout(this.recoveryTimer); this.recoveryTimer = undefined; this.emit({ error: '' }); }
      else if (pc.connectionState === 'failed') this.connectionFailed();
      else if (pc.connectionState === 'connecting' || pc.connectionState === 'disconnected') {
        this.connectionTimer = setTimeout(() => { if (this.pc === pc && !this.disposed && !this.ended && pc.connectionState !== 'connected') this.connectionFailed(); }, 25000);
      }
    };
  }
  private connectionFailed() {
    if (this.disposed || this.ended) return;
    this.emit({ connection: 'failed', error: this.config.relayAvailable
      ? 'Audio/video could not reach your partner. Press Reconnect on either device to retry the call.'
      : 'Audio/video cannot cross these networks yet because this site has no call relay configured. Reconnecting alone may not help.' });
    // Prefer the host so both devices do not repeatedly reset the room epoch.
    // A guest can recover when the host is suspended or cannot do so itself.
    if (this.recoveryTimer || this.recoveryAttempts >= 2 || !this.room?.participants.some(p => p.id !== this.uid && p.client_id && p.seen_ms > this.room!.serverTime - 15000)) return;
    const pc = this.pc;
    this.recoveryTimer = setTimeout(() => {
      this.recoveryTimer = undefined;
      if (pc !== this.pc || this.disposed || this.ended || pc?.connectionState === 'connected') return;
      this.recoveryAttempts++;
      void this.reconnect(true);
    }, this.uid === this.room.host_id ? 1500 : 7000);
  }
  private current(pc: RTCPeerConnection) { return this.pc === pc && !this.disposed && !this.ended; }
  private attachTracks(pc: RTCPeerConnection) {
    // Media permission and remote SDP can resolve in either order. Serialize
    // replacement and read the current track inside the queue, never before it.
    const task = this.attaching.catch(() => {}).then(async () => {
      if (!this.current(pc)) return;
      for (const t of pc.getTransceivers()) {
        if (!this.current(pc)) return;
        const kind = t.receiver.track.kind;
        if (kind !== 'audio' && kind !== 'video') continue;
        t.direction = 'sendrecv';
        t.sender.setStreams(this.local);
        if (kind === 'audio') this.audioSender = t.sender; else this.videoSender = t.sender;
        const track = this.local.getTracks().find(track => track.kind === kind && track.readyState === 'live') || null;
        if (t.sender.track !== track) await t.sender.replaceTrack(track);
      }
    });
    this.attaching = task;
    return task;
  }
  private queueSignal(kind: string, payload: unknown) { this.pendingSignals.push({ kind, payload }); }
  private async flushSignals() {
    const pc = this.pc, epoch = this.epoch;
    if (!pc) return;
    // Keep the head until its request succeeds. A temporary API/network error
    // must not permanently lose the offer, answer or a relay candidate.
    while (this.pendingSignals.length && this.current(pc) && epoch === this.epoch) {
      const signal = this.pendingSignals[0];
      await this.request('signal', { clientId: this.clientId, epoch, ...signal });
      if (this.current(pc) && epoch === this.epoch && this.pendingSignals[0] === signal) this.pendingSignals.shift();
    }
  }
  private async receive(kind: string, payload: any) {
    const pc = this.pc; if (!pc) return;
    if (kind === 'description') {
      // The server may have accepted a POST whose response was lost. Retrying
      // signaling can therefore deliver the same SDP twice.
      const key = JSON.stringify([payload.type, payload.sdp]);
      if (this.lastDescription === key) return;
      if (pc.remoteDescription?.type !== payload.type || pc.remoteDescription?.sdp !== payload.sdp) await pc.setRemoteDescription(payload);
      if (!this.current(pc)) return;
      while (this.candidates.length) { await pc.addIceCandidate(this.candidates[0]); if (!this.current(pc)) return; this.candidates.shift(); }
      if (payload.type === 'offer') {
        await this.attachTracks(pc);
        if (!this.current(pc)) return;
        await pc.setLocalDescription(await pc.createAnswer());
        if (this.current(pc)) this.queueSignal('description', pc.localDescription!.toJSON());
      }
      if (this.current(pc)) this.lastDescription = key;
    } else if (pc.remoteDescription) await pc.addIceCandidate(payload);
    else this.candidates.push(payload);
  }
  async reconnect(automatic = false) {
    if (this.disposed || this.ended || this.reconnecting) return;
    this.reconnecting = true;
    if (!automatic) this.recoveryAttempts = 0;
    clearTimeout(this.recoveryTimer); this.recoveryTimer = undefined;
    clearTimeout(this.connectionTimer); this.pc?.close();
    clearTimeout(this.timer); this.controller.abort(); this.controller = new AbortController();
    this.emit({ connection: 'connecting', remote: null, error: '' });
    // start() fetches fresh relay credentials before connecting.
    this.clientId = crypto.randomUUID(); this.epoch = -1; this.cursor = 0;
    try { await this.start(); } finally { this.reconnecting = false; }
  }
  async toggle(kind: 'audio' | 'video') {
    if (this.disposed || this.ended || this.mediaBusy.has(kind)) return;
    if (!this.room) { this.emit({ error: 'Wait for your room to connect before starting your microphone or camera.' }); return; }
    this.mediaBusy.add(kind);
    try {
      const tracks = kind === 'audio' ? this.local.getAudioTracks() : this.local.getVideoTracks();
      if (tracks.length) {
        if (kind === 'audio') { this.emit({ mic: false, micIssue: '' }); this.stopRecording(); this.stopMeter(); }
        // Stop capture even when the connection is changing or replaceTrack
        // fails. The button must never leave a hidden microphone running.
        tracks.forEach(t => { t.stop(); this.local.removeTrack(t); });
        this.refreshMedia();
        if (this.pc) await this.attachTracks(this.pc);
      } else {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone and camera need HTTPS and a supported browser.');
        const stream = await navigator.mediaDevices.getUserMedia(kind === 'audio' ? this.audioConstraints(this.state.selectedMicrophone) : { video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }, audio: false });
        if (this.disposed || this.ended) { stream.getTracks().forEach(t => t.stop()); return; }
        const track = stream.getTracks().find(t => t.kind === kind);
        if (!track) { stream.getTracks().forEach(t => t.stop()); throw new Error('The selected device did not provide a media track. Choose another input and retry.'); }
        await this.useTrack(track);
        if (kind === 'audio') await this.refreshMicrophones();
      }
      this.refreshMedia(); if (this.state.connection !== 'failed') this.emit({ error: '' }); this.updateRecording();
    } catch (e) {
      this.mediaError(e, kind);
    } finally { this.mediaBusy.delete(kind); }
  }
  private audioConstraints(deviceId: string): MediaStreamConstraints {
    return { audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, ...(deviceId ? { deviceId: { exact: deviceId } } : {}) }, video: false };
  }
  private mediaError(error: unknown, kind: 'audio' | 'video') {
    if (this.disposed || this.ended) return;
    const name = (error as DOMException).name, device = kind === 'audio' ? 'Microphone' : 'Camera';
    this.emit({ error: name === 'NotAllowedError' ? `${device} permission was denied. Allow it in your browser's site settings, then try again.`
      : name === 'NotFoundError' || name === 'OverconstrainedError' ? `${device} was not found. Connect it or choose another input.`
      : name === 'NotReadableError' ? `${device} could not open. Check whether another app is using it, then try again.` : (error as Error).message });
  }
  async refreshMicrophones() {
    if (!navigator.mediaDevices?.enumerateDevices || this.disposed) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      if (!this.disposed) this.emit({ microphones: devices.filter(d => d.kind === 'audioinput' && d.deviceId).map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` })) });
    } catch { /* Device enumeration is optional; keep the working input. */ }
  }
  async setMicrophone(deviceId: string) {
    if (this.disposed || this.ended || this.mediaBusy.has('audio')) return;
    if (!this.state.mic) { this.emit({ selectedMicrophone: deviceId, micIssue: '' }); return; }
    this.mediaBusy.add('audio');
    try {
      const stream = await navigator.mediaDevices.getUserMedia(this.audioConstraints(deviceId));
      if (this.disposed || this.ended) { stream.getTracks().forEach(t => t.stop()); return; }
      const track = stream.getAudioTracks()[0];
      if (!track) { stream.getTracks().forEach(t => t.stop()); throw new Error('The selected microphone did not provide an audio track.'); }
      await this.useTrack(track);
      this.emit({ selectedMicrophone: deviceId, error: '' });
      await this.refreshMicrophones(); this.updateRecording();
    } catch (e) { this.mediaError(e, 'audio'); }
    finally { this.mediaBusy.delete('audio'); }
  }
  private async useTrack(track: MediaStreamTrack) {
    const old = this.local.getTracks().filter(t => t.kind === track.kind);
    // The previous input stays alive until replacement succeeds so it can be
    // restored on failure. It still belongs to this call during that await.
    old.forEach(t => this.replacingTracks.add(t));
    old.forEach(t => this.local.removeTrack(t)); this.local.addTrack(track);
    try { if (this.pc) await this.attachTracks(this.pc); }
    catch (e) {
      this.local.removeTrack(track); track.stop();
      if (this.disposed || this.ended) { old.forEach(t => t.stop()); return; }
      old.forEach(t => this.local.addTrack(t));
      if (this.pc) await this.attachTracks(this.pc).catch(() => {});
      this.refreshMedia(); throw e;
    } finally { old.forEach(t => this.replacingTracks.delete(t)); }
    if (this.disposed || this.ended) { track.stop(); old.forEach(t => t.stop()); return; }
    old.forEach(t => t.stop());
    track.onended = () => {
      if (!this.local.getTracks().includes(track)) return;
      this.local.removeTrack(track); this.refreshMedia();
      if (track.kind === 'audio') { this.stopRecording(); this.stopMeter(); this.emit({ micIssue: 'Your microphone disconnected. Choose an input, then turn the mic on again.' }); }
    };
    if (track.kind === 'audio') {
      this.stopRecording();
      const update = () => { if (this.local.getAudioTracks().includes(track)) this.emit({ micIssue: track.muted ? 'Your microphone is temporarily unavailable. Check its device mute switch or choose another input.' : '' }); };
      track.onmute = update; track.onunmute = update; update();
      this.emit({ selectedMicrophone: track.getSettings?.().deviceId || this.state.selectedMicrophone });
      this.startMeter(track);
    }
    this.refreshMedia();
  }
  private refreshMedia() { this.emit({ mic: this.local.getAudioTracks().some(t => t.readyState === 'live' && t.enabled !== false), camera: this.local.getVideoTracks().some(t => t.readyState === 'live' && t.enabled !== false), local: new MediaStream(this.local.getTracks()) }); }
  private startMeter(track: MediaStreamTrack) {
    this.stopMeter();
    if (typeof AudioContext === 'undefined') return;
    try {
      const ctx = new AudioContext(); this.meterContext = ctx;
      void ctx.resume().catch(() => {});
      const source = ctx.createMediaStreamSource(new MediaStream([track])); this.meterSource = source;
      const analyser = ctx.createAnalyser(); analyser.fftSize = 256; source.connect(analyser);
      const samples = new Float32Array(256);
      this.meterTimer = setInterval(() => {
        if (this.disposed || this.ended || track.readyState !== 'live') return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
        this.emit({ micLevel: track.muted ? 0 : Math.min(1, rms * 8) });
      }, 150);
    } catch { this.stopMeter(); }
  }
  private stopMeter() {
    clearInterval(this.meterTimer); this.meterSource?.disconnect(); this.meterSource = undefined;
    void this.meterContext?.close().catch(() => {}); this.meterContext = undefined;
    this.emit({ micLevel: 0 });
  }
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
      for (let attempt = 0; attempt < 2; attempt++) {
        if (this.disposed) return;
        const request = new AbortController();
        const abort = () => request.abort();
        this.transcriptController.signal.addEventListener('abort', abort, { once: true });
        if (this.transcriptController.signal.aborted) abort();
        const timeout = setTimeout(abort, 75000);
        try {
          // A stable clipId makes a retry safe if the server saved the text
          // but the response was lost in a temporary network interruption.
          await api(this.path('transcribe'), { method: 'POST', body: data, signal: request.signal });
          break;
        } catch (error) {
          const retryable = error instanceof ApiError && (error.status === 0 || error.status >= 500);
          if (attempt || !retryable || this.disposed) throw error;
        } finally {
          clearTimeout(timeout); this.transcriptController.signal.removeEventListener('abort', abort);
        }
      }
    } catch (e) { if (!this.disposed) this.emit({ transcriptError: 'A transcript segment could not be saved. Add missing answers in Notes. ' + (e as Error).message }); }
  }
  private stopRecording(save = true) {
    clearTimeout(this.recordTimer);
    if (!save) (this.recorder as (MediaRecorder & { discard?: () => void }) | undefined)?.discard?.();
    if (this.recorder?.state === 'recording') this.recorder.stop();
  }
  async finish() {
    clearTimeout(this.connectionTimer); clearTimeout(this.recoveryTimer);
    this.ended = true; this.emit({ pending: this.uploads.size + (this.recorder ? 1 : 0) }); this.stopRecording(); this.stopTracks(); this.pc?.close();
    this.emit({ connection: 'ended', mic: false, camera: false });
    await this.recordingFinished; await Promise.all([...this.uploads]);
  }
  private stopTracks() {
    this.stopMeter();
    this.replacingTracks.forEach(t => t.stop()); this.replacingTracks.clear();
    this.local.getTracks().forEach(t => { t.stop(); this.local.removeTrack(t); });
  }
  destroy() {
    this.disposed = true; clearTimeout(this.timer); clearTimeout(this.connectionTimer); clearTimeout(this.recoveryTimer); this.stopRecording(false); this.stopTracks(); this.pc?.close(); void this.audioContext?.close(); this.controller.abort(); this.transcriptController.abort();
    void fetch('/api' + this.path('leave'), { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: this.clientId }), keepalive: true }).catch(() => {});
  }
}
