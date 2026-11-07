# Verification record

## Aptitude Arena, achievements and passwords (November 8, 2026)

- Full backend suite: **101 tests passed**, zero failures/errors. Frontend: **106 tests passed**; TypeScript/Vite production build passed. The subsequent seed batching change also passed all eight focused Aptitude tests and packaging.
- Flyway V11/V12 and the 500-question seed were verified on an isolated Neon branch copied from production. Practice wrong/right feedback, stars, 143 verbal questions and 20 verified GATE-source entries passed API checks. A 20-question Hard mock preserved saved answers and produced the correct 20/20 report and five persistent badges.
- Real Python Run/Submit via the configured Judge0 runner passed. First accepted Submit awarded one coin; repeat Submit awarded zero; the profile balance and one-day streak matched.
- Browser checks covered the separate sidebar entry, untimed practice explanations, a single mock timer, final analysis, coloured/locked stickers, the celebration popup and automatic dismissal, mobile profile layout, light mode and the invalid-new-password popup. No browser console errors were observed during these flows.
- Legacy-password tests verify that existing login passwords, hashes and saved profile fields remain unchanged. Google sign-in setup is deferred. This release does not claim a new physical microphone/camera, Google OAuth or SMTP acceptance test.

The historical records below describe their respective earlier revisions.

## Career roadmap and retired tools (October 20)

TypeScript/Vite production build passed. All 35 focused backend checks passed: 21 platform integration, 12 AI provider contract and 2 roadmap PDF tests. Coverage includes private PDF exports, saved progress, multi-page long content, and retired LinkedIn Review / Job Match endpoints returning 404. Roadmap map/list switching, completion/reopening, generation, empty/error states, mobile scrolling and light mode were checked in the browser. All four pages of the sample PDF were rendered and visually reviewed.

## Automated checks

AI assistant addition (September 25): all 16 backend tests passed on H2 with migrations V1-V4. New coverage verifies private chat ownership, optional profile context, conversation continuity, idempotent retries, provider failures without partial message pairs, missing-provider setup errors, and assistant response validation through a local HTTP provider fixture. The updated TypeScript/Vite production build passed. Live provider replies still require user-supplied credentials and have not been verified against a paid external service.

Interview fix (September 25): 13 backend tests passed on H2, including a complete guided-practice lifecycle with the AI provider unavailable, saved transcript retrieval, question-limit handling, idempotent reports, and verification that no AI calls or invented scores occur. The frontend production build passed. The earlier PostgreSQL test run below predates migration V3 and this regression test.

- Backend: 12 tests passed against both H2 and PostgreSQL 17.11 (9 platform integration tests and 3 AI provider contract tests).
- Frontend: 3 date/time regression tests passed; TypeScript checking and the Vite production build passed.
- Flyway migrations V1 and V2 were applied successfully to PostgreSQL and H2.
- Provider contract tests use a local HTTP fixture. Platform tests use controlled AI responses; these are test-only fixtures, not production fallback results.

Integration coverage includes session authorization, origin checks, resource ownership, privacy, PDF/DOCX extraction and export, resume analysis, provider failure handling, adaptive interviews and retryable answers, report idempotency, voting and faculty permissions, roadmap ownership, admin moderation, account bans, password reset invalidation, and semantic search.

## Browser checks

The desktop dashboard and mobile layout were inspected at 1440px and 390px widths. Resume analysis error handling, roadmap expansion, community search, interview scheduling, mobile navigation, interview reports, and dark mode were exercised. The mobile interview view includes controls to finish the session without relying on the desktop sidebar.

## External acceptance checks still required

Live AI responses require a configured provider key and model. Google OAuth, SMTP delivery, microphone/speech behavior on supported hardware, public TLS deployment, and container builds were not verified against live services in this environment. Docker was unavailable locally. Complete the deployment checklist before exposing this application publicly.

The local demo deliberately disables the SMTP health indicator because no email server is required for the demo. Production retains the SMTP health check. Sample AI results are labeled; new AI requests return a configuration error until a provider is configured.

