import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LiveInterviewAudio, Pcm16Stream, pcmBase64, decodePcm, audioMouthOpening } from "./liveInterviewAudio";

describe("Live PCM transport and audio-driven lips", () => {
  it("resamples 48 kHz across unequal chunk boundaries without losing time", () => {
    const converter = new Pcm16Stream(48000);
    const input = new Float32Array(48000).fill(0.5);
    let count = 0;
    for (let i = 0; i < input.length; i += 1024) {
      const output = converter.push(input.slice(i, i + 1024)); count += output.length;
      expect(output.every(v => v === 16384)).toBe(true);
    }
    expect(count).toBe(16000);
  });
  it("handles fractional 44.1 kHz ratios and emits little-endian signed PCM", () => {
    const converter = new Pcm16Stream(44100);
    let count = 0;
    for (let i = 0; i < 44100; i += 128) count += converter.push(new Float32Array(Math.min(128, 44100 - i))).length;
    expect(count).toBe(16000);
    expect(pcmBase64(new Int16Array([-32768, 32767, 0]))).toBe("AID/fwAA");
    expect(Array.from(decodePcm("AID/fwAA"))).toEqual([-1, 32767 / 32768, 0]);
  });
  it("keeps lips closed for silence and scales their opening with actual audio energy", () => {
    expect(audioMouthOpening(new Float32Array(512))).toBe(0);
    expect(audioMouthOpening(new Float32Array(512).fill(.004))).toBe(0);
    expect(audioMouthOpening(new Float32Array(512).fill(.08))).toBeGreaterThan(.5);
    expect(audioMouthOpening(new Float32Array(512).fill(1))).toBe(1);
    expect(() => decodePcm("AA==")).toThrow();
  });
});

function fakeNode() {
  return {connect:vi.fn((next: unknown) => next), disconnect:vi.fn(), gain:{value:1}};
}
class FakeContext {
  static all: FakeContext[] = [];
  sampleRate = 48000;
  state = "running";
  destination = {};
  onstatechange: (() => void) | null = null;
  audioWorklet = {addModule:vi.fn().mockResolvedValue(undefined)};
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn(async () => {this.state = "closed";});
  createMediaStreamSource = vi.fn(() => fakeNode());
  createGain = vi.fn(() => fakeNode());
  createAnalyser = vi.fn(() => ({...fakeNode(), fftSize:0, getFloatTimeDomainData:vi.fn()}));
  constructor(public options: AudioContextOptions) { FakeContext.all.push(this); }
}
class FakeWorklet {
  static all: FakeWorklet[] = [];
  port = {onmessage:null as ((event: {data:{samples:Float32Array}}) => void) | null, postMessage:vi.fn(), close:vi.fn()};
  onprocessorerror: (() => void) | null = null;
  connect = vi.fn((next: unknown) => next);
  disconnect = vi.fn();
  constructor() { FakeWorklet.all.push(this); }
}
const flush = async () => { for (let i=0; i<8; i++) await Promise.resolve(); };

describe("live microphone acquisition and cleanup", () => {
  let audio: LiveInterviewAudio;
  let getUserMedia: ReturnType<typeof vi.fn>;
  let track: {stop:ReturnType<typeof vi.fn>; enabled:boolean; onended:null};
  let stream: MediaStream;
  let events: ConstructorParameters<typeof LiveInterviewAudio>[0];
  beforeEach(() => {
    FakeContext.all = []; FakeWorklet.all = [];
    track = {stop:vi.fn(), enabled:true, onended:null};
    stream = {getTracks:() => [track], getAudioTracks:() => [track]} as unknown as MediaStream;
    getUserMedia = vi.fn().mockResolvedValue(stream);
    vi.stubGlobal("navigator", {mediaDevices:{getUserMedia}});
    vi.stubGlobal("AudioContext", FakeContext); vi.stubGlobal("AudioWorkletNode", FakeWorklet);
    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1)); vi.stubGlobal("cancelAnimationFrame", vi.fn());
    events = {samples:vi.fn(), mouth:vi.fn(), playing:vi.fn(), error:vi.fn()};
    audio = new LiveInterviewAudio(events);
  });
  afterEach(async () => { await audio.close(); vi.unstubAllGlobals(); });

  it("captures at the hardware rate and converts worklet frames to 16 kHz PCM", async () => {
    await audio.open();
    expect(FakeContext.all[0].options).not.toHaveProperty("sampleRate");
    FakeWorklet.all[0].port.onmessage!({data:{samples:new Float32Array(480).fill(.5)}});
    const [pcm, rms, seconds] = vi.mocked(events.samples).mock.calls[0];
    expect(pcm).toHaveLength(160); expect(pcm[0]).toBe(16384);
    expect(rms).toBe(.5); expect(seconds).toBe(.01);
    await audio.close(); await audio.close();
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(FakeContext.all[0].close).toHaveBeenCalledTimes(1);
    expect(FakeWorklet.all[0].port.close).toHaveBeenCalledTimes(1);
  });

  it.each(["NotFoundError", "OverconstrainedError"])("recovers a stale selected device after %s", async name => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Unavailable device", name));
    await audio.open("old-headset");
    expect(getUserMedia).toHaveBeenCalledTimes(2);
    expect(getUserMedia.mock.calls[0][0].audio.deviceId).toEqual({exact:"old-headset"});
    expect(getUserMedia.mock.calls[1][0].audio).not.toHaveProperty("deviceId");
    expect(FakeWorklet.all).toHaveLength(1);
  });

  it.each(["NotAllowedError", "SecurityError", "NotReadableError"])("does not retry permissions or a busy microphone after %s", async name => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Browser failure", name));
    await expect(audio.open("headset")).rejects.toThrow(name === "NotReadableError" ? "recording apps" : "site settings");
    expect(getUserMedia).toHaveBeenCalledTimes(1);
    expect(FakeContext.all[0].close).toHaveBeenCalledTimes(1);
  });

  it("stops a permission grant that arrives after cancellation without opening a worklet", async () => {
    let grant!: (value:MediaStream) => void;
    getUserMedia.mockImplementationOnce(() => new Promise(resolve => {grant = resolve;}));
    const opening = audio.open(); await flush();
    await audio.close(); grant(stream); await opening;
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(FakeContext.all[0].audioWorklet.addModule).not.toHaveBeenCalled();
    expect(FakeWorklet.all).toHaveLength(0);
    expect(events.samples).not.toHaveBeenCalled();
  });

  it("never requests a fallback device after a cancelled permission request rejects", async () => {
    let reject!: (error:unknown) => void;
    getUserMedia.mockImplementationOnce(() => new Promise((_, fail) => {reject = fail;}));
    const opening = audio.open("old-headset"); await flush();
    await audio.close(); reject(new DOMException("Device gone", "NotFoundError")); await opening;
    expect(getUserMedia).toHaveBeenCalledTimes(1);
  });

  it("releases the granted microphone and identifies a failed audio-module load", async () => {
    const opening = audio.open();
    FakeContext.all[0].audioWorklet.addModule.mockRejectedValueOnce(new DOMException("Load failed", "AbortError"));
    await expect(opening).rejects.toThrow("audio module could not load");
    expect(track.stop).toHaveBeenCalledTimes(1);
    expect(FakeContext.all[0].close).toHaveBeenCalledTimes(1);
  });
});
