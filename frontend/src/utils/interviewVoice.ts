export function mediaError(error: unknown, device = "Microphone") {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return `${device} access is blocked. Open this site's permissions beside the address bar, allow ${device.toLowerCase()}, then retry. Also check Windows Privacy settings.`;
  if (name === "NotFoundError")
    return `No ${device.toLowerCase()} was found. Connect a device and retry.`;
  if (name === "NotReadableError" || name === "AbortError")
    return `${device} is busy or unavailable. Close other apps using it, then retry.`;
  return `${device} could not start. Check your device and site permissions, then retry.`;
}

export function dictationError(code: string) {
  if (code === "not-allowed") return mediaError({ name: "NotAllowedError" });
  if (code === "audio-capture") return mediaError({ name: "NotFoundError" });
  if (code === "network" || code === "service-not-allowed")
    return "Your browser’s live speech service is unavailable. Any captured words are kept.";
  if (code === "no-speech")
    return "No speech was detected. Check your input device and try again. Any captured words are kept.";
  if (code === "language-not-supported")
    return "This dictation language is unavailable. Change the language or use Record with Gemini.";
  return "Live dictation stopped. Any captured words are kept. Try again or use Record with Gemini.";
}

// Service failures can use recorded audio. Device/permission failures require
// the user to resolve access; switching services cannot grant microphone access.
export function canUseRecordedFallback(code?: string) {
  return ["network", "service-not-allowed", "language-not-supported", "start-timeout"].includes(code || "");
}

// Browsers can end without emitting a final result. Keep the latest interim words.
export function startLiveDictation(
  recorder: any,
  base: string,
  language: string,
  callbacks: {
    text: (value: string) => void;
    state: (state: "starting" | "listening" | "idle") => void;
    error: (message: string, code?: string) => void;
    metrics: (seconds: number, words: number) => void;
  },
) {
  let ended = false,
    started = 0,
    words = 0;
  const finish = () => {
    if (ended) return;
    ended = true;
    clearTimeout(watchdog);
    if (started)
      callbacks.metrics(
        Math.max(1, Math.round((Date.now() - started) / 1000)),
        words,
      );
    callbacks.state("idle");
    recorder.onstart =
      recorder.onresult =
      recorder.onerror =
      recorder.onend =
        null;
  };
  const watchdog = setTimeout(() => {
    if (!ended && !started) {
      callbacks.error(
        "The microphone did not start. Check site permissions or use Record with Gemini.",
        "start-timeout",
      );
      finish();
      recorder.abort();
    }
  }, 10000);
  recorder.lang = language;
  recorder.continuous = true;
  recorder.interimResults = true;
  recorder.onstart = () => {
    if (!ended) {
      started = Date.now();
      clearTimeout(watchdog);
      callbacks.state("listening");
    }
  };
  recorder.onresult = (event: any) => {
    if (ended) return;
    const parts: string[] = [];
    for (let n = 0; n < event.results.length; n++)
      parts.push(event.results[n][0].transcript.trim());
    const transcript = parts.join(" ").trim();
    words = transcript ? transcript.split(/\s+/).length : 0;
    callbacks.text(
      [base.trim(), transcript].filter(Boolean).join(" ").slice(0, 15000),
    );
  };
  recorder.onerror = (event: any) => {
    if (ended) return;
    if (event.error !== "aborted") callbacks.error(dictationError(event.error), event.error);
    finish();
    recorder.abort();
  };
  recorder.onend = finish;
  callbacks.state("starting");
  try {
    recorder.start();
  } catch (error) {
    callbacks.error(mediaError(error));
    finish();
  }
  return {
    stop: () => {
      if (!ended) {
        try {
          recorder.stop();
        } catch {
          finish();
          recorder.abort();
        }
        setTimeout(finish, 1500);
      }
    },
    dispose: () => {
      finish();
      recorder.abort();
    },
  };
}

export function encodeWav(samples: Float32Array) {
  const bytes = new ArrayBuffer(44 + samples.length * 2),
    view = new DataView(bytes);
  const tag = (at: number, text: string) =>
    [...text].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  tag(0, "RIFF");
  view.setUint32(4, bytes.byteLength - 8, true);
  tag(8, "WAVE");
  tag(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, samples.length * 2, true);
  samples.forEach((v, n) => {
    const s = Math.max(-1, Math.min(1, v));
    view.setInt16(44 + n * 2, s * (s < 0 ? 32768 : 32767), true);
  });
  return new Blob([bytes], { type: "audio/wav" });
}

export async function recordingToWav(blob: Blob) {
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration < 0.15)
      throw new Error("The recording is too short. Record a new clip.");
    if (decoded.duration > 121)
      throw new Error("Keep each recording under two minutes.");
    const length = Math.min(1920000, Math.ceil(decoded.duration * 16000));
    const offline = new OfflineAudioContext(1, length, 16000);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return {
      wav: encodeWav(rendered.getChannelData(0)),
      seconds: Math.round(decoded.duration),
    };
  } finally {
    await context.close();
  }
}
