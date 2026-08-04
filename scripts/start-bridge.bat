@echo off
cd /d "%~dp0.."
echo Stopping any existing bridge instances...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0stop-bridge.ps1"
if not exist logs mkdir logs
echo Starting bridge in background...
echo Log file: logs\bridge-bg.log
wscript.exe "%~dp0start-hidden.vbs"
timeout /t 3 /nobreak >nul
powershell -NoProfile -Command "Get-Content -Path 'logs\bridge-bg.log' -Tail 5 -ErrorAction SilentlyContinue"
