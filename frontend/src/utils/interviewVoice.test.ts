import { afterEach, describe, expect, it, vi } from "vitest";
import {
  startLiveDictation,
  encodeWav,
  dictationError,
  mediaError,
  canUseRecordedFallback,
} from "./interviewVoice";
function fixture(base = "Existing typed answer.") {
  const recorder: any = { start: vi.fn(), stop: vi.fn(), abort: vi.fn() };
  const callbacks = {
    text: vi.fn(),
    state: vi.fn(),
    error: vi.fn(),
    metrics: vi.fn(),
  };
  const control = startLiveDictation(recorder, base, "en-IN", callbacks);
  return { recorder, callbacks, control };
}
function result(text: string, final = false) {
  return Object.assign([{ transcript: text }], { isFinal: final });
}
afterEach(() => {
  vi.useRealTimers();
});
describe("interview voice recovery", () => {
  it("keeps interim speech on unexpected end, without duplicating revisions", () => {
    vi.useFakeTimers();
    const { recorder: r, callbacks: c } = fixture();
    r.onstart();
    r.onresult({ results: [result("I worked")] });
    r.onresult({
      results: [result("I worked on React", true), result("and Java")],
    });
    expect(c.text).toHaveBeenLastCalledWith(
      "Existing typed answer. I worked on React and Java",
    );
    r.onend();
    expect(c.text).toHaveBeenCalledTimes(2);
    expect(c.state).toHaveBeenLastCalledWith("idle");
    expect(c.metrics.mock.calls[0][1]).toBe(6);
  });
  it("releases busy state after speech service failure and keeps the draft", () => {
    vi.useFakeTimers();
    const { recorder: r, callbacks: c } = fixture("");
    r.onstart();
    r.onresult({ results: [result("My project")] });
    r.onerror({ error: "network" });
    expect(c.state).toHaveBeenLastCalledWith("idle");
    expect(c.error.mock.calls[0][0]).toContain("speech service");
    expect(c.error.mock.calls[0][1]).toBe("network");
    expect(c.text).toHaveBeenLastCalledWith("My project");
    expect(r.onresult).toBeNull();
    expect(r.abort).toHaveBeenCalled();
  });
  it("does not get stuck when start throws or never responds", () => {
    vi.useFakeTimers();
    const c = {
      text: vi.fn(),
      state: vi.fn(),
      error: vi.fn(),
      metrics: vi.fn(),
    };
    startLiveDictation(
      {
        start() {
          throw { name: "NotAllowedError" };
        },
      },
      "",
      "hi-IN",
      c,
    );
    expect(c.state).toHaveBeenLastCalledWith("idle");
    expect(c.error.mock.calls[0][0]).toContain("permissions");
    const f = fixture();
    vi.advanceTimersByTime(10001);
    expect(f.callbacks.state).toHaveBeenLastCalledWith("idle");
    expect(f.recorder.abort).toHaveBeenCalled();
  });
  it("ignores stale callbacks after dispose and finishes a stopped recorder with no end event", () => {
    vi.useFakeTimers();
    const f = fixture();
    const late = f.recorder.onresult;
    f.control.dispose();
    late({ results: [result("stale")] });
    expect(f.callbacks.text).not.toHaveBeenCalled();
    const next = fixture();
    next.recorder.onstart();
    next.control.stop();
    vi.advanceTimersByTime(1500);
    expect(next.callbacks.state).toHaveBeenLastCalledWith("idle");
  });
  it("distinguishes device, permission and provider failures", () => {
    expect(mediaError({ name: "NotReadableError" }, "Camera")).toContain(
      "busy",
    );
    expect(dictationError("audio-capture")).toContain("No microphone");
    expect(dictationError("service-not-allowed")).toContain("speech service");
  });
  it("offers recorded recovery only for speech service failures, not denied or missing devices", () => {
    for (const code of ["network", "service-not-allowed", "language-not-supported", "start-timeout"])
      expect(canUseRecordedFallback(code)).toBe(true);
    for (const code of ["not-allowed", "audio-capture", "no-speech", "aborted"])
      expect(canUseRecordedFallback(code)).toBe(false);
  });
  it("encodes bounded mono 16k PCM with correct RIFF length and clamped samples", async () => {
    const wav = encodeWav(new Float32Array([-2, 0, 2]));
    const bytes = await wav.arrayBuffer();
    const view = new DataView(bytes);
    expect(wav.type).toBe("audio/wav");
    expect(bytes.byteLength).toBe(50);
    expect(view.getUint32(4, true)).toBe(42);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint32(40, true)).toBe(6);
    expect(view.getInt16(44, true)).toBe(-32768);
    expect(view.getInt16(48, true)).toBe(32767);
  });
});
