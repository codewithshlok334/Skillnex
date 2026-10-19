# SkillNex: one website on Render

The frontend and Spring Boot backend deploy together as **one Free Render web service**, at one HTTPS address. Neon stores the database and Gemini supplies AI responses behind that website. You do not need Vercel or a second frontend deployment.

The repository's root `Dockerfile` builds React, bundles its files into the Java application, and starts one server. Pages and `/api` requests use the same origin. Refreshing a resume, interview or CodeLab page opens the app normally.

These files prepare deployment; they do not create a public site until you deploy them in your Render account.

## 1. Open Render and connect the repository

1. Sign in at <https://dashboard.render.com> using your GitHub account.
2. Choose **New > Blueprint** and connect `codewithshlok334/Skillnex`, branch `main`.
3. Use the root **`render.yaml`**. The Docker context is the repository root; do not select `backend` as Root Directory.
4. The resource preview must show **one Free Docker web service**, named `skillnex`, with no Render database, disk or paid service.

If you already created a Render service for this repository, update it instead of creating a duplicate: clear its old `backend` Root Directory and use `./Dockerfile` with context `.`. Keep its database credentials and JWT secret. Remove an old Vercel `APP_ORIGIN` override when switching to the Render address.

See [Render Blueprints](https://render.com/docs/infrastructure-as-code) and the [Blueprint reference](https://render.com/docs/blueprint-spec).

## 2. Add private backend settings

The Blueprint prompts for these values. Enter them in Render, not GitHub, frontend files or chat.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon direct/unpooled endpoint in JDBC form: `jdbc:postgresql://YOUR-NEON-HOST:5432/YOUR-DATABASE?sslmode=require` |
| `DATABASE_USER` | Your Neon database role |
| `DATABASE_PASSWORD` | That role's password |
| `AI_API_KEY` | Your existing Gemini API key |
| `AI_MODEL` | A text model available to your Google project |
| `GEMINI_LIVE_MODEL` | A Live model available to your Google project for voice interviews |

Use the host/database and required TLS options from your Neon connection details. The backend's small JDBC pool also runs Flyway migrations, so use the direct/unpooled endpoint for this setup. Do not paste a `psql` command or complete `postgresql://user:password@...` URI into the JDBC field. Username and password are separate variables.

The Blueprint generates `JWT_SECRET` and sets `DEMO_MODE=false` and `SECURE_COOKIE=true`. Keep that JWT secret between ordinary deployments. Do not enable the H2 `demo` Spring profile online.

**No website URL needs to be entered during setup.** The app reads its public origin from Render's automatic `RENDER_EXTERNAL_URL`. For a custom domain, set `APP_ORIGIN` to its exact HTTPS origin without a trailing slash. [Render's default environment variables](https://render.com/docs/environment-variables)

Reuse your existing Neon project. The CLI's local `.env.local` is not automatically uploaded to Render; never upload it to GitHub. Neon setup also does not copy the laptop's H2 accounts, resumes or chats; those need a separate migration. A fresh cloud database receives the application tables and 50 coding questions at backend startup.

## 3. Deploy the whole website

Click **Deploy Blueprint**. Render builds the frontend and backend from the same commit. When deployment succeeds, open the service's actual `https://...onrender.com` address. That is the single SkillNex link to share.

Open `/actuator/health` at that address; it should return `{"status":"UP"}`. If it fails, inspect Render's logs for missing settings, database/TLS errors or memory issues. Do not switch to a demo database to hide an error.

The Blueprint disables automatic code deployments; later code changes need **Manual Deploy > Deploy latest commit**. Blueprint configuration changes can still trigger a sync. There is no separate frontend deployment or Vercel routing step.

## 4. Check the site

- Create an account, log out, log in again, and check saved profile data.
- Refresh `/app/resumes` and a CodeLab/interview room directly.
- Ask two consecutive AI questions and analyze a non-sensitive sample resume.
- Allow microphone/camera for the public HTTPS address and test a real interview. Gemini Live model access and quota must work in your Google account.
- Check CodeLab questions, search, theme and saved drafts.
- In CodeLab, verify Run and Submit with a small correct program in Java, C++ and Python; also check that incorrect output is not accepted.
- Open the public link from another device with your laptop off.

## What is included and what still needs setup

| Part | Status after successful configuration and testing |
| --- | --- |
| Website, login, profiles, resumes, chats and reports | One Render service with persistent data in Neon |
| AI assistant, analysis and AI interviews | Uses your configured Gemini models and quota |
| 50 CodeLab questions, editor and saved drafts | Included |
| CodeLab Run / Submit | Configured to use the shared public Judge0 sandbox; availability and limits are best-effort |
| Password-reset email | Requires a working mail service; not configured here |
| Google sign-in | Requires separate provider configuration |

### CodeLab Run and Submit

The Blueprint connects CodeLab to the official public Judge0 service at `https://ce.judge0.com`. No extra Render service, runner API key or laptop is needed. Java, C++ and Python were checked with harmless programs through its batch API on 2026-10-19. The [official Judge0 repository](https://github.com/judge0/judge0) documents the API; its [language list](https://ce.judge0.com/languages) includes the application's default language IDs.

This is a shared public service, with no guaranteed availability, service-level agreement or fixed free allowance promised by this project. Requests may be limited or unavailable. Failed execution never counts as an accepted solution, and saved drafts remain available in Neon.

Run and Submit send the program's source code and test inputs to `ce.judge0.com` for isolated execution. Account passwords, resumes and AI credentials are not sent. Run checks two examples; Submit checks all six cases. Avoid putting private information or credentials in submitted code.

**For an existing Render service with execution disabled**, set `CODELAB_RUNNER=judge0` and `CODELAB_RUNNER_URL=https://ce.judge0.com` in that service's environment, then save and redeploy. A code-only deployment does not change an existing empty runner URL. For this public endpoint, leave `CODELAB_RUNNER_KEY` and `CODELAB_RAPIDAPI_HOST` unset or empty; clear credentials from a previous runner before switching URLs. If you already use your own working hosted runner, retain its URL and credentials instead of replacing them with these defaults.

The local Docker setup remains separate and is not overwritten by these deployment defaults. It needs the laptop to stay on. Do not expose its unauthenticated port to the internet; cloud execution must remain isolated from the web app and database.

### Password-reset email

Free Render blocks SMTP ports 25, 465 and 587. The Blueprint disables the mail health check; this does not enable email delivery. Test password reset after configuring a supported mail transport.

## Free hosting limits

Render Free sleeps after 15 minutes without traffic; the next visitor may wait about a minute while the whole website wakes. There are monthly quotas, no persistent local disk, and limited memory. The JVM/thread/database-pool settings are conservative defaults, not a capacity guarantee. Test uploads and AI workflows on the actual service. [Render Free documentation](https://render.com/docs/free)

Use Neon for persistent data; Render local files can disappear on restart. Keep database backups and stay within Neon and Gemini account limits. No paid add-on, domain purchase, AI Gateway, Render database or persistent disk is included.

## Local development

The two-terminal VS Code workflow and local Docker Compose workflow remain available. The root Dockerfile is the combined cloud website; `backend/Dockerfile` and `frontend/Dockerfile` still support the existing separate local containers.

The older `scripts/configure-vercel.cjs` is only for an optional separate Vercel deployment. It is not needed for this one-site setup.
