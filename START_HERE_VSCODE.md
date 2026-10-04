# SkillNex ko VS Code mein run karein

## Is laptop par quick start

Project folder mein **START-SKILLNEX.cmd** double-click karein. Yeh backend aur frontend start karke ready hone ka wait karta hai; phir **http://127.0.0.1:5173** kholein. Already running project ko dobara start nahi karta, aur occupied port par doosra URL choose nahi karta. Start window close kar sakte hain. Startup fail ho toh `.local-run/backend.log`, `backend-error.log`, `frontend.log` aur `frontend-error.log` check karein.

Launcher Node.js se Java/Maven aur Vite directly start karta hai; PowerShell worker files ki zaroorat nahi. Existing servers ka project verify karne ke liye read-only process inspection hota hai. Frontend dependencies missing hon toh pehle frontend folder mein `npm.cmd ci` chalayein.

Coding ke **Run / Submit** ke liye Docker Desktop open rakhein aur **START-CODELAB.cmd** chalayein. Existing languages aur saved submissions dobara start karne par rehte hain. Java/Maven ke portable paths isi laptop ki private `.local-runtime.json` mein configured ho sakte hain; doosre laptop par neeche prerequisites follow karein.

`backend/data`, `backend/config/ai.properties` aur apni private config files preserve karein. Inhe replacement files ke saath delete ya share na karein.

ZIP extract karke `SkillNex.code-workspace` ko VS Code mein open karein, ya **File > Open Folder** se extracted `SkillNex` folder choose karein (purani copy ka naam `careerx` ho sakta hai). Doosre computer ke complete steps [NEW-SYSTEM-SETUP.md](NEW-SYSTEM-SETUP.md) mein hain. Yeh complete editable source project hai; Java, Node, downloaded dependencies aur private user data ZIP mein bundled nahi hain.

## 1. Prerequisites

- Java JDK 21, with `JAVA_HOME` set to the JDK folder.
- Maven 3.9 or newer, available as `mvn`.
- Node.js 22.12+ or 24, with npm.

Installation ke baad VS Code restart karein. Terminal mein `java -version`, `mvn -version`, aur `node --version` check karein. First dependency installation ke liye internet chahiye.

## 2. Backend start karein

VS Code ke first PowerShell terminal mein, project root se:

```powershell
cd backend
mvn.cmd spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Backend `http://127.0.0.1:8080` par start hoga. Demo mode ke liye PostgreSQL ya Docker install karna zaroori nahi: local H2 database automatically create hota hai. Data `backend/data` mein save hota hai. Is folder ko delete karne se local saved data delete ho jayega.

## 3. Frontend start karein

Second terminal open karein, project root se:

```powershell
cd frontend
npm.cmd ci
npm.cmd run dev
```

Open **http://127.0.0.1:5173/demo**. Demo login: `student@careerx.demo`, password `CareerX-demo-2026!`.

Alternative: **Terminal > Run Task > SkillNex: install frontend dependencies** once, phir **SkillNex: run both servers**. Dono server terminals ko running rakhein. Stop karne ke liye har terminal mein Ctrl+C use karein. Agar existing SkillNex already running hai, pehle usko stop karein; port 8080 aur 5173 free hone chahiye.

## 4. Live AI assistant connect karein

Sidebar mein **AI assistant** open karein. Chat history, follow-up questions, optional profile context, aur Hindi/Hinglish support implemented hain. Real replies ke liye aapke AI provider ka valid API key aur model chahiye. Chat mein key paste na karein.

1. `backend/config/ai.properties.example` ko copy karke same folder mein `ai.properties` naam se save karein.
2. Us local file mein `app.ai.provider`, `app.ai.base-url`, `app.ai.key`, aur `app.ai.model` fill karein. Apne provider ke documented endpoint aur supported model ID use karein.
3. Compatible chat-completions provider ke liye `compatible`; Anthropic Messages provider ke liye `anthropic` choose karein. Base URL mein final `/chat/completions` ya `/messages` path add na karein; backend append karta hai.
4. Backend restart karein, assistant page par **Check connection** click karein, phir apna message send karein. “Provider configured” sirf configuration detect karta hai; successful reply live connectivity verify karti hai.

