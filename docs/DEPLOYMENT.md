# Production deployment

## Configure infrastructure

Use a host with Docker Compose or deploy the frontend and backend containers alongside managed PostgreSQL. Provision a domain and a TLS reverse proxy/load balancer. This repository includes container definitions and CI, but no external account has been created and no public deployment has been performed.

1. Copy `.env.example` to `.env`.
2. Set a random `JWT_SECRET` with at least 32 characters and a strong database password.
3. Set `APP_ORIGIN=https://your-domain.example`, `SECURE_COOKIE=true`, and `DEMO_MODE=false`.
4. Configure AI provider/model credentials, Google OAuth if needed, and SMTP.
5. Run `docker compose up --build -d`.
6. Route your TLS ingress to the local web port. The default port is bound to loopback, not publicly exposed.
7. Verify `docker compose ps`, backend health, signup, a document export, and one authorized live AI workflow.

For a load balancer in front of Nginx, explicitly configure the trusted HTTPS scheme. The included Nginx file uses `$scheme` for local HTTP development; set the proxied `X-Forwarded-Proto` to **https** in the TLS-only production virtual host. Do not trust arbitrary client-supplied forwarding headers. Preserve the external host and port for Google callback generation.

Use TLS from the application to a managed database where required by your provider, for example via its JDBC `sslmode=verify-full` configuration and trusted CA.

## First administrator

Create your account through the normal signup flow, then promote the exact email through your controlled database console:

```sql
UPDATE app_users
SET role = 'ADMIN', token_version = token_version + 1
WHERE email = 'your-verified-admin-email@example.com';
```

Sign in again. Public signup can only create students. Faculty access is granted by an administrator after institutional affiliation has been checked. Do not seed the demo accounts in production.

## Build artifacts

```sh
cd frontend && npm ci && npm run build
cd ../backend && mvn -B verify
```

Frontend output is `frontend/dist`. Backend output is `backend/target/careerx-1.0.0.jar`.

The backend container runs as an unprivileged application user. The frontend uses an unprivileged Nginx image. Only the web port is published by Compose. Database credentials, JWT signing material, SMTP credentials, and AI keys are server-side environment variables.

## Migrations, backups, and rollback

Flyway applies migrations at startup. Back up PostgreSQL before upgrades:

```sh
docker compose exec -T db pg_dump -U careerx -d careerx > careerx-backup.sql
```

This command assumes the default database user; substitute your configured user when different. Use a backup schedule and retention policy appropriate for your environment, and periodically test restoration into a separate database.

Keep versioned container images. Roll back application images only when compatible with the current schema. Database migrations should be forward-only; restore a tested backup if a schema rollback is required.

For object-storage retention of original resumes, add an encrypted private bucket and signed-download authorization. The current implementation stores extracted text, not the original binary.

## Credentials and sessions

- JWT cookies are HTTP-only, SameSite=Lax, and Secure in production.
- Exact Origin validation protects authenticated mutations. Include only the real browser origins in `APP_ORIGIN`.
- Tokens expire after 24 hours; reset, logout, and bans invalidate token versions.
- Passwords use BCrypt. Reset tokens are high-entropy, hashed at rest, expire after 30 minutes, and are single-use.
- Google ID tokens require verified email. Existing password accounts are not silently linked.
- Rotate secrets through your deployment secret manager and restart the backend. Rotating the JWT secret signs everyone out.

## Observability

`/actuator/health` reports basic application/database availability without detailed configuration. AI request records are visible in the admin analytics. Logs avoid dumping user resume text, secrets, or model responses.

Add centralized logs, metrics, alerting, database backups, and an incident-response process before opening registration broadly. Backend AI calls are synchronous and bounded; for higher concurrency move generation to an authenticated job queue.

## Live acceptance checks

These require your own configured services and were not exercised with real external credentials here:

- A live generation and embedding request using the selected model.
- Google callback at the actual HTTPS domain.
- Password-reset email delivery and single-use reset.
- Real-browser microphone permission and speech recognition.
- Container build/run on the deployment host and TLS/proxy configuration.
- Load testing at your expected concurrency, retention review, and vulnerability scanning.
# Peer Practice connectivity

The existing authenticated API handles private two-person rooms and signaling.
Flyway V10 creates the room, membership, signaling, notes, feedback and report
tables. Existing users and features are preserved. HTTPS is required for real
microphone/camera access (localhost is allowed for development).

`PEER_STUN_URL` defaults to Google's public STUN service. Direct WebRTC calls can
work without a relay, but restrictive mobile, corporate or NAT networks require
a TURN server. Configure `PEER_TURN_URLS` (comma-separated turn/turns URLs) and
`PEER_TURN_SECRET` with an existing coturn-compatible REST shared secret. The
backend generates anonymous three-hour credentials covering the two-hour room
and setup time; the shared secret stays server-side. Reconnect fetches fresh credentials.
For managed TURN providers (including Metered), use their TURN URLs with
`PEER_TURN_USERNAME` and `PEER_TURN_PASSWORD` instead, leaving `PEER_TURN_SECRET`
empty. These must be TURN credentials, not the provider's API/admin key.
Include the provider's UDP, TCP and TLS-on-443 URLs to support different networks.
No TURN service is provisioned automatically. Render's web service is not a TURN
relay. Keep these credentials out of source control.

The free [Metered Open Relay plan](https://www.metered.ca/tools/openrelay/)
requires an account for managed credentials. Choose the free plan and check its
current usage allowance before enabling it. Set the three managed TURN variables
in Render's environment, save, redeploy, and reopen the room on both devices.
Do not rely on old shared public TURN credentials without testing them.

Browser regression check: run the frontend dev server and open
`/qa/peer-media.html`. It exercises the actual call and playback code with two
synthetic cameras and audible tones (no physical devices or real user data).
Check devices enabled both before and after joining, camera off/on, reconnect,
and both received audio energy and decoded video frames. To check relay-only ICE,
paste the provider's ICE server JSON into the fixture's password field (kept in
memory only). Test both normal relay selection and TLS-only port 443.
This fixture is not included in the production build.

Calls have two participants, expire after two active hours, and use database
polling for signaling. This is a small-scale practice room, not group conferencing.
Camera and microphone start off. Leaving the page stops local tracks. End the
session before navigating away to flush any final transcript segment.

Transcription uses the existing Gemini audio capability and only starts after
each user opts in. Audio is processed in short segments and is not stored by
SkillNex; transcript text is saved and visible to both participants. Written notes
and each user's AI report remain private. The AI provider still processes any
submitted audio/text under its own data policy. If transcription is unavailable,
users can save written questions/answers for the final analysis.

An analysis needs at least 80 characters of the requesting user's saved content.
It reviews up to 60,000 characters and reports its coverage. New evidence
invalidates previous reports. Peer feedback and AI analysis are available only
after the session ends. No AI assessment of appearance or personality is made.
