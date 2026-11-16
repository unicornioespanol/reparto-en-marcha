@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js to run the game.
  pause
  exit /b 1
)
if not exist "dist\index.html" (
  call npm.cmd install --cache .tools/npm-cache --no-audit --no-fund
  if errorlevel 1 exit /b 1
  call npm.cmd run build
  if errorlevel 1 exit /b 1
)
echo Reparto en marcha: http://127.0.0.1:4173
echo Keep this window open while playing. Press Ctrl+C to stop.
start "" "http://127.0.0.1:4173"
node scripts/serve.mjs
