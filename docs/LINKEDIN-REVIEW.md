# LinkedIn connection and profile review

Open **LinkedIn review** in the SkillNex workspace sidebar (`/app/linkedin`). Existing accounts, sign-in, resumes and interviews remain unchanged. The feature adds migration V8 for a basic LinkedIn connection, temporary OAuth state and optional private reports.

## What works without LinkedIn credentials

### Use a saved SkillNex resume (recommended)

Choose a resume already uploaded or built in SkillNex and press **Use selected resume**. Only resumes belonging to the signed-in account are listed and readable. Loading the preview makes no AI request. Review/edit the loaded text, remove private details, enter a target role and approve sending the preview to the displayed AI provider. The LinkedIn URL is optional in this mode; links without `https://` are normalized automatically.

Press **Generate LinkedIn suggestions**. The dedicated resume prompt drafts Headline, About, Experience and Skills using only the approved preview. It does not fetch or assess the actual LinkedIn profile. The report is visibly labelled **Source: Resume**, including when saved and reopened. The selected resume is checked for ownership again before AI runs. Only the edited preview and target role are sent, not the unedited stored resume, resume ID, filename or profile URL. Changing the source, role or preview clears consent. Loading a new selection requires pressing **Use selected resume** again.

Saving the report is optional. Your existing resume remains stored as before; editing the preview does not edit it or create another stored copy of the preview. The optional report retains excerpts and a source label, and can be deleted. A dedicated prompt and the existing V8 report table support this feature; there is no additional database migration or LinkedIn API requirement. Configure the existing AI provider as usual. The optional LinkedIn connection panel is hidden until OAuth is configured or already connected.

### Review pasted LinkedIn text or a profile PDF

Paste your LinkedIn profile URL, select a target role, and paste profile text or import a text-based PDF (5 MB / 30 pages maximum). PDF extraction is local to the SkillNex server and does not call AI or create a resume record. Review the extracted text and remove private information. Explicitly approve sending the preview and role to the displayed AI provider, then choose **Analyse profile**.

The URL is a reference, not a source scraper or proof of ownership. Neither the URL nor the imported OAuth profile is sent to AI. Only the previewed text and target role are sent, using the existing backend AI configuration. Results include headline/About/experience/skills feedback, exact supporting excerpts, suggested wording, conditional keywords and prioritized actions. An absent section is labelled **Not provided**, not treated as a defect in the actual LinkedIn profile. Suggestions must be reviewed for accuracy.

Saving is unchecked by default. Without saving, the report and draft exist only on the current page and disappear on navigation/reload. **Clear draft** clears the page; saved reviews remain separately accessible. Saving retains the report (including excerpts), URL, role, consent version and timestamp for the signed-in owner. Delete controls remove the saved report. Raw uploaded files and full input text are not retained in the database. AI usage logs contain the task/success flag, not profile text. Submitted content is still processed under the configured AI provider's policies; do not promise zero provider retention.

## Enable Connect with LinkedIn

1. In the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps), create/configure your application and request the **Sign In with LinkedIn using OpenID Connect** product. Complete LinkedIn's app/Page verification and approval steps if requested. This integration asks only for `openid profile`, not email, messages or posting permissions.
2. Register an exact callback URL on the **same origin as the website**: `https://your-skillnex-domain.example/api/linkedin/callback`. The reverse proxy must forward `/api` to the backend, as the supplied Vite/Nginx setup does. Do not use a separate API hostname: the flow binds to the existing SkillNex cookie. Use the same hostname consistently (localhost and 127.0.0.1 are different).
3. LinkedIn documents HTTPS redirects. For local development, the code permits loopback HTTP callbacks such as `http://127.0.0.1:5173/api/linkedin/callback`, but use it only if the Developer Portal accepts that exact redirect. Otherwise use an approved HTTPS development origin and configure APP_ORIGIN/secure cookies for it. Never disable TLS checks or expose a development server just to bypass this requirement.
4. Add the following to private `backend/config/ai.properties` (not the example file), or set the matching environment variables:

```properties
app.linkedin.client-id=YOUR_LINKEDIN_CLIENT_ID
app.linkedin.client-secret=YOUR_LINKEDIN_CLIENT_SECRET
app.linkedin.redirect-uri=https://your-skillnex-domain.example/api/linkedin/callback
```

Environment equivalents: `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`. Docker reads these from your private `.env`. Never put secrets in frontend/VITE variables, screenshots, source control or chat.

5. Restart the backend and refresh the LinkedIn review page. The connect button becomes available when all three values are configured with a valid redirect. This checks configuration presence, not that LinkedIn has approved the application.
6. Sign into SkillNex first. Choose **Connect with LinkedIn**, read the basic-profile consent and continue. Enter credentials only on LinkedIn's own domain. The callback imports the account identifier and name after validating the signed ID token and matching userinfo subject. It does not create/merge a SkillNex login account, verify identity, or infer that the manually pasted URL belongs to this member.

## Access limitation

Normal OIDC sign-in does **not** provide About, full experience or skills. Connecting does not unlock URL-only analysis. This implementation deliberately uses PDF/text for the substantive review. Detailed profile integration requires additional approved products/permissions and a future adapter for those actual fields; do not enable arbitrary scopes or scrape behind login as a substitute.

## Connection security and disconnect

- Authenticated, trusted-origin POST to begin. Ten connection attempts per hour per user.
- Random state and nonce, 10-minute expiry, hashed state, binding to both SkillNex user and current session cookie. A new attempt invalidates the previous one.
- Single-use state is consumed before token exchange, including cancellation/provider failure. Invalid/replayed/cross-user callbacks cannot connect.
- Fixed HTTPS provider endpoints, no redirects for token exchange, backend-only secret, signature/issuer/audience/expiry/nonce validation and userinfo subject match.
- Access/ID tokens remain in request memory only; no token is stored in the browser or database. No email, remote photo, contacts or messages are retained.
- Responses are `no-store`; callback errors never expose provider bodies, codes or tokens. Configure production proxy/access logs to redact query strings on `/api/linkedin/callback`, and avoid debug HTTP logging.
- Disconnect removes the basic snapshot and pending attempts. An already in-flight callback cannot reattach after disconnect. Saved analysis reports are independent and can be deleted separately.
- Local disconnect does not claim to revoke LinkedIn's grant. The user can remove SkillNex from LinkedIn's permitted services to withdraw that authorization as well. No background sync is implemented.

## Verification

Automated tests cover consent/auth/origin checks, owner and session binding, expiry/cancellation/replay, provider failure, disconnect races, private optional report storage, deletion, grounded evidence and memory-only PDF extraction. A real LinkedIn authorization requires app credentials/approval and a user-completed provider login; without those, it must be reported as unverified. No LinkedIn password is ever requested by SkillNex.

References: [OIDC product and fields](https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2), [authorization code flow](https://learn.microsoft.com/en-us/linkedin/shared/authentication/authorization-code-flow), [restricted Profile API](https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api).
