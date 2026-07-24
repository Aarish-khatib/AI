@echo off
title Limitless AI Local Agent
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install the current LTS version from https://nodejs.org/
  echo Then run this file again.
  pause
  exit /b 1
)
cd /d "%~dp0"
node server.mjs --desktop
pause
