# SkillNex REST API

## AI assistant

- `GET /api/assistant/threads`: latest 100 conversations owned by the signed-in user.
- `POST /api/assistant/threads`: create a conversation (30 per user/hour).
- `GET /api/assistant/threads/{id}`: owned conversation and ordered messages.
- `POST /api/assistant/threads/{id}/messages`: `{ "text": "...", "requestId": "a-client-generated-UUID", "includeProfile": false }`. Maximum 4,000 characters, 50 exchanges per conversation. Reuse the same request ID to retry the same submission safely. The last 6 exchanges are included in the provider context. Profile fields are included only when explicitly requested. The standard shared AI rate limit applies. Failed provider requests do not create fake replies or partial message pairs.

Interview rooms expose `mode`, `aiAvailable`, and `questionLimit`. Use `POST /api/interviews/{id}/start?mode=PRACTICE` for explicitly selected guided practice; omitted mode defaults to `AI`. The chosen mode persists for the session. Both modes use the existing answer, next, end, and report endpoints. Practice reports return `practice: true`, answer counts, a summary, and a self-review checklist; they intentionally have no score. AI requests are never silently converted to practice.

Base path: `/api`. JSON requests and responses, except multipart uploads and binary exports.

## Authentication and errors

A successful signup/login sets the HTTP-only `careerx_session` cookie. Send it with subsequent requests. Every POST/PUT/PATCH/DELETE must include an exact allowed `Origin` header. Browser fetch calls use `credentials: include`; no JavaScript-accessible bearer token is required.

Errors use `{"message":"human-readable explanation"}`. Typical statuses: 400 invalid input, 401 unauthenticated, 403 forbidden role/origin, 404 missing or non-owned resource, 409 duplicate/conflicting action, 413 file too large, 429 rate limit, and 503 AI unavailable.

Example:

```sh
curl -c cookies.txt -H "Origin: http://localhost:5173" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@careerx.demo","password":"CareerX-demo-2026!"}' \
  http://localhost:8080/api/auth/login
curl -b cookies.txt http://localhost:8080/api/dashboard
```

## Identity

| Method | Path                  | Request / result                                                                                                                         |
| ------ | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | /config               | Public flags: demo, aiAvailable, semanticSearch, googleEnabled                                                                           |
| POST   | /auth/signup          | name, email, password; optional college, course, branch, studyYear, graduationYear, careerGoal; returns id                               |
| POST   | /auth/login           | email, password; returns id and session cookie                                                                                           |
| POST   | /auth/logout          | Invalidates current account tokens and expires cookie                                                                                    |
| POST   | /auth/forgot-password | email; generic delivery message; demo-only reset URL                                                                                     |
| POST   | /auth/reset-password  | token, password; single-use; invalidates previous sessions                                                                               |
| GET    | /users/me             | Private profile and badges; no password/reset data                                                                                       |
| PUT    | /users/me             | name, college, course, branch, studyYear, graduationYear, careerGoal, skills, projects, publicProfile                                    |
| POST   | /users/me/photo       | multipart file; PNG/JPEG ≤1 MB, ≤4096px per side; returns normalized photoUrl                                                            |
| GET    | /users/{id}           | Public fields only; requires profile visibility opt-in and authentication                                                                |
| GET    | /dashboard            | profile, latest resume analysis, latest interview report, upcoming interviews, roadmapItems, community counts, recentQuestions, activity |
| GET    | /notifications        | Latest 50 notifications for current user                                                                                                 |
| POST   | /notifications/read   | Marks current user’s notifications read                                                                                                  |

Google entry point: `/oauth2/authorization/google`. Callback: `/login/oauth2/code/google`. These are outside the `/api` prefix.

## Resumes and jobs

| Method | Path                            | Request / result                                                                                       |
| ------ | ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| GET    | /resumes                        | Current user’s resume summaries, newest first                                                          |
| POST   | /resumes                        | Multipart `file`; PDF/DOCX ≤5 MB; extracted text ≤60,000 characters; returns id/name                   |
| GET    | /resumes/{id}                   | Owned text/document and latest analysis                                                                |
| POST   | /resumes/build                  | name, content, document; saves a new owned resume version                                              |
| POST   | /resumes/{id}/analyze           | Generates and saves validated analysis                                                                 |
| POST   | /resumes/improve                | text → suggestion; user reviews before applying                                                        |
| GET    | /resumes/{id}/export?format=pdf | Binary PDF; `format=docx` for Word                                                                     |
| GET    | /resume-templates               | Six available template IDs/names                                                                       |
| POST   | /jobs/match                     | resumeId, jobDescription → score, matchingSkills, missingSkills, keywords, projects, topics            |
| POST   | /resumes/tailor                 | resumeId, jobDescription → original and tailored {content, changes}; saved audit version, no overwrite |

Analysis output:

```json
{
  "score": 78,
  "summary": "Evidence-based summary",
  "breakdown": [{ "label": "Formatting", "score": 92 }],
  "issues": [
    {
      "title": "Clarify your contribution",
      "original": "Exact supplied text",
      "suggestion": "Suggested revision",
      "severity": "medium"
    }
  ]
}
```

Only demo seeds carry `demo: true`. Scores are estimates.

