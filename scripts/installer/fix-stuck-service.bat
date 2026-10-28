@echo off
rem Fixes a SnailyCAD Windows service (the CAD itself, or its Control Panel companion) left
rem not-running by an NSSM/SCM timing quirk - see fix-stuck-service.ps1 for the full story.
rem Save this file into the SnailyCAD install folder (next to "Update SnailyCAD.bat") and
rem double-click it; if fix-stuck-service.ps1 isn't next to it, it's fetched from GitHub first,
rem so this single file is enough to hand to an affected install.
title Fix SnailyCAD Service
net session >nul 2>&1
if errorlevel 1 (
    powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)
if not exist "%~dp0fix-stuck-service.ps1" (
    echo Downloading fix-stuck-service.ps1...
    powershell -NoProfile -Command "$ProgressPreference='SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri 'https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/fix-stuck-service.ps1' -OutFile '%~dp0fix-stuck-service.ps1'"
    if errorlevel 1 (
        echo Could not download fix-stuck-service.ps1. Save it next to this file by hand and try again.
        pause
        exit /b 1
    )
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0fix-stuck-service.ps1"
echo.
pause
