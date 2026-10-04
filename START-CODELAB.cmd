@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-codelab-runner.ps1"
if errorlevel 1 echo Setup has not completed. Read the message above.
pause
