import { encodeWav } from './interviewVoice';

export type MicClip = { wav: Blob; seconds: number };
export function signalStats(samples: Float32Array) {
  let sum = 0, peak = 0;
  for (const value of samples) { sum += value * value; peak = Math.max(peak, Math.abs(value)); }
  return { rms: Math.sqrt(sum / Math.max(1, samples.length)), peak };
}
export function validateMicSignal(samples: Float32Array, sampleRate: number) {
  const seconds = samples.length / sampleRate;
  if (seconds < 0.6) throw new Error('Speak for at least a second before pressing Stop. No audio was sent.');
  const { rms, peak } = signalStats(samples);
  if (rms < 0.0003 || peak < 0.002)
    throw new Error('Your microphone captured silence. Choose the correct microphone in Mic settings and check that the level bar moves while you speak. No audio was sent.');
  return seconds;
}

export async function openMicrophone(
  deviceId: string,
  signal: AbortSignal,
  onLevel: (level: number, seconds: number) => void,
  onEnded: () => void,
) {
  if (!navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined')
    throw new Error('Microphone access needs localhost or HTTPS and a supported browser. You can still type.');
  const context = new AudioContext({ sampleRate: 16000 });
  let stream: MediaStream | undefined, source: MediaStreamAudioSourceNode | undefined;
  let node: AudioWorkletNode | undefined, mute: GainNode | undefined;
  let closed = false, total = 0, done: (() => void) | undefined;
  let stopPromise: Promise<MicClip> | undefined;
  const chunks: Float32Array[] = [];
  const cleanup = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener('abort', cleanup);
    if (node) { node.port.onmessage = null; node.port.close(); node.disconnect(); }
    source?.disconnect(); mute?.disconnect();
    stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    void context.close().catch(() => {});
    done?.();
  };
  signal.addEventListener('abort', cleanup, { once: true });
  try {
    // Resume from the button click, before waiting for the permission dialog.
    await context.resume();
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { ...(deviceId ? { deviceId: { exact: deviceId } } : {}), channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      video: false,
    });
    if (closed || signal.aborted) {
      stream.getTracks().forEach(track => track.stop());
      throw new DOMException('Cancelled', 'AbortError');
    }
    if (!context.audioWorklet) throw new Error('This browser cannot capture microphone audio. Update Chrome or continue by typing.');
    await context.audioWorklet.addModule('/audio/pcm-capture.js');
    if (closed || signal.aborted) throw new DOMException('Cancelled', 'AbortError');
    source = context.createMediaStreamSource(stream);
    node = new AudioWorkletNode(context, 'skillnex-pcm-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    mute = context.createGain(); mute.gain.value = 0;
    node.port.onmessage = event => {
      if (closed) return;
      if (event.data.done) { done?.(); return; }
      const incoming = event.data.samples as Float32Array;
      if (!(incoming instanceof Float32Array)) return;
      const samples = incoming.slice(0, Math.max(0, context.sampleRate * 120 - total));
      if (!samples.length) return;
      chunks.push(samples); total += samples.length;
      onLevel(Math.min(100, Math.round(signalStats(samples).rms * 900)), total / context.sampleRate);
    };
    stream.getAudioTracks().forEach(track => { track.onended = onEnded; });
    source.connect(node); node.connect(mute); mute.connect(context.destination);
    if (context.state !== 'running') throw new Error('Audio capture is paused by the browser. Click Start mic again.');
    return {
      cancel: cleanup,
      stop: () => stopPromise ||= (async () => {
        if (closed) throw new Error('Microphone closed. Please start it again.');
        await new Promise<void>(resolve => {
          const timeout = setTimeout(resolve, 1000);
          done = () => { clearTimeout(timeout); resolve(); };
          node!.port.postMessage('stop');
        });
        const sampleRate = context.sampleRate;
        cleanup();
        if (signal.aborted) throw new DOMException('Cancelled', 'AbortError');
        const samples = new Float32Array(total);
        let offset = 0;
        for (const part of chunks) { samples.set(part, offset); offset += part.length; }
        const seconds = validateMicSignal(samples, sampleRate);
        let pcm = samples;
        if (sampleRate !== 16000) {
          const offline = new OfflineAudioContext(1, Math.min(1920000, Math.ceil(seconds * 16000)), 16000);
          const buffer = offline.createBuffer(1, samples.length, sampleRate);
          buffer.copyToChannel(samples, 0);
          const audio = offline.createBufferSource(); audio.buffer = buffer;
          audio.connect(offline.destination); audio.start();
          pcm = new Float32Array((await offline.startRendering()).getChannelData(0));
        }
        return { wav: encodeWav(pcm), seconds: Math.round(seconds) };
      })(),
    };
  } catch (error) { cleanup(); throw error; }
}
