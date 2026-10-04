class SkillNexPcmCapture extends AudioWorkletProcessor {
  constructor() {
    super();
    // 64 ms at 16 kHz. Used by both streaming and the legacy clip fallback.
    this.buffer = new Float32Array(1024);
    this.count = 0;
    this.stopped = false;
    this.port.onmessage = event => {
      if (event.data === 'stop') {
        this.flush();
        this.stopped = true;
        this.port.postMessage({ done: true });
      }
    };
  }
  flush() {
    if (!this.count) return;
    const samples = this.buffer.slice(0, this.count);
    this.port.postMessage({ samples }, [samples.buffer]);
    this.count = 0;
  }
  process(inputs) {
    if (this.stopped) return false;
    const channels = inputs[0];
    if (!channels?.length) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let mono = 0;
      for (const channel of channels) mono += channel[i] / channels.length;
      this.buffer[this.count++] = mono;
      if (this.count === this.buffer.length) this.flush();
    }
    return true;
  }
}
registerProcessor('skillnex-pcm-capture', SkillNexPcmCapture);
