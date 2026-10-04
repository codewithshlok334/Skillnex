# SkillNex ko doosre system par chalayein

Yeh complete editable source package hai: frontend, backend, latest interview/mic recovery fixes, chat, resumes, LinkedIn review, CodeLab ke 50 DSA questions, Java/C++/Python solutions, tests, database migrations, images aur launchers included hain. Project ko dobara banane ki zaroorat nahi.

## 1. Extract aur prerequisites

ZIP ko poora extract karein, phir `SkillNex` folder ke andar `SkillNex.code-workspace` VS Code mein open karein. Seedha ZIP viewer se launch mat karein.

Naye Windows system par install karein:

- Node.js 22.12+ ya 24, npm ke saath.
- Java JDK 21. `JAVA_HOME` JDK folder par set hona chahiye.
- Maven 3.9+, PATH mein available. Project mein Maven wrapper nahi hai.
- Google Chrome, interview microphone/camera test ke liye.
- CodeLab Run/Submit ke liye Docker Desktop ka WSL 2 Linux engine; [setup guide](docs/CODELAB-LOCAL.md) follow karein. Sirf website, resume builder aur guided practice kholne ke liye Docker zaroori nahi.

Install karne ke baad VS Code restart karein. Terminal mein versions check karein:

```powershell
node --version
npm.cmd --version
java -version
mvn.cmd -version
```

## 2. Frontend dependencies — pehli baar

VS Code terminal ko extracted `SkillNex` folder par rakhkar:

```powershell
cd frontend
npm.cmd ci
cd ..
```

First setup ke liye internet chahiye. `node_modules`, Maven cache, Docker image aur installed language runtimes ZIP mein bundled nahi hain. Naye system par ye download honge.

## 3. Gemini AI configure karein

`backend/config/ai.gemini.properties.example` ki copy isi folder mein **ai.properties** naam se save karein. Local file mein `app.ai.key` ke aage apni Gemini API key aur `app.ai.model` ke aage apne account ka supported Gemini model ID daalein. Key ko frontend ya share ki jaane wali ZIP mein mat rakhein.

Gemini template is app ke compatible chat endpoint ke liye configured hai. Base URL `https://generativelanguage.googleapis.com/v1beta/openai` rahega; app khud `/chat/completions` append karta hai. Google ke [official compatibility guide](https://ai.google.dev/gemini-api/docs/openai) mein endpoint aur supported usage diya hai.

Live interview ka `app.ai.live-model` text model se alag hai. Template ko apne Google project mein available Live model ke saath configure karein; provider access aur quota naye account par alag ho sakte hain. Detailed flow: [Gemini Live interview](docs/GEMINI-LIVE-INTERVIEW.md). Bina provider configuration ke normal AI replies nahi aayenge; guided practice aur non-AI tools available rahenge.

Config backend start karne se pehle save karein. Baad mein badlein toh sirf existing backend ko stop karke restart karein; second backend same database par mat kholein.

## 4. CodeLab — pehla setup

1. Docker Desktop open karein aur Linux engine ready hone dein.
2. Project ke `START-CODELAB.cmd` ko double-click karein.
3. Pehli baar sandbox aur Java, C++ aur Python runtimes download honge. Ismein waqt aur disk space lag sakta hai; download complete hone dein.
4. Script har language ka real program check karke `backend/config/codelab.properties` banayegi. Success message aane ke baad backend start karein.

Run/Submit ke liye Docker chalta rehna chahiye. Is mode ko Judge0/RapidAPI/Gemini runner key nahi chahiye. Website ke Java backend ko JDK 21 chahiye; sandbox ke language versions alag hote hain. Naye system ke downloaded versions setup script detect karti hai.

## 5. Website start karein

Windows par **START-SKILLNEX.cmd** double-click karein. Dono services ready hone ke baad:

**http://127.0.0.1:5173/login**

`Student demo` choose karein, ya apna naya account banayein. Sample login: `student@careerx.demo`, password `CareerX-demo-2026!`. Launcher window close karne se background servers band nahi hote. Already-running same project ko launcher reuse karta hai.

Alternative — do VS Code terminals use karein, taaki Ctrl+C se har server stop kar sakein:

Terminal 1, project root se:

```powershell
cd backend
mvn.cmd spring-boot:run "-Dspring-boot.run.profiles=demo"
```

Terminal 2, project root se:

```powershell
cd frontend
npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

Mac/Linux par `.cmd` launcher ke badle manual commands use karein: `mvn` aur `npm` se `.cmd` suffix hata dein. Windows CodeLab setup script ke liye Windows/PowerShell chahiye; alternate deployment instructions `docs/` mein hain.

## 6. Saved data aur sharing

Fresh demo setup persistent H2 database `backend/data` mein banata hai. Sample accounts, migrations aur 50 coding questions automatically load hote hain. Is mode mein alag PostgreSQL database manually banana nahi padta. PostgreSQL deployment files bhi included hain; unka setup [README](README.md) mein hai.

Shareable ZIP mein purane private accounts, resumes, chats, submissions, API keys, `.env`, local backups aur machine-specific paths nahi hain. Isliye doosre system par purana personal login/data apne aap transfer nahi hoga. Existing personal data migrate karna ho toh [UPDATE_AND_CHECK.md](UPDATE_AND_CHECK.md) follow karein; running database file ko seedha copy mat karein.

## 7. Demo se pehle check

- Login, logout aur login dobara karke saved work dekhein.
- AI assistant mein do consecutive questions bhejein.
- Interview mein actual laptop/headset microphone select karke 10 seconds bolkar test karein; Chrome microphone permission allow honi chahiye. Live voice fail ho toh **Continue with Text** se direct mic transcription aur typing available hain.
- CodeLab mein Java/C++/Python Run/Submit try karein. Expected output check hota hai; variable names alag rakh sakte hain.

4 October 2026 ke source checks: frontend build, 68 frontend tests aur 62 backend tests pass hue. Original laptop par browser login/data recovery, interview answer/next question/report, Python Run 2/2, Python/Java Submit 6/6 aur C++ execution verify hue. Synthetic audio transcription test pass hua; yeh naye computer ke physical microphone ya full live conversation ki guarantee nahi hai.

## Troubleshooting

- **Site can't be reached:** launcher ka readiness message check karein. Website port 5173 hai; 8080 backend API hai. Logs `.local-run/` mein hain.
- **Port already in use / database locked:** doosra existing project/server stop karein; database delete mat karein. Ports 5173, 8080 aur runner 2000 use hote hain.
- **AI unavailable:** local `ai.properties`, supported model, internet aur provider quota check karein. Key configure karne ke baad backend restart chahiye.
- **Code runner offline:** Docker engine open rakhein; `START-CODELAB.cmd` complete hone dein. First-time runner config backend start hone ke baad bani ho toh backend restart karein.
- **Mic silent:** correct hardware input choose karein; virtual microphone select hone par awaaz nahi mil sakti. Typing fallback available hai.

Yeh localhost demo setup hai. Iske demo accounts ya local runner ko directly public internet par expose na karein; public deployment alag configuration use karta hai.
