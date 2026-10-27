# Fixes a SnailyCAD NSSM Windows service (the CAD itself, or its Control Panel companion) that
# was left not-running by this NSSM/SCM timing quirk:
#
#   Could not set up the snailycad-control service: snailycad-control: Unexpected status
#   SERVICE_START_PENDING in response to START control.
#
# `nssm start <name>` reports failure whenever the service takes a little longer to leave
# SERVICE_START_PENDING than NSSM's own short, fixed wait allows - that's not the same as the
# service actually failing, and easy to hit on a slower machine mid-install (CPU busy with the
# CAD's own build). The installer no longer treats that as fatal (it polls the real status
# instead), but an install made before that fix can still be sitting with the service stopped
# even though nothing else is wrong. This just (re)starts it, patiently.
#
# Run as administrator (or double-click "Fix Stuck Service.bat" in the install folder, next to
# "Update SnailyCAD.bat"). Safe to run any time: if a service is already running, it's left alone.
$ErrorActionPreference = 'Stop'

$installDir = $PSScriptRoot
$manifestPath = Join-Path $installDir 'installer\manifest.env'
$nssm = Join-Path $installDir 'runtime\nssm.exe'

function Read-Manifest {
    $values = @{}
    if (Test-Path -LiteralPath $manifestPath) {
        foreach ($line in Get-Content -LiteralPath $manifestPath -Encoding UTF8) {
            if ($line -match '^([A-Z_]+)=(.*)$') { $values[$Matches[1]] = $Matches[2].Trim() }
        }
    }
    return $values
}

function Start-ServiceAndWait([string]$Name, [int]$TimeoutSeconds = 60) {
    if (-not (Get-Service -Name $Name -ErrorAction SilentlyContinue)) {
        Write-Host "  $Name - no such Windows service, skipping." -ForegroundColor Yellow
        return
    }

    $status = ((& $nssm status $Name 2>$null) | Out-String).Trim()
    if ($status -eq 'SERVICE_RUNNING') {
        Write-Host "  $Name - already running." -ForegroundColor Green
        return
    }

    Write-Host "  $Name - starting (was: $status)..."
    & $nssm start $Name | Out-Null

    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        $status = ((& $nssm status $Name 2>$null) | Out-String).Trim()
        if ($status -eq 'SERVICE_RUNNING') {
            Write-Host "  $Name - now running." -ForegroundColor Green
            return
        }
        if ($status -in @('SERVICE_STOPPED', 'SERVICE_PAUSED')) { break }
        Start-Sleep -Seconds 2
    }
    Write-Host "  $Name - still not running (status: $status). Check logs\cad.log / logs\control.log." -ForegroundColor Red
}

Write-Host "SnailyCAD stuck-service fix ($installDir)"
Write-Host ''

if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "No installer\manifest.env found here - this isn't a SnailyCAD install folder (or it wasn't made by the one-line installer)." -ForegroundColor Red
    exit 1
}

$manifest = Read-Manifest
if ($manifest['WIN_SERVICE'] -and $manifest['WIN_SERVICE'] -ne 'nssm') {
    Write-Host 'This install uses a scheduled task, not NSSM services - nothing for this tool to fix.' -ForegroundColor Yellow
    exit 0
}
if (-not (Test-Path -LiteralPath $nssm)) {
    Write-Host "nssm.exe not found at $nssm. Re-run the installer to restore it." -ForegroundColor Red
    exit 1
}

$cadService = $manifest['CAD_SERVICE']
$controlService = $manifest['CONTROL_SERVICE']

if (-not $cadService -and -not $controlService) {
    Write-Host 'No CAD_SERVICE/CONTROL_SERVICE entries in manifest.env - nothing to check.' -ForegroundColor Yellow
    exit 0
}

if ($cadService) { Start-ServiceAndWait $cadService }
if ($controlService) { Start-ServiceAndWait $controlService }

Write-Host ''
Write-Host 'Done.'
