# Local Run and Submit

CodeLab supports an isolated local Piston runner for Java, C++ and Python. This uses the Docker Desktop Linux VM and Piston's Isolate sandbox; submissions are never executed directly on Windows and are not sent to a hosted runner. No Gemini/Judge0 key is needed for this mode.

## First setup

1. Install [WSL using Microsoft's instructions](https://learn.microsoft.com/windows/wsl/install). Approve the Windows administrator prompt and restart if Windows asks. Do not turn off Windows security controls to install it.
2. Install and open [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/), using the WSL 2 Linux engine. Complete Docker's first-launch agreement. Wait until its engine is running.
3. Double-click `START-CODELAB.cmd` in the project folder, or run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-codelab-runner.ps1` there. The first run downloads the sandbox and the Java, C++ and Python runtimes. It runs an actual program in each language before writing the private backend configuration. Later starts reuse the installed languages. `-ExecutionPolicy Bypass` applies only to that PowerShell process; it does not change the computer's saved execution policy.
4. Restart the backend with your existing profile, then refresh `/app/codelab`. Docker Desktop must stay running while you use Run/Submit.

If the packaged WSL installer fails with `0x80070005`, Microsoft's signed standalone MSI is an official installation alternative. A successful install still requires the Virtual Machine Platform feature and a working WSL 2 Linux engine before the runner can start.

Current laptop setup (verified 2026-10-03): WSL 2.7.13 and Docker Desktop 4.93.0 are installed, and Docker's Linux engine with cgroup v2 is running. The required Windows restart is complete; no further restart is required for this setup. The local sandbox has Java 15.0.2, GCC 10.2.0 for C++, and Python 3.12.0 installed from the official runtime packages.

## Verification on 2026-10-04

- Recovered an unresponsive Docker Desktop launcher and restarted the existing Linux engine. The same local runner and installed runtime volume were preserved; no reinstall or database reset was needed.
- Real sum programs passed in Python 3.12.0, C++/GCC 10.2.0 and Java 15.0.2. A Java infinite loop was terminated with `TO` after 9.35 seconds of elapsed time (10.031 seconds of accumulated CPU), confirming that the increased Java allowance remains bounded.
- Seven focused `PistonRunnerTest` checks passed, including Java's source-compilation allowance and unchanged Python/C++ run limits.
- Java's package compiles source inside its run stage. It now receives a combined compilation/execution budget of 10 seconds CPU and 15 seconds wall time per case; Python and C++ execution retain 3 seconds CPU and 5 seconds wall time. C++ has a separate compilation budget of 10 seconds. The memory limits remain 256 MiB for execution and 512 MiB for the separate compilation stage. The container's maximum request ceiling accommodates Java; the backend supplies each language's smaller applicable budget.

## Earlier verification on 2026-10-03

- All 18 real backend/API execution checks passed against the local sandbox, using a disposable backend and isolated database. For each language, these covered correct Run, correct Submit, wrong answers, syntax errors, runtime errors and infinite-loop timeouts. No user drafts were written by this verification.
- A correct Run passed both sample cases without marking the question solved. Only a correct Submit passing all six cases updated solved progress; failed submissions did not. Hidden-case input, expected output, actual output and diagnostics were absent from the API response.
- All six focused `PistonRunnerTest` checks passed, including compatibility with Piston's HTTP/1.1 endpoint. Java's source-file launcher and Python report syntax diagnostics under `RUNTIME_ERROR`; C++ reports them under `COMPILATION_ERROR`. The public sample results include the relevant diagnostic text.
- The main backend at `http://127.0.0.1:8080` and frontend at `http://127.0.0.1:5173` were running. Browser inspection confirmed enabled Run/Submit controls and the local sandbox status. Execution was verified through the API; browser Run/Submit clicks were not part of this check.

## Daily startup

1. Open Docker Desktop and wait for its Linux engine to be running.
2. Double-click `START-CODELAB.cmd` in the project folder. Leave Docker Desktop running. The launcher checks the installed runtimes and reports whether the local runner is ready.
3. Start the backend with your existing profile and start the frontend in a separate terminal. If the runner configuration was created or changed while the backend was already running, restart the backend once. Do not start a second backend against the same database.
4. Open the frontend address printed by its terminal, then choose **CodeLab**. Refresh the page if it was open before startup.

To start the runner manually from the project folder:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-codelab-runner.ps1
```

To stop only the runner while keeping installed language packages and saved submissions:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\start-codelab-runner.ps1 -Stop
```

## What the script changes

- Starts only the `skillnex-codelab` Compose project. It does not recreate the database or change account/AI configuration.
- Binds the runner to `127.0.0.1:2000`, not the public network. CodeLab sends only source and test input to it.
- Pins the downloaded official Piston image digest in `runner/.env` and runtime versions in `backend/config/codelab.properties`. Backs up any existing runner config before replacing it.
- Stores installed language packages in a Docker volume. The Piston container requires privileged mode for its internal namespace/cgroup sandbox, as documented upstream; it has no Windows directories or Docker socket mounted.
- Disables networking inside submitted programs and limits process count, CPU time, memory, output and files. There are at most two concurrent jobs. This laptop setup is for local development, not a publicly exposed execution service.

After installation, check correct output, wrong output, compilation errors and infinite loops in all three languages. A correct Run checks examples; only a correct Submit checking all six cases updates solved progress. Output is judged, not variable names.

Upstream setup: [Piston](https://github.com/engineer-man/piston) and its [API](https://github.com/engineer-man/piston/blob/master/docs/api-v2.md). The existing Judge0 adapter is retained for an explicitly configured hosted/Linux runner.
