import { describe, expect, it } from "vitest";
import { Pcm16Stream, pcmBase64, decodePcm, audioMouthOpening } from "./liveInterviewAudio";

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
