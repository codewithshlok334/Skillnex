# Architecture

## Runtime boundaries

The browser talks only to the same-origin `/api` endpoint. Vite proxies development requests to Spring Boot; Nginx serves the production build and proxies the API and OAuth callback paths.

React Router separates tools into routes. TanStack Query owns server state and invalidation. Builder drafts are stored locally per authenticated account ID; saved resumes belong to the server-side account. Framer Motion respects reduced-motion preferences. Dialog primitives use Radix; buttons follow shadcn/ui composition conventions.

Spring Security authenticates an HTTP-only JWT cookie. The token holds a subject and token version; every authenticated request checks the current role, ban status, and token version in the database. Password reset, ban changes, and logout revoke existing tokens. Session cookies expire after 24 hours. An exact Origin allowlist protects every non-GET request because cookies are used. CORS uses the same allowlist. Never configure wildcard credentialed origins.

Repositories use parameterized Spring JDBC. Dynamic table names are selected from fixed allowlists. There are no ORM entities serialized to callers. Request records use Bean Validation; responses contain explicitly selected public fields or validated structured AI documents.

## Data model

Flyway migrations are the source of truth:

- `backend/src/main/resources/db/migration/V1__careerx.sql`
- `backend/src/main/resources/db/migration/V2__operational_indexes.sql`

| Aggregate    | Tables and relationships                                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Identity     | `app_users` → one `profiles`; role constrained to STUDENT/FACULTY/ADMIN; single-use hashed `password_resets`               |
| Resume       | user → many `resumes` → many `resume_analyses` / `resume_versions`; six `resume_templates`                                 |
| Job matching | user → `job_descriptions`; `job_matches` links a description to an owned resume                                            |
| Interview    | user → `interviews` → ordered `interview_questions` → at most one `interview_answers`; one `interview_reports` per session |
| Community    | user → `questions` → `answers` and `comments`; category FK; verifier FK to user                                            |
| Reputation   | unique `votes(user_id, answer_id)`; `badges` / unique `user_badges`; cached reputation in profile                          |
| Moderation   | unique report per reporter + target; content is soft-hidden on removal                                                     |
| Roadmap      | user → `career_goals` → `career_roadmaps` → ordered `roadmap_items`                                                        |
| Activity     | user → `notifications`, `ai_usage`; globally unique reminder event keys; persistent `rate_limits`                          |

Indexes cover ownership, chronological lists, categories, votes, reports, reminder scans, and recent analysis lookups. Foreign keys, uniqueness constraints, role/status checks, and progress bounds enforce invariants independently of the UI.

## AI architecture

`AIService` defines structured generation and embeddings. `HttpAIService` contains separate OpenAI-compatible and Anthropic protocol paths. `AIExecutor` applies per-user limits and records usage. Domain services are `ResumeAIService`, `InterviewAIService`, `CommunityAIService`, and `CareerAIService`.

Prompts are backend resources, not frontend strings. Untrusted resume/job/question text is passed as data. Every generation prompt instructs the provider not to invent qualifications, metrics, or employment history. Structured JSON is parsed and validated for required fields, types, lengths, array bounds, and 0–100 score bounds before it is returned for persistence.

All generated wording is a reviewable suggestion. Users explicitly apply builder improvements and save tailored versions. AI explanations are distinguished from human answers. Faculty verification requires a server-side FACULTY or ADMIN role and cannot be self-awarded.

No configured AI key/model means a clean HTTP 503, not a simulated result. Seeded sample results exist only in explicit demo mode.

## Interview consistency

The workflow is SCHEDULED → ACTIVE → COMPLETED, with cancellation available before completion. Starting, answering, following up, completing, and reporting acquire the interview row lock. A question has at most one answer, and its position is unique within a session.

Answer submission is a separate committed request from the next AI question. A failed follow-up therefore preserves the answer. Report generation is retryable and idempotent through a unique interview-report relationship. It requires at least one submitted answer and a completed session. The AI sees the target, difficulty, latest resume, and entire transcript for adaptive follow-up questions.

The timer is advisory: exceeding the requested duration does not discard an unfinished answer. Voice uses browser speech APIs when available; text remains the dependable fallback.

## Reputation integrity

- Question posted: +1.
- Upvote received: +5; a downvote subtracts 5.
- Question author marks an answer helpful: +10 once.
- Faculty verification: +20 once.
- Administrator removes reported content: -5 once.
- Reporting alone never subtracts reputation.

Votes are unique by voter and answer. Changing/removing a vote applies only its delta. Self-voting, self-verification, and marking your own answer helpful are rejected. Transactions lock the answer and update the owner’s reputation atomically. Badges are unique per user.

A production public launch may need stronger Sybil resistance, institutional verification workflows, and abuse review beyond this account-level protection.

## Search

When a compatible embedding model is configured, generating an explanation stores the question vector and model ID. Queries use cosine similarity against up to 2,000 recent indexed candidates and filter hidden content, category, and bookmarks before ranking.

If embeddings are unavailable or no indexed candidates exist, related-keyword search expands concepts such as redundant data into normalization and functional-dependency terms. The API and UI explicitly report whether semantic or expanded-keyword search was used.

This implementation is suitable for a campus-sized portfolio dataset. For larger deployments, replace the bounded in-process ranking with a pgvector HNSW index and a background embedding/reindex queue. Changing models requires re-embedding existing questions; vectors from different model IDs are never compared.

## Operational boundaries

- Local demo persistence is H2; production persistence is PostgreSQL.
- Files are parsed into owned resume text; the original uploaded binary is not retained.
- Profile images are decoded, resized, and re-encoded as JPEG, stripping supplied metadata.
- Builder previews have six visual styles. Exports use the selected style’s typography/color family in a consistent single-column layout; they are not pixel-identical browser screenshots.
- PDF Unicode coverage depends on the configured TrueType font. Unsupported glyphs are replaced visibly with `?`.
- PDF OCR is not included. Scanned PDFs return a useful error.
- Notifications are in-app and polled; calendar files provide device reminders. There is no SMS or push-delivery service.
- Report moderation soft-hides content. A restoration UI and full audit/event ledger would be reasonable next operational additions.
