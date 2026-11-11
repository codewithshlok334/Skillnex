# SkillNex CodeLab

CodeLab is a separate practice area at `/app/codelab`. It does not call the interview or Gemini services. Open CodeLab from the main sidebar; the sidebar then hides to give the workspace more width. Use **Back to SkillNex** to return.

## Included

- 100 DSA questions across arrays, linked lists, strings, hashing, two pointers, prefix sums, sliding windows, stacks, binary search, sorting, greedy algorithms, dynamic programming, graphs, trees and bit manipulation. Original IDs 1–50 are unchanged; IDs 51–100 add a classic reference set of 15 Easy, 25 Medium and 10 Hard problems.
- Exactly Java, C++ and Python: 300 complete reference solutions and 661 test cases. Each question has starters, exactly two examples, a variable number of hidden cases, progressive hints and an explanation.
- The new problems link to their official references in the UI and in [references.json](../scripts/codelab_bank/references.json). Descriptions, solutions and test cases are authored for SkillNex, with explicit standard-input/standard-output adapters rather than copied LeetCode function APIs.
- Search by title or topic (including `DP` and `binarysearch` aliases), topic/level/progress filters, a syntax-highlighted editor, account-owned drafts per language, submission history and solved progress.
- On desktop, the question stays on the left and the editor on the right, with independent scrolling. Narrow screens use Question/Code tabs.
- The top Settings button includes Dark/Light appearance, editor font size, default language, indentation and line wrapping, plus account/profile/privacy/password recovery and logout controls. Appearance/editor preferences persist on the current browser. Drafts remain account-owned in the database. Changing the default language does not replace the active editor.
- Run checks the two examples. Submit checks every example and hidden case for that question. Only an accepted **Submit** marks the question solved.
- Each unique first accepted Submit immediately earns **1 SkillCoin**. Runs, wrong answers and repeat accepted submissions award no extra coin. Existing accepted problems count toward the total.
- Profile progress includes current/best daily streaks and the green activity calendar. Shared achievement stickers unlock from CodeLab milestones or Aptitude mock scores, stay on the profile and trigger a 5.5-second celebration. Aptitude never awards SkillCoins. See [all reward criteria](APTITUDE-AND-ACHIEVEMENTS.md).
- Programs read standard input and print their answer. Java uses `public class Main`; other variable names and implementation choices are unrestricted. Judging checks answers, not source code. Depending on the problem, checkers compare ordered tokens, accept any valid index pair, ignore result-row order, ignore group/member order, or compare token multisets. Each statement specifies the required format and which ordering is flexible.

## Run the application

Keep the existing backend configuration and data directory. From the backend folder, use the same startup profile as before. For the existing local H2 setup:

```powershell
mvn spring-boot:run "-Dspring-boot.run.profiles=demo"
```

In a second terminal, from the frontend folder:

```powershell
npm ci
npm run dev -- --host 127.0.0.1 --strictPort
```

Open `http://127.0.0.1:5173/app/codelab` and sign in. Migration V9 adds the CodeLab tables and the startup loader imports the bank. Accounts and existing application data are retained. The backend must remain running.

## Connect real code execution

Run and Submit require an isolated sandbox. For the selected **local Windows setup**, use [CODELAB-LOCAL.md](CODELAB-LOCAL.md) and `START-CODELAB.cmd`; this configures Piston inside the Docker Linux VM and pins its installed Java/C++/Python versions after real execution checks. The backend checks runtime availability, and the UI refreshes runner status automatically. No key or hosted execution service is needed in local mode.

The **Judge0 CE adapter** remains available for an explicitly configured hosted or Linux sandbox. Both modes keep execution disabled without a usable connection; the application never pretends code has passed and never executes user submissions directly on the web server or Windows host.

Copy `backend/config/codelab.properties.example` to `backend/config/codelab.properties`, then set the URL and credential of a runner you control or a hosted runner you choose. Restart the backend. Keep this file private; it is ignored by Git. No runner key belongs in the frontend.

For a local runner, the example URL is `http://127.0.0.1:2358`. For a hosted service use its HTTPS URL and key. Set `app.codelab.rapidapi-host` only for a RapidAPI deployment. Language IDs default to Java 62, C++ 54 and Python 71; check your provider's `/languages` response and change the three IDs if needed. Only these three mapped choices are exposed to users.

The official self-hosted runner uses Linux and Docker. Windows Docker support requires a compatible Linux VM/WSL environment; installing Docker alone does not prove that Judge0's sandbox works. Follow the [official deployment requirements](https://github.com/judge0/judge0/releases/tag/v1.13.1) on an isolated runner host. Do not expose the runner port publicly without authentication. The app sends source code and test input to the configured runner, never account passwords, resumes or AI keys.

Each Judge0 test has a 3-second CPU limit, 10-second wall limit, 256 MiB memory limit, 64 KiB file/output limit and no network access. The local Piston runner uses the same CPU/run-memory/output limits, a 5-second run wall limit and a 512 MiB/10-second compile limit. The backend polls jobs asynchronously, allows one pending job per account, limits request frequency and keeps hidden inputs, expected answers and diagnostics private. Runner errors never count as accepted. The current queue is intended for one backend instance; use a durable shared worker queue before horizontally scaling the app.

## Database

CodeLab uses the same database as SkillNex sign-in, with separate `code_*` tables. Questions, three-language solutions, test cases, drafts, submission source and results are stored in the database. Password handling remains with the existing hashed-password authentication flow.

V9 supports PostgreSQL and the existing local H2 profile. The root `compose.yml` already provisions your own PostgreSQL database with a persistent volume. The local `demo` profile still uses `backend/data/careerx-demo.mv.db`; adding CodeLab does not automatically migrate those accounts into a new PostgreSQL server. Back up and migrate that data before changing the live datasource. Never remove the H2 data folder to fix a startup problem.

## Maintaining the bank

The authored source is in `scripts/build_codelab_bank.py` and `scripts/codelab_bank/`; official reference metadata is in `scripts/codelab_bank/references.json`. Rebuild `backend/src/main/resources/codelab/questions.json` with:

```powershell
python scripts/build_codelab_bank.py
```

The loader inserts missing questions only. Editing an already-installed question requires a reviewed database/content migration; it must not silently alter previously judged submissions. Keep IDs stable.

`scripts/validate_codelab_bank.py` compiles and executes only the trusted reference solutions. It is a developer verification tool, never a user submission runner. Its optional `--cpp-syntax-only` mode performs Java/Python execution checks and C++ compile checks without running generated native executables.

## Verification

- Backend: 109 tests passed with the local Asia/Kolkata time zone, including append/restart retention, hidden-case privacy and UTC completion-time regression. Frontend: build and all 106 tests passed.

- The new 50 questions passed 100 manually checked example assertions and 5,545 independent randomized checks: 1,125 Easy, 2,500 Medium and 1,920 Hard.
- All 100 reference programs in each language passed their 661 stored cases: 1,983 executions across Java, C++ and Python. Java/Python ran locally; C++ ran on Judge0 CE in ten batches. All 100 original C++ sources also passed C++17 compile checks. The validator still distinguishes execution from its optional syntax-only checks.
- CodeLab stores new completion times in UTC so local time zones do not shift today’s solve into tomorrow’s activity calendar.
- Live sandbox execution remains a separate deployment check; reference checks do not prove that a newly configured runner is available.

Before inviting users, connect the sandbox and check a correct program, wrong output, syntax error and infinite loop in all three languages; verify a saved draft remains after signing out and back in.
