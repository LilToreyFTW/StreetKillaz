@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title StreetKillaz Game Launcher

echo ==================================================
echo              StreetKillaz Launcher
echo ==================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js was not found.
    echo Install Node.js 22 or newer, then run start-game.bat again.
    pause
    exit /b 1
)

echo [CHECK] Testing the public dedicated server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-RestMethod -Uri 'http://147.189.172.104:7076/health' -TimeoutSec 5; Write-Host ('[ONLINE] VPS found: ' + ($r | ConvertTo-Json -Compress)) } catch { Write-Host '[WARNING] The VPS public port is not reachable from this computer yet.' }"

echo.
echo [START] Launching the local game web server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$targets = Get-CimInstance Win32_Process -Filter 'Name = ''node.exe''' | Where-Object { $_.CommandLine -like '*StreetKillaz*tools\static-server.cjs*' }; foreach ($target in $targets) { Stop-Process -Id $target.ProcessId -Force -ErrorAction SilentlyContinue }"
start "StreetKillaz Web Server" /min cmd /c "node tools\static-server.cjs"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8080/?build=20260808"

echo [OK] StreetKillaz opened in your browser.
echo Do not open index.html directly; always use this launcher.
echo.
pause
exit /b 0
