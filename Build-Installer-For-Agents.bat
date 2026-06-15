@echo off
title TEBIB-Bingo - Build installer for agents
cd /d "%~dp0"

echo.
echo  Building installer for agents...
echo  This takes a few minutes. Do not close this window.
echo.

call npm run pack:win
if errorlevel 1 (
  echo.
  echo  BUILD FAILED - read the errors above.
  pause
  exit /b 1
)

echo.
echo  Opening release folder...
if exist "release\" (
  start "" "%~dp0release"
  dir /b "%~dp0release\*.exe" 2>nul
) else (
  echo  ERROR: release folder not found.
)

echo.
echo  Send agents: TEBIB-Bingo-Setup-1.0.0.exe + AGENTS-QUICK-GUIDE.txt
pause