Key server par rahegi. `ai.properties` Git aur Docker build se excluded hai: ise share na karein. Environment variables `AI_API_KEY`, `AI_MODEL`, `AI_PROVIDER`, aur `AI_BASE_URL` bhi supported hain; local properties file use kar rahe hain toh uske values take priority. Provider ke charges/rate limits us account par apply honge.

Assistant sirf conversational advice deta hai. Woh automatically resume edit, interview schedule, ya web browse nahi karta. Last 6 chat exchanges context mein bheje jaate hain; 50 replies ke baad new chat start karein. Profile checkbox select karne par course, branch, career goal, skills aur projects provider ko bheje jaate hain. Resume uploads automatically chat mein attach nahi hote.

Bina AI key ke guided interview practice aur baaki non-AI workflows chalenge. AI replies fabricate nahi kiye jaate.

## 5. Code kahan hai?

### LinkedIn review (new)

Login ke baad sidebar mein **LinkedIn review** kholein. Profile URL, target role aur PDF/text preview provide karein, AI consent select karein, phir **Analyse profile** press karein. Existing Gemini configuration is analysis ke liye sufficient hai. Report save karna optional hai.

**Connect with LinkedIn** ke liye alag LinkedIn developer app credentials aur approval chahiye. Isse basic profile connect hoti hai; full profile URL-only analysis unlock nahi hota. Setup ke liye `docs/LINKEDIN-REVIEW.md` padhein. Frontend page `frontend/src/pages/LinkedIn.tsx`, backend endpoints `backend/src/main/java/com/careerx/controller/LinkedInController.java`, aur new database migration V8 included hain.

Purana data aur Gemini configuration transfer karne ke liye pehle `UPDATE_AND_CHECK.md` follow karein.

| Folder / file                                                           | Purpose                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `frontend/src/pages/Assistant.tsx`                                      | AI chat page and conversation UI                                     |
| `frontend/src/pages/`                                                   | Dashboard, resumes, builder, interviews, community and other screens |
| `frontend/src/assistant.css`                                            | Responsive assistant styling                                         |
| `frontend/src/components/`                                              | Shared UI components                                                 |
| `backend/src/main/java/com/careerx/controller/AssistantController.java` | Private chat history, messages, and AI endpoint                      |
| `backend/src/main/java/com/careerx/ai/`                                 | AI provider adapters and services                                    |
| `backend/src/main/resources/prompts/`                                   | AI instructions                                                      |
| `backend/src/main/resources/db/migration/`                              | Versioned database schema                                            |
| `backend/src/test/`                                                     | Backend regression tests                                             |
| `.vscode/tasks.json`                                                    | VS Code run tasks                                                    |
| `compose.yml`, Dockerfiles                                              | PostgreSQL and container deployment setup                            |
| `docs/`                                                                 | API, architecture, deployment, verification                          |

## Checks and troubleshooting

Frontend folder: `npm.cmd run build` and `npm.cmd test`.

Backend folder: `mvn.cmd test`.

- **AI not connected:** fill the local provider configuration and restart the backend.
- **AI configured but request fails:** check the key, provider base URL, model support, quota, and server logs. Keys must never appear in shared screenshots or logs.
- **429 / too many requests:** the app allows 15 AI requests per user per hour across AI tools. Wait for the limit to reset.
- **Port already in use:** stop the previous local server before starting another instance.
- **Backend fails before startup:** check JDK 21, Maven output, and available ports. Do not delete saved data as a troubleshooting shortcut.

Production setup, PostgreSQL, Google login, and email delivery are documented in `README.md` and `docs/DEPLOYMENT.md`. Local demo credentials are for local use only.
