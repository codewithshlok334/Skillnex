import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PeerCall, type PeerConfig, type PeerRoomData } from './peerCall';
import { api, ApiError } from '../api/client';
import { recordingToWav } from './interviewVoice';

vi.mock('../api/client', async importOriginal => ({ ...await importOriginal<typeof import('../api/client')>(), api: vi.fn() }));
vi.mock('./interviewVoice', () => ({ recordingToWav: vi.fn() }));
class Track {
  readyState = 'live'; onended: (() => void) | null = null;
  enabled = true; muted = false; onmute?: () => void; onunmute?: () => void;
  getSettings() { return { deviceId: this.deviceId }; }
  constructor(public kind: string, public deviceId = 'default') {}
  stop() { this.readyState = 'ended'; }
}
class Stream {
  constructor(private tracks: Track[] = []) {}
  getTracks() { return this.tracks; }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  addTrack(track: Track) { this.tracks.push(track); }
  removeTrack(track: Track) { this.tracks = this.tracks.filter(t => t !== track); }
}
const transceiver = (kind: string) => ({
  receiver: { track: new Track(kind) }, direction: 'recvonly',
  sender: { track: null as Track | null, setStreams: vi.fn(), async replaceTrack(track: Track | null) { this.track = track; } },
});
class Connection {
  static all: Connection[] = [];
  transceivers: ReturnType<typeof transceiver>[] = [];
  connectionState = 'new';
  remoteDescription?: { type: string; sdp?: string }; localDescription: { toJSON: () => unknown } | null = null;
  offers = 0; answers = 0; descriptions = 0;
  candidateCount = 0;
  ontrack?: (event: { track: Track }) => void;
  onconnectionstatechange?: () => void;
  onicecandidate?: (event: { candidate: { toJSON: () => unknown } }) => void;
  constructor(public config: unknown) { Connection.all.push(this); }
  addTransceiver(kind: string) { const t = transceiver(kind); this.transceivers.push(t); return t; }
  getTransceivers() { return this.transceivers; }
  async setRemoteDescription(description: { type: string; sdp?: string }) {
    this.descriptions++;
    this.remoteDescription = description;
    if (description.type === 'offer' && !this.transceivers.length) this.transceivers.push(transceiver('audio'), transceiver('video'));
  }
  async setLocalDescription(value: unknown) { this.localDescription = { toJSON: () => value }; }
  async createAnswer() { this.answers++; return { type: 'answer', sdp: 'answer-sdp' }; }
  async createOffer() { this.offers++; return { type: 'offer', sdp: 'offer-sdp' }; }
  async addIceCandidate() { if (!this.remoteDescription) throw new Error('No description'); this.candidateCount++; }
  close() { this.connectionState = 'closed'; }
}
const configuration: PeerConfig = { iceServers: [], relayAvailable: false, transcriptionAvailable: false, analysisAvailable: false };
let room: PeerRoomData;
let signals: NonNullable<PeerRoomData['signals']>;
let call: PeerCall;
beforeEach(() => {
  vi.useFakeTimers(); Connection.all = []; signals = [];
  vi.stubGlobal('MediaStream', Stream); vi.stubGlobal('RTCPeerConnection', Connection);
  vi.stubGlobal('navigator', { mediaDevices: {
    getUserMedia: vi.fn(async (c: { audio: unknown }) => new Stream([new Track(c.audio ? 'audio' : 'video')])),
    enumerateDevices: vi.fn(async () => [{ kind: 'audioinput', deviceId: 'default', label: 'Laptop microphone' }, { kind: 'audioinput', deviceId: 'headset', label: 'Headset microphone' }]),
  } });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
  room = { id: 'room', host_id: 'host', guest_id: 'guest', interviewer_id: 'host', status: 'WAITING', title: '', epoch: 1, revision: 1, content_revision: 0, created_ms: Date.now(), expires_ms: Date.now() + 7200000, serverTime: Date.now(), participants: ['host', 'guest'].map(id => ({ id, name: id, client_id: id, seen_ms: Date.now(), mic: false, camera: false, consent: false })) };
  vi.mocked(api).mockImplementation(async path => {
    if (path === '/peer/config') return { ...configuration, iceServers: [{ urls: 'turn:new.example', username: 'fresh', credential: 'fresh-credential' }] } as any;
    if (path.endsWith('/connect')) return { ...room };
    if (path.endsWith('/sync')) return { ...room, serverTime: Date.now(), signals };
    return { ok: true } as any;
  });
  call = new PeerCall('room', 'guest', configuration, () => {}, () => {});
});
afterEach(() => { call.destroy(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.mocked(api).mockReset(); });
describe('Peer interview media negotiation', () => {
  it('answers on the offered media sections, with devices enabled before negotiation', async () => {
    await call.start();
    await call.toggle('audio'); await call.toggle('video');
    const pc = Connection.all[0];
    expect(pc.transceivers).toHaveLength(0);
    signals = [{ seq: 1, kind: 'candidate', payload: { candidate: 'queued' } }, { seq: 2, kind: 'description', payload: { type: 'offer', sdp: 'offered-audio-video' } }];
    await vi.advanceTimersByTimeAsync(1800);
    expect(pc.candidateCount).toBe(1);
    expect(pc.transceivers.map(t => [t.direction, t.sender.track?.kind])).toEqual([['sendrecv', 'audio'], ['sendrecv', 'video']]);
    expect(vi.mocked(api).mock.calls.some(([path, options]) => path.endsWith('/signal') && String(options?.body).includes('"type":"answer"'))).toBe(true);
  });
  it('starts and restarts a guest camera after the connection without losing the audio sender', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start();
    const pc = Connection.all[0];
    await call.toggle('audio'); await call.toggle('video');
    const audio = pc.transceivers[0].sender.track;
    const camera = pc.transceivers[1].sender.track!;
    await call.toggle('video');
    expect(camera.readyState).toBe('ended');
    expect(pc.transceivers[1].sender.track).toBeNull();
    expect(pc.transceivers[0].sender.track).toBe(audio);
    await call.toggle('video');
    expect(pc.transceivers).toHaveLength(2);
    expect(pc.transceivers[1].sender.track?.kind).toBe('video');
    expect(pc.transceivers[1].sender.track).not.toBe(camera);
  });
  it('refreshes relay credentials and reattaches live devices on reconnect', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); await call.toggle('audio');
    const previous = Connection.all[0], track = previous.transceivers[0].sender.track;
    room = { ...room, epoch: 2 };
    await call.reconnect();
    expect(previous.connectionState).toBe('closed');
    expect(Connection.all[1].config).toEqual({ iceServers: [{ urls: 'turn:new.example', username: 'fresh', credential: 'fresh-credential' }] });
    expect(Connection.all[1].transceivers[0].sender.track).toBe(track);
    expect(track?.readyState).toBe('live');
  });
  it('stops devices and prevents late permission results from capturing after exit', async () => {
    await call.start();
    let resolve!: (s: Stream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(() => new Promise(r => { resolve = r as any; }));
    const pending = call.toggle('audio'), track = new Track('audio');
    call.destroy(); resolve(new Stream([track])); await pending;
    expect(track.readyState).toBe('ended');
    expect(Connection.all[0].connectionState).toBe('closed');
  });

  it('retries a lost host offer without requiring another click or creating new media sections', async () => {
    call.destroy(); call = new PeerCall('room', 'host', configuration, () => {}, () => {});
    const base = vi.mocked(api).getMockImplementation()!; let attempts = 0;
    vi.mocked(api).mockImplementation(async (path, options) => {
      if (path.endsWith('/signal') && String(options?.body).includes('"type":"offer"') && ++attempts === 1) throw new Error('Temporary connection loss');
      return base(path, options);
    });
    await call.start();
    expect(attempts).toBe(1);
    const pc = Connection.all[0];
    await vi.advanceTimersByTimeAsync(1800);
    expect(attempts).toBe(2); expect(pc.offers).toBe(1);
    expect(pc.transceivers).toHaveLength(2);
    expect(call.state.error).toBe('');
  });

  it('retries a lost answer and relay candidate and ignores duplicate SDP from an acknowledged retry', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer', sdp: 'same-offer' } }];
    const base = vi.mocked(api).getMockImplementation()!; let answerAttempts = 0, candidateAttempts = 0;
    vi.mocked(api).mockImplementation(async (path, options) => {
      if (path.endsWith('/signal')) {
        if (String(options?.body).includes('"type":"answer"') && ++answerAttempts === 1) throw new Error('Lost answer response');
        if (String(options?.body).includes('relay-candidate') && ++candidateAttempts === 1) throw new Error('Lost candidate response');
      }
      return base(path, options);
    });
    await call.start(); const pc = Connection.all[0];
    pc.onicecandidate?.({ candidate: { toJSON: () => ({ candidate: 'relay-candidate' }) } });
    signals = [...signals, { seq: 2, kind: 'description', payload: { type: 'offer', sdp: 'same-offer' } }];
    await vi.advanceTimersByTimeAsync(3600);
    expect(answerAttempts).toBe(2); expect(candidateAttempts).toBe(2);
    expect(pc.answers).toBe(1); expect(pc.descriptions).toBe(1); expect(pc.transceivers).toHaveLength(2);
  });

  it('keeps the working microphone when selecting an unavailable input', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); await call.toggle('audio'); const pc = Connection.all[0], current = pc.transceivers[0].sender.track!;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(Object.assign(new Error('Missing'), { name: 'NotFoundError' }));
    await call.setMicrophone('missing');
    expect(pc.transceivers[0].sender.track).toBe(current); expect(current.readyState).toBe('live'); expect(call.state.mic).toBe(true);
    expect(call.state.selectedMicrophone).toBe('default'); expect(call.state.error).toContain('choose another input');
  });

  it('switches microphone tracks without disconnecting audio or touching the camera', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); await call.toggle('audio'); await call.toggle('video');
    const pc = Connection.all[0], oldAudio = pc.transceivers[0].sender.track!, video = pc.transceivers[1].sender.track;
    const headset = new Track('audio', 'headset');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(new Stream([headset]) as any);
    await call.setMicrophone('headset');
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenLastCalledWith({ audio: { deviceId: { exact: 'headset' }, echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    expect(pc.transceivers[0].sender.track).toBe(headset); expect(pc.transceivers[1].sender.track).toBe(video); expect(oldAudio.readyState).toBe('ended');
    expect(call.state.microphones).toHaveLength(2); expect(call.state.selectedMicrophone).toBe('headset'); expect(call.state.mic).toBe(true);
  });

  it('shows device interruption and clears the mic indicator when the input is unplugged', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); await call.toggle('audio'); const track = Connection.all[0].transceivers[0].sender.track!;
    track.muted = true; track.onmute?.(); expect(call.state.micIssue).toContain('temporarily unavailable');
    track.muted = false; track.onunmute?.(); expect(call.state.micIssue).toBe('');
    track.stop(); track.onended?.();
    expect(call.state.mic).toBe(false); expect(call.state.micIssue).toContain('disconnected');
  });

  it('reattaches a microphone whose permission resolves while the guest reconnects', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); let resolve!: (stream: Stream) => void;
    vi.mocked(navigator.mediaDevices.getUserMedia).mockImplementationOnce(() => new Promise(r => { resolve = r as any; }));
    const pending = call.toggle('audio'); room = { ...room, epoch: 2 }; await call.reconnect();
    const audio = new Track('audio'); resolve(new Stream([audio])); await pending;
    expect(Connection.all[0].connectionState).toBe('closed'); expect(Connection.all[1].transceivers[0].sender.track).toBe(audio);
    expect(audio.readyState).toBe('live'); expect(call.state.mic).toBe(true);
  });

  it('stops capture even if detaching an old sender fails', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); await call.toggle('audio'); const sender = Connection.all[0].transceivers[0].sender, track = sender.track!;
    vi.spyOn(sender, 'replaceTrack').mockRejectedValueOnce(new Error('Connection closed'));
    await call.toggle('audio'); expect(track.readyState).toBe('ended'); expect(call.state.mic).toBe(false);
    expect(call.state.local?.getAudioTracks()).toHaveLength(0);
  });

  it('stops both inputs immediately when leaving during a failed microphone replacement', async () => {
    signals = [{ seq: 1, kind: 'description', payload: { type: 'offer' } }];
    await call.start(); await call.toggle('audio');
    const sender = Connection.all[0].transceivers[0].sender, original = sender.track!, headset = new Track('audio', 'headset');
    vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValueOnce(new Stream([headset]) as any);
    let rejectReplacement!: (reason: Error) => void;
    vi.spyOn(sender, 'replaceTrack').mockImplementationOnce(() => new Promise<void>((_, reject) => { rejectReplacement = reject; }));
    const changing = call.setMicrophone('headset');
    await vi.waitFor(() => expect(rejectReplacement).toBeDefined());
    call.destroy();
    expect(original.readyState).toBe('ended'); expect(headset.readyState).toBe('ended');
    rejectReplacement(new Error('Connection closed during replacement')); await changing;
    expect((call as any).local.getAudioTracks()).toHaveLength(0);
    expect(original.readyState).toBe('ended'); expect(headset.readyState).toBe('ended');
  });

  it('automatically recovers a failed connection once with fresh relay settings and live tracks', async () => {
    call.destroy(); call = new PeerCall('room', 'host', configuration, () => {}, () => {});
    await call.start(); await call.toggle('audio'); const pc = Connection.all[0], track = pc.transceivers[0].sender.track;
    pc.connectionState = 'failed'; pc.onconnectionstatechange?.();
    room = { ...room, epoch: 2 }; await vi.advanceTimersByTimeAsync(1500);
    expect(Connection.all).toHaveLength(2); expect(Connection.all[1].transceivers[0].sender.track).toBe(track);
    expect(vi.mocked(api).mock.calls.filter(([path]) => path === '/peer/config')).toHaveLength(2);
  });

  it('lets an in-flight transcript finish through a media reconnect, but aborts it on exit', async () => {
    await call.start();
    vi.mocked(recordingToWav).mockResolvedValue({ wav: new Blob(['audio'], { type: 'audio/wav' }) } as any);
    const base = vi.mocked(api).getMockImplementation()!;
    let signal: AbortSignal | undefined, finish!: () => void;
    vi.mocked(api).mockImplementation(async (path, options) => {
      if (path.endsWith('/transcribe')) { signal = options?.signal as AbortSignal; await new Promise<void>(resolve => { finish = resolve; }); return {} as any; }
      return base(path, options);
    });
    const upload = (call as any).upload(new Blob(['audio']), 'stable-clip', 'candidate') as Promise<void>;
    await Promise.resolve(); await Promise.resolve();
    room = { ...room, epoch: 2 }; await call.reconnect();
    expect(signal?.aborted).toBe(false);
    call.destroy(); expect(signal?.aborted).toBe(true); finish(); await upload;
  });

  it('retries a transient transcript failure with the same clip ID', async () => {
    await call.start();
    vi.mocked(recordingToWav).mockResolvedValue({ wav: new Blob(['audio'], { type: 'audio/wav' }) } as any);
    const base = vi.mocked(api).getMockImplementation()!; const clipIds: FormDataEntryValue[] = [];
    vi.mocked(api).mockImplementation(async (path, options) => {
      if (path.endsWith('/transcribe')) {
        clipIds.push((options?.body as FormData).get('clipId')!);
        if (clipIds.length === 1) throw new ApiError(0, 'Temporary network loss');
        return {} as any;
      }
      return base(path, options);
    });
    await (call as any).upload(new Blob(['audio']), 'stable-clip', 'candidate');
    expect(clipIds).toEqual(['stable-clip', 'stable-clip']); expect(call.state.transcriptError).toBe('');
  });
});
