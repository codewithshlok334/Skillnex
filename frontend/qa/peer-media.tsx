// Development-only browser regression fixture. Docker copies src/public only.
// Uses production PeerCall + Portrait with synthetic devices and in-memory signaling.
// No real microphone, camera, accounts or private media are accessed.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PeerCall, initialCall, type PeerConfig, type PeerRoomData } from '../src/utils/peerCall';
import { Portrait } from '../src/pages/PeerPractice';

const NativePeer = RTCPeerConnection;
const pcs: RTCPeerConnection[] = [];
const iceErrors: string[] = [];
let relay = false, tlsOnly = false;
window.RTCPeerConnection = class extends NativePeer {
  constructor(config: RTCConfiguration) { super({ ...config, iceTransportPolicy: relay ? 'relay' : 'all' }); pcs.push(this); this.addEventListener('icecandidateerror', (e: RTCPeerConnectionIceErrorEvent) => iceErrors.push(`${e.url}: ${e.errorCode} ${e.errorText}`)); }
} as typeof RTCPeerConnection;
const originalFetch = window.fetch.bind(window);
let room: PeerRoomData;
let signals: { sender: string; epoch: number; seq: number; kind: string; payload: unknown }[] = [];
let seq = 0, config: PeerConfig;
window.fetch = async (input, init) => {
  const path = String(input);
  if (!path.startsWith('/api/peer/')) return originalFetch(input, init);
  if (path === '/api/peer/config') return Response.json(config);
  const [, uid, action] = path.match(/\/rooms\/(host|guest)\/([^/]+)/) || [];
  if (!uid) throw new Error('Unexpected fixture request');
  const body = JSON.parse(String(init?.body || '{}'));
  const person = room.participants.find(p => p.id === uid)!;
  if (action === 'connect') { person.client_id = body.clientId; room.epoch++; signals = []; }
  if (action === 'signal') {
    if (body.epoch === room.epoch && body.clientId === person.client_id) signals.push({ sender: uid, epoch: room.epoch, seq: ++seq, kind: body.kind, payload: body.payload });
    return Response.json({ ok: true });
  }
  if (action === 'leave') return Response.json({ ok: true });
  if (action === 'sync') { person.mic = body.mic; person.camera = body.camera; }
  room.serverTime = Date.now();
  person.seen_ms = Date.now();
  return Response.json({ ...room, signals: signals.filter(s => s.sender !== uid && s.seq > (body.epoch === room.epoch ? body.cursor || 0 : 0)) });
};
const contexts: AudioContext[] = [];
const intervals: ReturnType<typeof setInterval>[] = [];
let cameraNumber = 0;
navigator.mediaDevices.getUserMedia = async constraints => {
  if (constraints.video) {
    const number = ++cameraNumber, canvas = document.createElement('canvas');
    canvas.width = 640; canvas.height = 360;
    const ctx = canvas.getContext('2d')!; let frame = 0;
    const draw = () => {
      ctx.fillStyle = number % 2 ? '#184e65' : '#473377'; ctx.fillRect(0, 0, 640, 360);
      ctx.fillStyle = '#b3f7df'; ctx.fillRect((frame++ * 9) % 590, 140, 50, 50);
      ctx.fillStyle = 'white'; ctx.font = '22px system-ui'; ctx.fillText(`Synthetic camera ${number} · frame ${frame}`, 30, 80);
    };
    draw(); intervals.push(setInterval(draw, 100));
    return canvas.captureStream(10);
  }
  const ctx = new AudioContext(); contexts.push(ctx);
  const destination = ctx.createMediaStreamDestination(), oscillator = ctx.createOscillator(), gain = ctx.createGain();
  oscillator.frequency.value = 300 + contexts.length * 100; gain.gain.value = 0.04;
  oscillator.connect(gain).connect(destination); oscillator.start(); await ctx.resume();
  return destination.stream;
};
async function makeConfig(custom: string) {
  const iceServers: RTCIceServer[] = [];
  if (relay && custom.trim()) {
    for (const server of JSON.parse(custom)) {
      const urls = (Array.isArray(server.urls) ? server.urls : [server.urls]).filter((url: string) => tlsOnly ? url.startsWith('turns:') : url.startsWith('turn:') || url.startsWith('turns:'));
      if (urls.length) iceServers.push({ ...server, urls });
    }
    if (!iceServers.length) throw new Error('No TURN URLs supplied for this test route.');
  } else if (relay) throw new Error('Paste your provider ICE servers JSON into the private field before testing a relay.');
  return { iceServers, relayAvailable: relay, transcriptionAvailable: false, analysisAvailable: false };
}
function App() {
  const [states, setStates] = useState({ host: initialCall, guest: initialCall });
  const [stats, setStats] = useState('No test started');
  const [result, setResult] = useState('');
  const [engines, setEngines] = useState<PeerCall[]>([]);
  const [mode, setMode] = useState('direct');
  const [custom, setCustom] = useState('');
  const [early, setEarly] = useState(false);
  const [busy, setBusy] = useState(false);
  function stop() { engines.forEach(e => e.destroy()); contexts.splice(0).forEach(c => void c.close()); intervals.splice(0).forEach(clearInterval); pcs.length = 0; }
  async function connect() {
    stop(); iceErrors.length = 0; setBusy(true); setResult('Connecting actual browser media peers…');
    try {
      relay = mode !== 'direct'; tlsOnly = mode === 'tls'; config = await makeConfig(custom);
      room = { id: 'fixture', host_id: 'host', guest_id: 'guest', interviewer_id: 'host', title: 'Media verification', status: 'WAITING', epoch: 0, revision: 0, content_revision: 0, created_ms: Date.now(), expires_ms: Date.now() + 7200000, serverTime: Date.now(), participants: ['host', 'guest'].map(id => ({ id, name: id, client_id: null, seen_ms: Date.now(), mic: false, camera: false, consent: false })) };
      signals = []; seq = 0;
      const next = ['host', 'guest'].map(id => new PeerCall(id, id, config, () => {}, state => setStates(s => ({ ...s, [id]: state }))));
      setEngines(next);
      await next[0].start();
      if (early) { await next[0].toggle('audio'); await next[0].toggle('video'); }
      await next[1].start();
      if (early) { await next[1].toggle('audio'); await next[1].toggle('video'); }
      setResult('Peers started. Check stats after media is on.');
    } catch (e) { setResult(String(e)); } finally { setBusy(false); }
  }
  async function measure() {
    const connected = pcs.filter(pc => pc.connectionState !== 'closed');
    const snapshots = await Promise.all(connected.map(async pc => {
      const report = await pc.getStats();
      const rows = [...report.values()];
      const transport = rows.find(s => s.type === 'transport' && s.selectedCandidatePairId);
      const pair = transport ? report.get(transport.selectedCandidatePairId) : rows.find(s => s.type === 'candidate-pair' && s.state === 'succeeded' && s.nominated);
      const localCandidate = pair && report.get(pair.localCandidateId);
      const remoteCandidate = pair && report.get(pair.remoteCandidateId);
      const inbound = rows.filter(s => s.type === 'inbound-rtp').map(s => ({ kind: s.kind, bytes: s.bytesReceived, frames: s.framesDecoded, energy: s.totalAudioEnergy }));
      const outbound = rows.filter(s => s.type === 'outbound-rtp').map(s => ({ kind: s.kind, bytes: s.bytesSent, frames: s.framesEncoded }));
      return { connection: pc.connectionState, transceivers: pc.getTransceivers().map(t => ({ kind: t.receiver.track.kind, direction: t.currentDirection, sending: t.sender.track?.kind || null })), route: localCandidate ? `${localCandidate.candidateType}/${localCandidate.relayProtocol || localCandidate.protocol} -> ${remoteCandidate.candidateType}/${remoteCandidate.protocol}` : 'none', inbound, outbound };
    }));
    const pass = snapshots.length === 2 && snapshots.every(s => s.connection === 'connected' && s.transceivers.length === 2 && s.inbound.some(x => x.kind === 'audio' && x.energy > 0) && s.inbound.some(x => x.kind === 'video' && x.frames > 5) && (!relay || s.route.startsWith('relay/')));
    setStats(JSON.stringify({ peers: snapshots, iceErrors }, null, 2)); setResult(pass ? 'PASS: both peers received non-silent audio and decoded video frames' : 'NOT PASSED: inspect media stats below');
  }
  return <main className="pp-page" style={{ padding: 24 }}>
    <h1>SkillNex · Two-way media verification</h1><p>Synthetic cameras and tones. Production connection + playback components. No device permission required.</p>
    <label>Route <select value={mode} onChange={e => setMode(e.target.value)}><option value="direct">Direct</option><option value="relay">Force relay (UDP/TCP)</option><option value="tls">Force relay (TLS 443)</option></select></label>
    <label style={{ margin: 16 }}>Private TURN server JSON <input type="password" aria-label="Private TURN server JSON" autoComplete="off" value={custom} onChange={e => setCustom(e.target.value)} /></label>
    <label><input type="checkbox" checked={early} onChange={e => setEarly(e.target.checked)} />Enable devices before negotiation</label>
    <div style={{ display: 'flex', gap: 10, margin: '20px 0' }}>
      <button onClick={connect} disabled={busy}>Connect peers</button>
      <button onClick={async () => { for (const e of engines) { await e.toggle('audio'); await e.toggle('video'); } }}>Toggle both devices</button>
      <button onClick={() => engines[1]?.toggle('video')}>Toggle guest camera</button>
      <button onClick={() => engines[1]?.reconnect()}>Reconnect guest</button>
      <button onClick={measure}>Measure media</button>
      <button onClick={stop}>Stop test</button>
    </div>
    <strong role="status">{result}</strong>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 20 }}>
      {(['host', 'guest'] as const).map(id => <section key={id}><h2>{id} receives partner</h2><p>{states[id].connection} · {states[id].error}</p><Portrait person={{ name: id === 'host' ? 'Guest' : 'Host' }} stream={states[id].remote} camera mic label="REMOTE MEDIA" /></section>)}
    </div><pre aria-label="Media statistics" style={{ whiteSpace: 'pre-wrap' }}>{stats}</pre>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
