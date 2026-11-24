@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is required. Install Node.js LTS and try again.
  pause
  exit /b 1
)

if not exist "node_modules\express\package.json" (
  echo Server dependency is missing. Run npm install in this project folder first.
  pause
  exit /b 1
)

call npm.cmd run office-server
if errorlevel 1 pause
