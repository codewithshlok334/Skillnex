# Real-time interview voice

The existing SkillNex interview room, selected interviewer, role curriculum, saved answers and report engine remain in place. AI interviews now use one Gemini Live connection for listening and speech playback. Guided practice retains its existing controls. Text mode remains available.

## Run and try it

Start the backend with the demo profile and the frontend with `npm.cmd run dev`. Open the **frontend Local URL** printed by Vite, normally `http://127.0.0.1:5173`. Port 8080 is the API server, not the website. Both terminals must stay running.

1. Start an AI interview and choose **Start voice interview** in the answer panel.
2. Allow microphone access. Select your actual microphone in the input selector. On the development machine, the default was a Camo virtual microphone; the laptop microphone was listed separately as Realtek Microphone Array.
3. Say hello during the microphone test. This test speech is not submitted as an answer. The green meter confirms input before Gemini connects.
4. Listen to the question and answer naturally. A short pause ends your turn. The answer is saved automatically, then the existing interview engine supplies the next question.
5. Speak over the interviewer to interrupt. Pending playback is cleared immediately and the microphone stays open.
6. Use **Continue with Text** for code or a typed answer. Any unsaved received transcript is retained. During an answer save, wait for the save to finish before switching modes.
7. Select **End interview** after answers are saved, then generate the normal report.

Use headphones when possible. If no level appears, check the selected device, Chrome's microphone permission and Windows microphone access. Retry starts a fresh mic check. Camera preview remains local and optional.

## Backend-only configuration

The regular Gemini configuration continues to handle text questions, answer reviews, chat and final reports. A normal text-model ID is not used as the Live model.

In `backend/config/ai.properties`:

```properties
# Reuses app.ai.key when app.ai.base-url is on generativelanguage.googleapis.com.
app.ai.live-key=
app.ai.live-model=gemini-3.8-live
```

If the regular provider is not Google, set a Google key in `app.ai.live-key` instead. Environment alternatives: `GEMINI_LIVE_API_KEY` and `GEMINI_LIVE_MODEL`. Never put a permanent API key in the frontend or a VITE_ environment variable. Availability and quota depend on the configured Google project.

The authenticated POST `/api/interviews/{id}/live/token` verifies ownership and active AI mode, rate-limits requests, and returns a non-cacheable single-session ephemeral token. Its model, voice, prompt, tools and audio configuration are locked on the backend. Only session-resumption information is supplied by the client. The browser connects directly to Google's constrained WebSocket endpoint; the permanent key never leaves the backend.

## Audio and lifecycle

- One mic stream, with echo cancellation, noise suppression and automatic gain control.
- AudioWorklet captures mono audio. A continuous resampler handles 16/44.1/48 kHz capture; output is little-endian PCM16 at 16 kHz in short chunks.
- One AudioContext handles capture and playback. Gemini PCM at 24 kHz is scheduled using its actual sample rate. The queue is bounded and cleared on interruption, disconnect or stop.
- The portrait's mouth follows the waveform being played through a Web Audio analyser. It closes on silence and interruption. This is an audio-reactive portrait animation, not phoneme/viseme-perfect generated video.
- Server VAD ends candidate turns. Local speech detection cancels playback quickly; the server interruption boundary permits the next response. Generation completion and physical playback completion are handled separately.
- Reconnect uses session-resumption handles when safe. A disconnected in-flight microphone stream is not buffered or replayed. If a tool call was in progress, the saved backend state is restored instead of replaying it.
- Mic permission, silence, disconnect, provider rejection, quota, slow connection and timeout lead to **Retry / Continue with Text**. Cleanup closes all tracks, sockets, timers and audio nodes.

## Persistence and evaluation

The model calls `submit_answer` only for an actual completed answer. The client uses the received speech transcript and calls `/live/turn`. The existing answer table and next-question engine are reused. Save and next-question generation use separate transactions, so a provider failure cannot erase the answer. Retries for the same question and answer are idempotent. Authentication, schema and report prompts are unchanged.

## Verification

Backend regression tests cover ownership/origin protection, persistence after provider failure, idempotent retry and completed-session rejection. Frontend tests cover PCM format/resampling, silence detection, playback interruption, late-packet handling, reconnect, cleanup and transcript recovery.

An actual Google Live session was also tested with synthetic spoken PCM: setup, spoken initial question, interruption, input transcription, answer persistence, spoken next question and a completed report through the existing evaluation endpoint. Physical microphone quality still depends on the selected device and browser/OS permissions; a synthetic audio test is not proof of a user's hardware microphone.

Protocol references: [Gemini Live WebSockets](https://ai.google.dev/api/live), [ephemeral tokens](https://ai.google.dev/gemini-api/docs/live-api/ephemeral-tokens).
