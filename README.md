# SkillNex

**Running on another computer?** Start with [NEW-SYSTEM-SETUP.md](NEW-SYSTEM-SETUP.md) for prerequisites, Gemini configuration, CodeLab setup and first launch.

**One website, one public link:** [FREE-DEPLOYMENT.md](docs/FREE-DEPLOYMENT.md) deploys the frontend and backend together on Render, using your Neon database and Gemini key. No Vercel account is needed. Deployment files are prepared; the public site still needs to be deployed. A cloud code runner and working email delivery need separate setup.

**Updating your existing project?** Read [UPDATE_AND_CHECK.md](UPDATE_AND_CHECK.md) first to retain your database and private Gemini settings.

**VS Code quick start:** [START_HERE_VSCODE.md](START_HERE_VSCODE.md). Open `SkillNex.code-workspace` for the included run tasks.

**AI assistant:** `/app/assistant` provides private saved conversations, follow-up context, Hindi/Hinglish support, and opt-in career profile context. Live replies require a configured AI provider. Copy `backend/config/ai.properties.example` to `backend/config/ai.properties`, fill in the provider details, and restart the backend. Keep the key file private.

### Craft Your Resume. Crack Your Interview

A full-stack career and campus platform with a React / TypeScript frontend, a Spring Boot API, PostgreSQL migrations, real document processing, provider-independent AI services, and a populated local demo.

## Run locally in two terminals

Prerequisites: **Java 21**, **Maven 3.9+**, and **Node.js 22.12+ or 24**.

Terminal 1:

```sh
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=demo
```

Terminal 2:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://127.0.0.1:5173**. Choose **Explore the live demo**, or open **http://127.0.0.1:5173/demo**.

The explicit `demo` profile uses a persistent H2 database in PostgreSQL compatibility mode at `backend/data/careerx-demo`. It does not require Docker. Production uses PostgreSQL; the same integration suite has been run against both engines. Demo profile credentials must never be used for a public deployment.

PowerShell users can also run `./scripts/dev.ps1 -Demo` after installing the prerequisites.

## Demo accounts

Interviews also support **guided practice without an AI connection**. Choose **Start guided practice** in the interview room for curated questions matched to the role, interview type, and difficulty. Answers persist across reloads. Complete the session and open the practice review to see the transcript and a self-review checklist. This mode is explicitly labeled and does not produce AI scores. Adaptive AI interviews still require a configured provider.

All use **CareerX-demo-2026!**.

| Role           | Email                |
| -------------- | -------------------- |
| Student        | student@careerx.demo |
| Faculty        | faculty@careerx.demo |
| Admin          | admin@careerx.demo   |
| Second student | priya@careerx.demo   |

The login page offers one-click student, faculty, and admin demo access only when demo mode is enabled. Seed data includes questions, human answers, faculty verification, resume analysis, a completed interview report, an upcoming interview, notifications, badges, and a roadmap. All precomputed AI results are labeled as samples. New AI requests **never return fabricated fallback results**.

## Run with PostgreSQL using Docker Compose

```sh
cp .env.example .env
# Edit .env: choose strong DATABASE_PASSWORD and JWT_SECRET values.
# For a local populated demo set DEMO_MODE=true and SECURE_COOKIE=false.
docker compose up --build -d
```

Open **http://localhost:8088**. Keep `APP_ORIGIN` exactly equal to the browser origin, including the port. Compose exposes only the web service on loopback. The API and database remain inside the Compose network. Data persists in the `postgres-data` volume.

The Compose configuration does not select the H2 demo profile: `DEMO_MODE=true` seeds **PostgreSQL**. For a clean deployment set `DEMO_MODE=false` before the first start.

Without Docker, export the database variables in your shell and run the backend without a profile:

```sh
export DATABASE_URL=jdbc:postgresql://localhost:5432/careerx
export DATABASE_USER=careerx
export DATABASE_PASSWORD=your-database-password
export JWT_SECRET=your-random-secret-with-at-least-32-characters
export APP_ORIGIN=http://127.0.0.1:5173
export SECURE_COOKIE=false
cd backend && mvn spring-boot:run
```

Spring Boot does not automatically read the root `.env` file outside Compose. Export the variables explicitly or configure them in your IDE. In PowerShell use `$env:NAME='value'`.

## What works

- Email/password signup, login, logout, expiring signed JWT cookies, single-use reset tokens, SMTP reset delivery, and configurable Google OIDC.
- Student/faculty/admin access controls; ownership checks for private resumes, interviews, and roadmaps.
- PDF and DOCX parsing with file and page limits; extracted-text review.
- Structured AI analysis, grounded wording improvements, job comparison, and reviewable resume tailoring.
- Free resume builder with live preview, six styles, section reordering by drag or accessible move buttons, local draft recovery, saved versions, PDF and DOCX export.
- Adaptive interview context, saved text answers, browser voice recognition/read-aloud where supported, timer, completion, and retryable report generation.
- Scheduling, rescheduling, cancellation, dashboard reminders, and downloadable calendar events with a 15-minute alarm.
- Questions, answers, comments, voting, bookmarks, reports, preserved original questions, AI explanations, and faculty verification.
- Transactional reputation and badges; repeat voting and self-voting protections. Reports affect reputation only after an administrator removes the reported content.
- Embedding-based cosine similarity search when configured, with explicit related-keyword fallback when unavailable.
- Personalized roadmap generation, self-reported milestone progress, and recommendations using actual profile/resume/interview/community data.
- Profile editing, validated profile photo upload, public-profile opt-in, notifications, admin analytics, user bans, faculty approval, category management, and report moderation.
- Responsive drawer navigation, light/dark themes, reduced-motion support, loading states, empty states, and recoverable errors.

