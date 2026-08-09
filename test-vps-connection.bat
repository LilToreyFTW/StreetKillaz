@echo off
setlocal
title StreetKillaz VPS Connection Test

echo ==================================================
echo        StreetKillaz VPS Connection Test
echo ==================================================
echo.

echo [TCP TEST] 147.189.172.104:7076
powershell -NoProfile -ExecutionPolicy Bypass -Command "$r=Test-NetConnection 147.189.172.104 -Port 7076 -WarningAction SilentlyContinue; $r | Format-List ComputerName,RemoteAddress,RemotePort,TcpTestSucceeded"

echo.
echo [HEALTH TEST]
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-RestMethod 'http://147.189.172.104:7076/health' -TimeoutSec 8; Write-Host ($r | ConvertTo-Json -Compress) } catch { Write-Host ('FAILED: ' + $_.Exception.Message) }"

echo.
echo If TcpTestSucceeded is False, open inbound TCP 7076 in:
echo   1. Windows Defender Firewall on the VPS
 echo  2. Your VPS provider firewall/security-group dashboard
 echo  3. Any router or network firewall in front of the VPS
 echo.
pause
