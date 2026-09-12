@echo off
setlocal

cd /d "%~dp0"
start "Process Garden Web Server" cmd /k "cd /d "%~dp0" && npm run dev"
timeout /t 3 /nobreak >nul
start "" "http://127.0.0.1:1420"

exit /b 0
