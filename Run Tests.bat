@echo off
title Minch Bingo - Tests
cd /d "%~dp0"

echo.
echo  Running Minch Bingo smoke tests...
echo.

if not exist "node_modules\" call npm install

:: Start Next.js in background if not running
curl -s http://localhost:3000 >nul 2>&1
if errorlevel 1 (
  echo Starting preview server...
  start /B npm run dev:next
  timeout /t 8 /nobreak >nul
)

call npm run test:smoke

echo.
pause
