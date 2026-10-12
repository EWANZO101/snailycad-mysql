@echo off
rem Updates SnailyCAD to the latest version. Copied to the install folder as "Update SnailyCAD.bat":
rem double-click it. It asks for administrator rights, then runs app\scripts\update-cad.ps1.
title Update SnailyCAD
net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
if not exist "%~dp0app\scripts\update-cad.ps1" (
    echo The updater was not found in "%~dp0app\scripts". Is this the SnailyCAD install folder?
    pause
    exit /b 1
)
echo Updating SnailyCAD. The CAD is offline while it updates (10-25 minutes).
echo You can close this window; the update stops if you do.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\scripts\update-cad.ps1" -Interactive
echo.
pause