## Connect an AI provider

All credentials and prompts stay on the backend. Set:

```dotenv
AI_PROVIDER=compatible
AI_BASE_URL=https://your-provider.example/v1
AI_API_KEY=your-private-server-key
AI_MODEL=your-provider-model-id
AI_EMBEDDING_MODEL=your-provider-embedding-model-id
```

`compatible` implements the OpenAI-compatible chat-completions and embeddings HTTP protocol. It can target providers exposing that protocol, including a locally hosted compatible service. For a local service without authentication, use a non-secret sentinel key such as `local`.

For Anthropic:

```dotenv
AI_PROVIDER=anthropic
AI_BASE_URL=https://api.anthropic.com/v1
AI_API_KEY=your-private-server-key
AI_MODEL=your-anthropic-model-id
AI_EMBEDDING_MODEL=
```

The Anthropic adapter uses the Messages API. Its embedding capability is disabled; community search falls back to expanded keywords. Add a new implementation of `AIService` for another protocol.

AI requests use a 10-second connection timeout, a 45-second response timeout, and one bounded retry for transient failures. Structured outputs are validated before persistence. A database-backed rate limiter allows 15 generation requests per account per hour. The API returns HTTP 503 with **“AI service is temporarily unavailable. Please try again.”** when no provider is configured or a provider fails.

Prompt instructions prohibit fabricated qualifications or numerical achievements. They do not mathematically guarantee factual output. The UI requires the user to review wording and tailored versions before applying or saving them. ATS and job-match scores are estimates, never selection guarantees.

Embedding search indexes questions when an AI explanation is generated. Existing questions can be indexed by refreshing their explanation. Search ranks up to the latest 2,000 indexed questions with matching model IDs. See the architecture document for this scale limit and how to upgrade to pgvector.

## Google sign-in and email

Set `GOOGLE_ENABLED=true`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET`. Register this redirect URI in the Google OAuth client:

```
https://your-domain.example/login/oauth2/code/google
```

For Vite development register `http://127.0.0.1:5173/login/oauth2/code/google`. The Vite and Nginx proxies preserve the browser-facing host. Password accounts are not silently linked to a Google identity with the same email; use the existing password to avoid implicit account takeover.

Configure the SMTP values from `.env.example`. Reset requests return the same message whether the account exists. The local demo exposes an explicitly labeled reset link for convenient testing; production never exposes reset tokens in API responses.

## Tests and builds

```sh
cd frontend
npm test
npm run build
cd ../backend
mvn verify
```

To run the backend suite against an isolated PostgreSQL database:

```sh
mvn test -Dspring.datasource.url=jdbc:postgresql://localhost:5432/careerx_test -Dspring.datasource.username=careerx -Dspring.datasource.password=your-test-password
```

**Use a disposable test database.** Integration tests insert test accounts and clear rate-limit buckets. AI fixtures live only in test sources. Provider contract tests use a local HTTP fixture server and exercise the real HTTP adapter and output validation.

See [verification notes](docs/VERIFICATION.md) for the exact checks and remaining external verification.

## Source layout

```
frontend/src/
  api/           typed fetch client and downloads
  components/    shared product components and shadcn-style Radix UI primitives
  hooks/         session and server configuration
  layouts/       persistent workspace shell
  pages/         dashboard, auth, resume, interview, community, roadmap, admin
  types/         API-facing TypeScript models
  utils/         timezone and presentation helpers
backend/src/main/java/com/careerx/
  ai/            provider abstraction, orchestration, domain AI services
  config/        security configuration, Google registration, explicit demo seed
  controller/    REST endpoints and validated request DTO consumption
  dto/           validation-constrained input records
  repository/    parameterized JDBC access
  security/      JWT cookies, Origin validation, rate limiting
  service/       document, interview, community, reminder workflows
  exception/     safe API error responses
backend/src/main/resources/
  db/migration/  versioned PostgreSQL-compatible schema and indexes
  prompts/       backend prompt templates
```

The persistence layer intentionally uses Spring JDBC and explicit schema relationships rather than JPA entity serialization. API responses select permitted fields; password hashes and reset tokens are never returned.

## More documentation

- [API reference](docs/API.md)
- [Architecture and data model](docs/ARCHITECTURE.md)
- [Production deployment](docs/DEPLOYMENT.md)
- [Verification and known boundaries](docs/VERIFICATION.md)

This source is deployable, but no public deployment, live AI inference, Google OAuth exchange, or external SMTP delivery has been performed without your service configuration.
