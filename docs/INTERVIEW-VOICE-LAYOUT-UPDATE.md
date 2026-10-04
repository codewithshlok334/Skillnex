# Interview voice and layout update — 30 September 2026

Changes are saved in this source project and included in the SkillNex full-source ZIP. The separate Downloads copy has not been modified. See `../UPDATE_AND_CHECK.md` before updating your existing installation.

## User flow

- Choose the interviewer before starting; that choice remains locked.
- **Start mic / Speak answer** starts browser live dictation. Interim words now appear directly in the answer field and survive unexpected recognition termination. Starting, denied permission, missing device and unavailable speech service have distinct states.
- **Record with Gemini** is selected by default when the backend reports audio transcription available. Live dictation remains selectable; a speech-service failure switches back to recording when available, preserving the draft. Press **Record mic**, speak, then **Stop recording**. Listen to the local clip if desired. Press **Transcribe with Gemini** to send audio through the backend to the configured Gemini model. Review the text before submitting your answer.
- After a successful answer save, the interviewer acknowledges it briefly and queues the next spoken question without cutting off the acknowledgement. AI mute applies to both. These acknowledgements do not grade the answer.
- Recorded clips are limited to two minutes each. Failed transcription keeps the clip in the current page for retry. Discarding it unlocks the input. Audio is not persisted in the application database; only the answer text is saved when submitted. Page refresh discards unsent audio.
- Microphone access requires site and OS permission. The code cannot override a blocked permission or unavailable speech service. The recorded option needs a configured Gemini model that accepts audio input.

## Layout and portrait

Full view uses a stable portal outside the app layout so ancestor effects cannot clip or displace it. The header and toolbar stay inside the viewport; the answer column scrolls independently on desktop, and the central content scrolls on narrow screens. Switching full view preserves the mounted camera and recording components.

Maya and Aarav retain the existing AI-generated portraits. A subtle canvas mouth deformation follows speech playback and available word-boundary events, with a rhythmic fallback when boundaries are absent. This is **simulated mouth motion**, not phoneme-accurate video lip-sync. It stops with speech and respects reduced-motion settings. Idle portraits are not continuously repainted.

## Backend

`POST /api/interviews/{id}/transcribe` accepts multipart `audio`, `questionId`, and `language`. It validates ownership, active session, current unanswered question, language, duration-equivalent byte limit, and mono 16kHz PCM WAV headers. It rate-limits transcription separately, keeps API credentials server-side, and does not auto-submit the returned transcript.

Gemini audio integration follows the official [audio input compatibility documentation](https://ai.google.dev/gemini-api/docs/openai#audio_understanding). It reuses the configured model and key; no new service subscription or hardcoded credential was added.

## Verification

- Backend: 26 tests passed (19 integration, 7 provider contract).
- Frontend: 20 tests passed; production build verified.
- Browser preview with simulated devices: interim transcript preservation after service failure; recorded audio review; failed upload retention and successful retry; interviewer lock retained; full view at desktop, 960×600, and 390×844. Mobile DOM width matched its viewport.
- Live Gemini transcription, actual microphone audio and physical camera access were not exercised. The preview used fake device events and local mock responses and made no external AI calls.

## Files changed in this update

Backend: `AIService.java`, `HttpAIService.java`, `InterviewAIService.java`, `InterviewService.java`, new `InterviewAudioController.java`, and associated integration/provider tests.

Frontend: `InterviewExperience.tsx`, `InterviewCamera.tsx`, `AIInterviewerPortrait.tsx`, new `RecordedInterviewAnswer.tsx`, new `interviewVoice.ts` and its tests, `meeting-interview.css`, and `female-interviewer.css`.

There is no new database migration in this update. Keep the existing V1–V7 migrations, database files and private AI configuration.
