@echo off
title SkillNex - Local start
node "%~dp0scripts\start-skillnex.cjs"
if errorlevel 1 echo SkillNex could not fully start. See the message above and .local-run logs.
pause
