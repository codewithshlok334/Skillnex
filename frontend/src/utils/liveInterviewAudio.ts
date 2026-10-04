/** Stateful averaging resampler: no missing/duplicated samples at worklet boundaries. */
export class Pcm16Stream {
  private sum = 0;
  private weight = 0;
  constructor(private rate: number) {
    if (rate < 16000) throw new Error("Microphone sample rate is unsupported.");
  }
  push(input: Float32Array): Int16Array {
    const ratio = this.rate / 16000;
    const output: number[] = [];
    for (const sample of input) {
      let left = 1;
      while (left > 1e-8) {
        const take = Math.min(left, ratio - this.weight);
        this.sum += sample * take; this.weight += take; left -= take;
        if (this.weight >= ratio - 1e-8) {
          const value = Math.max(-1, Math.min(1, this.sum / ratio));
          output.push(Math.round(value * (value < 0 ? 32768 : 32767)));
          this.sum = this.weight = 0;
        }
      }
    }
    return Int16Array.from(output);
  }
}

export function pcmBase64(samples: Int16Array) {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  samples.forEach((v, i) => view.setInt16(i * 2, v, true));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodePcm(data: string) {
  const binary = atob(data);
  if (binary.length % 2) throw new Error("Invalid AI audio format.");
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const view = new DataView(bytes.buffer);
  const samples = new Float32Array(bytes.length / 2);
  samples.forEach((_, i) => { samples[i] = view.getInt16(i * 2, true) / 32768; });
  return samples;
}

export function audioMouthOpening(samples: Float32Array) {
  let energy = 0;
  for (const value of samples) energy += value * value;
  // Noise gate closes the lips during real pauses. No synthetic syllable timer.
  return Math.min(1, Math.max(0, (Math.sqrt(energy / Math.max(1, samples.length)) - 0.008) * 9));
}

export class LiveInterviewAudio {
  private context?: AudioContext;
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private worklet?: AudioWorkletNode;
  private silent?: GainNode;
  private gain?: GainNode;
  private analyser?: AnalyserNode;
  private sources = new Set<AudioBufferSourceNode>();
  private nextTime = 0;
  private ended = false;
  private frame = 0;
  private micMuted = false;
  private outputMuted = false;
  private closing: Promise<void> = Promise.resolve();
  constructor(private events: {
    samples: (pcm: Int16Array, rms: number, seconds: number) => void;
    mouth: (opening: number) => void;
    playing: (active: boolean) => void;
    error: (message: string) => void;
  }) {}

  async open(deviceId?: string) {
    if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode)
      throw new Error("Live microphone needs a supported browser on HTTPS or localhost.");
    this.context = new AudioContext({ sampleRate: 16000, latencyHint: "interactive" });
    await this.context.resume();
    if (this.ended) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1,
      ...(deviceId ? {deviceId: {exact: deviceId}} : {}),
    }, video: false });
    if (this.ended) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream;
    for (const track of stream.getAudioTracks()) track.onended = () => {
      if (!this.ended) this.events.error("Microphone disconnected. Reconnect it and retry.");
    };
    await this.context.audioWorklet.addModule("/audio/pcm-capture.js");
    if (this.ended) return;
    const ctx = this.context;
    const resampler = new Pcm16Stream(ctx.sampleRate);
    this.source = ctx.createMediaStreamSource(stream);
    this.worklet = new AudioWorkletNode(ctx, "skillnex-pcm-capture");
    this.silent = ctx.createGain(); this.silent.gain.value = 0;
    this.source.connect(this.worklet).connect(this.silent).connect(ctx.destination);
    this.worklet.port.onmessage = event => {
      if (this.ended || this.micMuted || !(event.data.samples instanceof Float32Array)) return;
      const samples: Float32Array = event.data.samples;
      let energy = 0;
      for (const value of samples) energy += value * value;
      this.events.samples(resampler.push(samples), Math.sqrt(energy / samples.length), samples.length / ctx.sampleRate);
    };
    this.gain = ctx.createGain();
    this.analyser = ctx.createAnalyser(); this.analyser.fftSize = 512;
    this.gain.connect(this.analyser).connect(ctx.destination);
    const waveform = new Float32Array(512);
    const animate = () => {
      if (this.ended) return;
      this.analyser!.getFloatTimeDomainData(waveform);
      this.events.mouth(this.outputMuted || !this.sources.size ? 0 : audioMouthOpening(waveform));
      this.frame = requestAnimationFrame(animate);
    };
    animate();
    ctx.onstatechange = () => {
      if (!this.ended && ctx.state === "suspended") this.events.error("Audio was paused by the browser. Retry to resume voice.");
    };
  }

  play(base64: string, mime = "audio/pcm;rate=24000") {
    if (this.ended || !this.context || !this.gain) return;
    if (!mime.startsWith("audio/pcm")) throw new Error("Unsupported AI audio format.");
    const rate = Number(/rate=(\d+)/.exec(mime)?.[1] || 24000);
    if (rate < 8000 || rate > 48000) throw new Error("Unsupported AI audio sample rate.");
    const samples = decodePcm(base64);
    if (!samples.length) return;
    const ctx = this.context;
    const start = Math.max(ctx.currentTime + 0.015, this.nextTime);
    if (start + samples.length / rate - ctx.currentTime > 30) throw new Error("AI audio is arriving too far ahead. Retry voice to clear the delayed response.");
    const buffer = ctx.createBuffer(1, samples.length, rate); buffer.copyToChannel(samples, 0);
    const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(this.gain);
    this.sources.add(source); this.nextTime = start + buffer.duration;
    source.onended = () => {
      source.disconnect(); this.sources.delete(source);
      if (!this.sources.size) { this.events.playing(false); this.events.mouth(0); }
    };
    source.start(start); this.events.playing(true);
  }
  stopPlayback() {
    for (const source of this.sources) { source.onended = null; source.stop(); source.disconnect(); }
    this.sources.clear(); this.nextTime = 0;
    this.events.playing(false); this.events.mouth(0);
  }
  muteMic(muted: boolean) {
    this.micMuted = muted;
    this.stream?.getAudioTracks().forEach(track => { track.enabled = !muted; });
  }
  muteOutput(muted: boolean) {
    this.outputMuted = muted;
    if (this.gain) this.gain.gain.value = muted ? 0 : 1;
    if (muted) this.events.mouth(0);
  }
  close(): Promise<void> {
    if (this.ended) return this.closing;
    this.ended = true; cancelAnimationFrame(this.frame); this.stopPlayback();
    this.stream?.getTracks().forEach(track => { track.onended = null; track.stop(); });
    if (this.worklet) { this.worklet.port.onmessage = null; this.worklet.port.postMessage("stop"); this.worklet.disconnect(); }
    this.source?.disconnect(); this.silent?.disconnect(); this.gain?.disconnect(); this.analyser?.disconnect();
    if (this.context) { this.context.onstatechange = null; this.closing = this.context.close().catch(() => {}); }
    return this.closing;
  }
}
