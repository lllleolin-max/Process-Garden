@echo off
setlocal

set "APP=%~dp0release\Process-Garden.exe"

reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
if errorlevel 1 reg query "HKCU\Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" /v pv >nul 2>&1
if errorlevel 1 (
    echo Microsoft Edge WebView2 Runtime is required.
    echo Opening the official Microsoft download page...
    start "WebView2 Runtime" "https://developer.microsoft.com/microsoft-edge/webview2/"
    pause
    exit /b 1
)

if not exist "%APP%" (
    echo Process-Garden.exe was not found:
    echo %APP%
    echo Please check the release folder.
    pause
    exit /b 1
)

start "Process Garden" "%APP%"
exit /b 0
