@echo off
title TEBIB-Bingo - Desktop App
cd /d "%~dp0"

echo.
echo  ========================================
echo    TEBIB-Bingo - Desktop Application
echo  ========================================
echo.

if not exist "node_modules\" (
  echo [1/4] Installing dependencies... (first run only)
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed. Install Node.js 20 LTS from https://nodejs.org
    pause
    exit /b 1
  )
  echo [2/4] Rebuilding native modules for Electron...
  call npx electron-builder install-app-deps
  if errorlevel 1 (
    echo ERROR: native rebuild failed. Install Visual Studio Build Tools, then retry.
    pause
    exit /b 1
  )
) else (
  echo [1/4] Dependencies OK
)

echo [2/4] Building desktop backend...
call npm run build:electron
if errorlevel 1 (
  echo ERROR: build failed
  pause
  exit /b 1
)

echo [3/4] Starting UI server in a new window...
echo.
echo  Keep the "TEBIB-Bingo UI Server" window OPEN while you play.
echo  Login: agent / agent123  or  admin / admin123
echo.

start "TEBIB-Bingo UI Server" cmd /k "cd /d %~dp0 && npm run web"

echo Waiting 30 seconds for Next.js to start...
timeout /t 30 /nobreak >nul

echo [4/4] Opening desktop window...
call npm run electron:only

if errorlevel 1 (
  echo.
  echo If the window did not open, use TWO terminals manually:
  echo   Terminal 1: npm run web
  echo   Terminal 2: npm run electron:only
  echo.
  echo See docs/QUICK-START.md for the full process.
  pause
)
