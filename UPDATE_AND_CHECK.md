# SkillNex — full source update

This is the complete frontend and backend as of 4 October 2026, including interview microphone/layout recovery, SkillNex branding, colorful tool cards, LinkedIn review, authentication/data recovery fixes and CodeLab with 50 questions in Java, C++ and Python. For a fresh computer, start with [NEW-SYSTEM-SETUP.md](NEW-SYSTEM-SETUP.md).

### LinkedIn review update

After signing in, choose **LinkedIn review** in the sidebar, or open `/app/linkedin`. Paste your profile URL and target role, then import a PDF or paste your professional profile text. Review the preview, approve sending it to your configured AI provider, and choose **Analyse profile**. Saving the report is optional; saved reports have a delete option.

PDF/text analysis works with your existing Gemini configuration. **Connect with LinkedIn** separately requires your LinkedIn developer application's Client ID, Client Secret, approved OpenID Connect product and exact callback URL. Standard LinkedIn sign-in imports basic profile information only; it does not enable full analysis from a URL alone. See `docs/LINKEDIN-REVIEW.md`. Keep credentials in the private backend configuration, never frontend code.

### Live interview update

AI interviews now use **Gemini Live**: choose your microphone, press **Start voice interview**, say hello for the mic check, then answer naturally. Speech streams directly; a completed answer is saved automatically before the next question. **Continue with Text** retains any received unsaved transcript.

The selected interviewer uses streamed Gemini audio and waveform-driven mouth movement. Retry, microphone levels, interruption, reconnect and cleanup are included. This is an animated portrait, not phoneme-perfect generated video. Guided practice retains its existing controls.

Use the updated frontend **and** backend together. Keep your private provider configuration. The current changes are in this source folder; older ZIP files do not contain this Live update. See [the Live interview guide](docs/GEMINI-LIVE-INTERVIEW.md) for configuration and testing.

## Update your existing copy without losing data

1. Stop your frontend and backend terminals with **Ctrl+C**. Do not run two backends against the same H2 database.
2. Make a backup of your existing project folder before replacing files.
3. Extract this ZIP into a **new folder**. Open `SkillNex/SkillNex.code-workspace` in VS Code. The Explorer will show **SkillNex**.
4. With both backends stopped, copy your existing `backend/data` folder into the extracted project's `backend/data` to keep your local H2 accounts, chats and other database records. Copy the entire folder, not just selected database files. Keep your old backup.
5. Copy your private `backend/config/ai.properties` into the same location in the extracted project to retain your Gemini connection. If you use environment variables or PostgreSQL instead, keep those existing settings and point the new backend at the same database. Do not share your key file.
6. Keep all included V1–V9 database migrations; the backend applies only migrations that are missing. V8 adds LinkedIn connections and optional reports; V9 adds CodeLab. Do not edit old migrations or reset the database.
7. Start the two servers below. Use the same login account as before. Opening a fresh empty database or a different demo account will show different data.

The archive uses a `SkillNex` root folder; older local copies may still be named `careerx`. Internal database/session identifiers remain compatible. Set up CodeLab again on a new machine with `START-CODELAB.cmd`; do not copy machine-specific runner configuration.

## Start in VS Code

Prerequisites: Java JDK 21, Maven 3.9+, and Node.js 22.12+ or 24. Java and Maven must be available in your terminal. Restart VS Code after changing PATH.

First terminal, from the extracted `SkillNex` folder:

```powershell
cd backend
mvn.cmd spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Second terminal, from the extracted `SkillNex` folder:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open the **Local** URL printed by Vite. It normally uses `http://127.0.0.1:5173`; if that port is busy, use the actual port shown. Keep the backend terminal running on port 8080. You can also use the supplied **SkillNex** VS Code tasks.

## Included changes to check

- **Interview microphone:** Gemini Live streams speech, shows received transcription, and saves completed answers. The mic check and device selector help detect silent or virtual inputs.
- **Text fallback:** choose **Continue with Text** to retain a received draft, type an answer or use the fallback microphone controls. Live voice does not require manual record/stop/transcribe steps.
- **Interview room:** stable full view, responsive answer panel, camera preview and visible toolbar. Male/female interviewer choice stays locked after selection. Portrait mouth motion follows speech playback; it is simulated animation, not a live video person.
- **Interview engine:** role-specific categories, introductory question and progressive difficulty, answer context/follow-ups, final review and transcript.
- **Ask AI:** existing chat page and floating widget, conversation history and display controls. Actual replies require your configured provider.
- **SkillNex branding:** supplied logo, tagline, login/header/footer, assistant labels, resume/report downloads and VS Code workspace/task names.
- **Homepage:** six colored tool cards—blue, purple, rose, green, amber and teal—with quieter effects, consistent spacing and mobile navigation.

## Quick checks

1. Homepage: confirm logo/tagline, all six colored cards and navigation links.
2. Sign in with your existing account; check saved resumes and chats, then log out and sign in again.
3. Send two consecutive Ask AI messages. Confirm the provider responds.
4. Start an interview, choose an interviewer, enable your camera if wanted, and start the mic. Allow browser/Windows device access when requested. Test a typed answer too.
5. Speak naturally, check the live transcript and next spoken question, then interrupt the interviewer. Test Continue with Text and Retry as well.
6. Switch full view, check the transcript, and complete an interview to review its report.

On 4 October 2026, the frontend build, 68 frontend tests and 62 backend tests passed. Browser checks covered login persistence, interview answers/next question/report and CodeLab Run/Submit; Python, Java and C++ execution were checked. Synthetic audio transcription passed. Physical microphone/camera permissions, sound quality and a full live conversation still need a check on the destination computer. LinkedIn authorization needs the recipient's own app credentials and approval; sign-in does not provide a full profile from a URL alone.

## Archive contents

Source code, public assets, tests, V1–V9 migrations, all 50 coding questions, example configuration, Docker/compose files and VS Code tasks are included. `node_modules`, build output, private keys/configuration, local databases and logs are excluded. `npm ci` and Maven recreate dependencies; private settings and saved data come from your existing local copy. The local CodeLab sandbox and its language runtimes download during first setup.

See `START_HERE_VSCODE.md`, `docs/INTERVIEW-VOICE-LAYOUT-UPDATE.md` and `docs/SKILLNEX-BRANDING.md` for details.

