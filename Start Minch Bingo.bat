@echo off
title Minch Bingo - Desktop App
cd /d "%~dp0"

echo.
echo  ========================================
echo    Minch Bingo - Desktop Application
echo  ========================================
echo.

if not exist "node_modules\" (
  echo [1/2] Installing dependencies... (first run only)
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR: npm install failed. Make sure Node.js is installed.
    echo Download: https://nodejs.org
    pause
    exit /b 1
  )
)

echo [2/2] Starting desktop app...
echo.
echo  Login credentials:
echo    Agent:  agent  / agent123
echo    Admin:  admin  / admin123
echo.

call npm run desktop:dev

if errorlevel 1 (
  echo.
  echo App closed with an error.
  pause
)
