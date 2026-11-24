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
  echo Installing project dependencies...
  call npm.cmd install
  if errorlevel 1 (
    echo Dependency installation failed.
    pause
    exit /b 1
  )
)

call npm.cmd run build
if errorlevel 1 (
  echo Frontend build failed.
  pause
  exit /b 1
)

call npm.cmd run office-server
if errorlevel 1 pause
