# Verification record

## Automated checks

AI assistant addition (September 25): all 16 backend tests passed on H2 with migrations V1-V4. New coverage verifies private chat ownership, optional profile context, conversation continuity, idempotent retries, provider failures without partial message pairs, missing-provider setup errors, and assistant response validation through a local HTTP provider fixture. The updated TypeScript/Vite production build passed. Live provider replies still require user-supplied credentials and have not been verified against a paid external service.

Interview fix (September 25): 13 backend tests passed on H2, including a complete guided-practice lifecycle with the AI provider unavailable, saved transcript retrieval, question-limit handling, idempotent reports, and verification that no AI calls or invented scores occur. The frontend production build passed. The earlier PostgreSQL test run below predates migration V3 and this regression test.

- Backend: 12 tests passed against both H2 and PostgreSQL 17.11 (9 platform integration tests and 3 AI provider contract tests).
- Frontend: 3 date/time regression tests passed; TypeScript checking and the Vite production build passed.
- Flyway migrations V1 and V2 were applied successfully to PostgreSQL and H2.
- Provider contract tests use a local HTTP fixture. Platform tests use controlled AI responses; these are test-only fixtures, not production fallback results.

Integration coverage includes session authorization, origin checks, resource ownership, privacy, PDF/DOCX extraction and export, resume analysis and job matching, provider failure handling, adaptive interviews and retryable answers, report idempotency, voting and faculty permissions, roadmap ownership, admin moderation, account bans, password reset invalidation, and semantic search.

## Browser checks

The desktop dashboard and mobile layout were inspected at 1440px and 390px widths. Resume analysis error handling, roadmap expansion, community search, interview scheduling, mobile navigation, interview reports, and dark mode were exercised. The mobile interview view includes controls to finish the session without relying on the desktop sidebar.

## External acceptance checks still required

Live AI responses require a configured provider key and model. Google OAuth, SMTP delivery, microphone/speech behavior on supported hardware, public TLS deployment, and container builds were not verified against live services in this environment. Docker was unavailable locally. Complete the deployment checklist before exposing this application publicly.

The local demo deliberately disables the SMTP health indicator because no email server is required for the demo. Production retains the SMTP health check. Sample AI results are labeled; new AI requests return a configuration error until a provider is configured.