The builder `document` contains `name`, `contact`, `template`, and ordered `sections: [{id,title,content}]`. Empty sections are omitted by the frontend when producing exportable plain text.

## Interviews

| Method | Path                    | Request / result                                                |
| ------ | ----------------------- | --------------------------------------------------------------- |
| GET    | /interviews             | Current user’s sessions                                         |
| POST   | /interviews             | role, kind, difficulty, duration, optional scheduledAt          |
| GET    | /interviews/{id}        | Owned session, ordered transcript, optional report              |
| PUT    | /interviews/{id}        | Same creation fields; only SCHEDULED sessions                   |
| DELETE | /interviews/{id}        | Cancels SCHEDULED or ACTIVE session                             |
| POST   | /interviews/{id}/start  | Generates initial question; repeated active start is idempotent |
| POST   | /interviews/{id}/answer | questionId, text; commits current answer once                   |
| POST   | /interviews/{id}/next   | Generates adaptive follow-up from committed transcript          |
| POST   | /interviews/{id}/end    | Completes session; at least one answer required                 |
| POST   | /interviews/{id}/report | Generates or returns saved report; completed session required   |

`kind`: HR, Technical, Behavioral, Mixed. `difficulty`: Easy, Medium, Hard. Duration: 5–90 minutes. `scheduledAt` must be an ISO 8601 timestamp including a UTC offset and cannot be in the past. Omit it to practice immediately.

An active session supports up to 20 questions. The time limit is advisory. The report has `score`, category `breakdown`, `strengths`, `improvements`, `modelAnswers`, `topics`, and `followUpQuestions`.

## Community

| Method | Path                               | Request / result                                                          |
| ------ | ---------------------------------- | ------------------------------------------------------------------------- |
| GET    | /community/categories              | Topic names                                                               |
| GET    | /community/questions               | q, category, page, sort, bookmarked filters                               |
| GET    | /community/search                  | Same search interface                                                     |
| POST   | /community/questions               | title, optional originalTitle, body, category                             |
| GET    | /community/questions/{id}          | Visible question, AI explanation, human answers, comments, bookmark state |
| POST   | /community/questions/enhance       | text → suggested title; does not overwrite original                       |
| POST   | /community/questions/{id}/explain  | Generates explanation and optional embedding                              |
| POST   | /community/questions/{id}/bookmark | Toggles current user’s bookmark                                           |
| POST   | /community/questions/{id}/comments | text, up to 2,000 characters                                              |
| POST   | /community/answers                 | questionId, body                                                          |
| POST   | /community/answers/{id}/vote       | value: -1, 0, or 1; 0 removes vote                                        |
| POST   | /community/answers/{id}/helpful    | Question author marks non-self answer helpful once                        |
| POST   | /community/answers/{id}/verify     | FACULTY/ADMIN only; no self-verification                                  |
| POST   | /community/reports                 | targetId, targetType: question/answer, reason                             |

Question pages contain 12 items. `page` is zero-based. `sort`: recent, popular (answer count), unanswered (fewest answers). Responses include `items`, `total`, `page`, and `mode`: recent, semantic, or expanded-keyword. When semantic mode is used, cosine similarity determines order. Hidden content is excluded.

The browser requests an initial explanation after successfully posting a question when AI is configured. If generation fails, the saved question remains available and the user may retry.

## Career

| Method | Path                       | Request / result                                                                  |
| ------ | -------------------------- | --------------------------------------------------------------------------------- |
| GET    | /career/roadmap            | Latest active roadmap and items, or empty items array                             |
| POST   | /career/roadmap            | text: career goal; creates a new roadmap using actual account data                |
| PATCH  | /career/roadmap/items/{id} | progress: integer 0–100; ownership enforced                                       |
| POST   | /career/recommendations    | title and recommendation using resume, skills, interviews, and community activity |

Roadmap items include learn, practice, build, and interview activities. Completion is user-reported, never inferred as a credential.

## Administration

All routes below require ADMIN:

| Method | Path                        | Request / result                                           |
| ------ | --------------------------- | ---------------------------------------------------------- |
| GET    | /admin/analytics            | User/activity/content/interview/analysis/AI/report counts  |
| GET    | /admin/users?page=0         | 20 users per page, total count                             |
| POST   | /admin/users/{id}/ban       | Toggles non-admin ban; invalidates sessions                |
| POST   | /admin/users/{id}/faculty   | Promotes a student after human affiliation review          |
| GET    | /admin/reports              | Latest 100 reports with reported content preview           |
| POST   | /admin/reports/{id}/resolve | action: dismiss/remove; transactional and once-only        |
| POST   | /admin/categories           | text: category name, ≤60 characters                        |
| DELETE | /admin/categories/{name}    | Deletes unused category; FK protects referenced categories |

Active users means unbanned accounts authenticated within the last 30 days.

## Rate limits

Database-backed windows: login 30/IP and 10/email per 15 minutes, signup 10/IP/hour, reset 5/IP/15 minutes, AI generation 15/account/hour, semantic search 30/account/hour, question posts 20/account/hour, answers/comments 30/account/hour, reports 10/account/hour.

Rate-limit transactions are independent so failed downstream operations still count. Production proxy handling must pass the actual trusted client address; do not trust client-supplied forwarding headers.
