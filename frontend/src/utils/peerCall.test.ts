import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PeerCall, type PeerConfig, type PeerRoomData } from './peerCall';
import { api } from '../api/client';

vi.mock('../api/client', () => ({ api: vi.fn() }));
vi.mock('./interviewVoice', () => ({ recordingToWav: vi.fn() }));
class Track {
  readyState = 'live'; onended: (() => void) | null = null;
  constructor(public kind: string) {}
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
  remoteDescription: unknown; localDescription: { toJSON: () => unknown } | null = null;
  candidateCount = 0;
  ontrack?: (event: { track: Track }) => void;
  onconnectionstatechange?: () => void;
  constructor(public config: unknown) { Connection.all.push(this); }
  addTransceiver(kind: string) { const t = transceiver(kind); this.transceivers.push(t); return t; }
  getTransceivers() { return this.transceivers; }
  async setRemoteDescription(description: { type: string }) {
    this.remoteDescription = description;
    if (description.type === 'offer') this.transceivers.push(transceiver('audio'), transceiver('video'));
  }
  async setLocalDescription(value: unknown) { this.localDescription = { toJSON: () => value }; }
  async createAnswer() { return { type: 'answer' }; }
  async createOffer() { return { type: 'offer' }; }
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
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn(async (c: { audio: unknown }) => new Stream([new Track(c.audio ? 'audio' : 'video')])) } });
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
});
