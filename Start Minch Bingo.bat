@echo off
title TEBIB-Bingo - Desktop App
cd /d "%~dp0"

echo.
echo  ========================================
echo    TEBIB-Bingo - Desktop Application
echo  ========================================
echo.

if not exist "node_modules\" (
  echo [1/3] Installing dependencies... (first run only)
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed. Install Node.js 20 LTS from https://nodejs.org
    pause
    exit /b 1
  )
)

echo [2/3] Building desktop backend...
call npm run build:electron
if errorlevel 1 (
  echo ERROR: build failed
  pause
  exit /b 1
)

echo [3/3] Starting UI server + desktop window...
echo.
echo  First launch can take 1-3 minutes. Please wait.
echo  Login: agent / agent123  or  admin / admin123
echo.

REM Start Next.js in a separate window so it keeps running
start "TEBIB-Bingo UI Server" cmd /k "npm run web"

REM Wait for Next.js to compile (adjust if your PC is slow)
echo Waiting 25 seconds for Next.js to start...
timeout /t 25 /nobreak >nul

REM Launch Electron (connects to localhost:3000)
call npm run electron:only

if errorlevel 1 (
  echo.
  echo If the window did not open, run these in TWO terminals:
  echo   Terminal 1: npm run web
  echo   Terminal 2: npm run electron:only
  pause
)
