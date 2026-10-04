# SkillNex: free personal-project deployment

This setup moves the app off your laptop: Vercel serves the frontend, Render runs the Java API, and Neon stores PostgreSQL data. It is preparation for deployment in **your own accounts**. No account, cloud resource or public website is created by these local files.

**Free does not mean always awake.** Render Free sleeps after 15 idle minutes and can take about a minute to restart. It has monthly quotas, an ephemeral filesystem, and no persistent disk. Its free PostgreSQL expires after 30 days, so this configuration uses Neon instead. Free Render also blocks SMTP ports 25, 465 and 587. [Render Free documentation](https://render.com/docs/free)

Vercel Hobby is for personal, non-commercial use. Stay within its quotas; a commercial SkillNex launch needs another eligible hosting plan. [Vercel Hobby terms and limits](https://vercel.com/docs/plans/hobby)

Neon's Free plan currently includes 1 GB of database storage and 100 CU-hours per project per month. Limits can change: confirm the Free plan in your account before creating anything. [Neon Free plan announcement](https://neon.com/blog/neon-free-plan-1-gb-per-project)

## What this setup includes

| Part | Hosting | What to expect |
| --- | --- | --- |
| Website and editor | Vercel Hobby | Public HTTPS frontend |
| Login, profiles, resumes, saved chats and reports | Render API + Neon | Server data persists in PostgreSQL |
| AI assistant, resume/LinkedIn text analysis, interviews | Render + your Gemini account | Requires valid models, key and available Google quota |
| 50 CodeLab questions and saved coding drafts | Render + Neon | Included; independent of interview mode |
| CodeLab Run / Submit | **Separate sandbox still required** | This free deployment does not execute Java/C++/Python submissions |
| Password-reset email | **Not configured** | Do not promise email delivery until a compatible mail service is connected and tested |

Your laptop's Docker runner cannot keep cloud submissions working when that laptop is off. Do not expose its unauthenticated Piston port to the internet. Cloud code execution needs a separately deployed, isolated runner or an explicitly configured hosted runner; no such service or cost is included here.

## 1. Prepare clean source in a private repository

Use a private GitHub repository in your own account. Put the **contents** of the project folder at its root, so GitHub shows `render.yaml`, `backend`, `frontend`, `docs` and `scripts` together. Upload source files, not the ZIP itself.

Keep these out of the repository:

- `.env`, `backend/config/ai.properties`, `database.properties`, `codelab.properties`, `runner/.env` and other filled secrets.
- `backend/data`, `.local-backups`, `.local-run`, `.local-runtime.json`, logs and personal database files.
- `node_modules`, `dist`, `target`, previous ZIPs and generated local manifests.

The supplied `.gitignore` helps, but review the actual upload. Files already committed are not removed just by adding an ignore rule. Enter cloud secrets in Render's environment settings, never in frontend code or `VITE_` variables. If a real secret was ever committed, rotate it before deployment.

## 2. Create the Neon database

1. Sign in to Neon and create a **Free** PostgreSQL project, preferably near the chosen Render region.
2. Create/use one database for SkillNex. Keep its credentials private.
3. Get the **direct/unpooled** database endpoint for the first setup and Flyway migrations. This application already uses a small server connection pool.
4. Prepare these Render variables:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | A PostgreSQL **JDBC** URL, with Neon's required TLS options, for example `jdbc:postgresql://YOUR-NEON-HOST:5432/YOUR-DATABASE?sslmode=require` |
| `DATABASE_USER` | The database role from Neon |
| `DATABASE_PASSWORD` | That role's password |

Do not paste a `psql 'postgresql://user:password@...'` command into `DATABASE_URL`. Use the same host/database and keep the username/password in their separate variables. Retain the TLS options required by your Neon connection instructions; do not disable TLS to resolve an error.

There is no need to manually create the application tables or 50 questions: the backend runs its migrations and question seed on startup. Your laptop's H2 database, accounts, resumes and chats **are not automatically transferred**. Use a new signup on the cloud app; any later data migration must be planned separately.

## 3. Establish the frontend's permanent origin

Create a Vercel Hobby project from the private repository and choose `frontend` as its Root Directory. Use Vite, `npm ci`, `npm run build`, and output directory `dist`.

Record its actual stable Production domain, such as `https://YOUR-PROJECT.vercel.app`. This is the `APP_ORIGIN` used below. Do not use a temporary deployment/preview URL or assume a project name is available before Vercel confirms it.

The frontend and API configuration depend on each other's addresses. At this stage the site may not build or authenticate until its API routing is configured in step 5; it is not a finished deployment yet.

## 4. Create the Render API from the Blueprint

Import the same repository through Render's **Blueprint** flow, using the root `render.yaml`. Review the resource summary: it should contain exactly **one Free Docker web service**, with no Render database, persistent disk or paid service.

The Blueprint uses `rootDir: backend`, Dockerfile `./Dockerfile`, context `.`, and `/actuator/health`. It disables later automatic code deploys with `autoDeployTrigger: off`; **applying it still creates the service and starts its initial deployment**. `sync: false` fields are entered privately during initial setup, and the JWT signing secret is generated by Render. [Blueprint reference](https://render.com/docs/blueprint-spec), [root-directory behavior](https://render.com/docs/monorepo-support)

Fill the requested values:

| Variable | What to enter |
| --- | --- |
| `APP_ORIGIN` | The exact HTTPS Vercel Production origin from step 3, without a trailing slash |
| `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD` | The Neon values from step 2 |
| `AI_API_KEY` | Your own Gemini API key |
| `AI_MODEL` | A text model currently available to that Google project |
| `GEMINI_LIVE_MODEL` | A Live model currently available to that Google project; validate actual access before using voice interviews |

Keep `DEMO_MODE=false` and `SECURE_COOKIE=true`. Do not set `SPRING_PROFILES_ACTIVE=demo`: that selects a local H2 database. Leave the generated `JWT_SECRET` unchanged between ordinary deployments; rotating it signs everyone out.

The Blueprint leaves Google/LinkedIn sign-in unconfigured and disables only the **mail health check**. Signup with email/password works independently of email delivery. Reset requests still show the application's generic response, but no reset email is delivered without a working mail service. Render Free's blocked SMTP ports mean standard SMTP credentials alone may not solve this: a permitted provider port or a future HTTPS email adapter is needed, followed by a real delivery test.

The small-memory JVM, thread and connection settings are conservative starting settings for Render Free. They are **not a verified capacity guarantee**. Check startup and PDF/DOCX/AI workflows for memory errors before inviting users. The current app is intended to use one backend instance.

Wait for deployment to finish. Record the real `https://YOUR-API.onrender.com` address. Its `/actuator/health` must return `{"status":"UP"}` after any cold start. If it fails, inspect Render logs for missing variables or PostgreSQL connection errors; never switch to the demo database to make cloud health appear green.

## 5. Connect the Vercel frontend to that API

Configure the supplied Vercel routing with the exact Render HTTPS origin. The frontend must send requests to its own `/api` path, which Vercel forwards to Render. Do not change browser calls to go directly to a separate API domain: the application uses same-origin cookies and origin checks.

From the project root, substitute the actual Render origin and run:

```powershell
node scripts/configure-vercel.cjs https://YOUR-API.onrender.com
```

This writes `frontend/vercel.json` with the public API origin, same-origin proxy routes and SPA fallback. Commit that generated file without secrets and redeploy the frontend. Recheck `APP_ORIGIN` against the final Vercel Production URL. Only enable optional OAuth after registering callbacks for that same public frontend origin and testing the redirect/forwarded-host behavior.

For later backend code changes, use Render's manual deploy action. In existing Render services, new `sync: false` variables must be added through the service's Environment settings. Keep frontend/backend versions compatible.

## 6. Check the public website

- Open the Vercel Production URL in Chrome over HTTPS, then create your own account.
- Sign out, sign back in and confirm saved profile/resume/chat data returns.
- Refresh a deep route, such as `/app/linkedin`; it should still load the app.
- Ask two consecutive AI questions, then test one resume analysis with non-sensitive sample text.
- Allow microphone/camera on the public origin and test a real interview. Local permissions do not automatically apply to the new domain; API key access and Live model quota must also work.
- Check CodeLab questions, topic search, theme and draft persistence. Run/Submit remains unavailable until a cloud sandbox is connected.
- Wait through an idle period and verify a later visit recovers after the API wakes up. A cold-start timeout can require retrying the page.
- Turn the laptop off and open the public URL from another device. This verifies the app no longer depends on a laptop process.

Use the providers' Free plans and included subdomains. Do not enable paid add-ons, buy a domain or upgrade a plan as part of this setup. Gemini usage has its own model/account limits; hosting being free does not make AI calls unlimited. Keep backups of important database data outside the only live database, and monitor storage/compute quotas.

This document describes a limited free personal deployment, not a promise of uninterrupted production availability or completed cloud verification.
