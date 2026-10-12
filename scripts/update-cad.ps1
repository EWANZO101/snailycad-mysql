# One-click CAD update on Windows: the Windows twin of update-cad.sh, for a CAD made by the
# one-line installer (scripts/installer/install.ps1). Started by Admin > Dashboard > Update CAD (as a
# one-off SYSTEM scheduled task, so it outlives the CAD service it restarts), or by double-clicking
# "Update SnailyCAD.bat" in the install folder.
#
# It stops the CAD, serves the "the CAD is updating" page on the CAD's port (status-server.mjs),
# pulls the latest version, installs the packages, builds, and starts the CAD again. The database is
# updated by the CAD itself when it starts (prisma migrate deploy).
#
# usage (as administrator):
#   powershell -ExecutionPolicy Bypass -File C:\SnailyCAD\app\scripts\update-cad.ps1 [-Interactive]
#
#   -Interactive  show the log in this window and open the CAD when done (what the .bat uses)
#   -TaskName     the one-off scheduled task the CAD started this from; removed when done
#
# Written for Windows PowerShell 5.1: no PowerShell 7-only syntax.
param(
    [switch]$Interactive,
    [string]$TaskName = ''
)
$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'

$appDir = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path.TrimEnd('\')
$installDir = Split-Path -Parent $appDir
$manifestPath = Join-Path $installDir 'installer\manifest.env'
$logsDir = Join-Path $installDir 'logs'
$logFile = Join-Path $logsDir 'update.log'
$statusDir = Join-Path $appDir '.snaily-cache\status'
$statusFile = Join-Path $statusDir 'status.json'
$nodeDir = Join-Path $installDir 'runtime\node'
$node = Join-Path $nodeDir 'node.exe'
$pnpm = Join-Path $nodeDir 'node_modules\pnpm\bin\pnpm.cjs'
$pnpmStore = Join-Path $installDir 'runtime\pnpm-store'
$startedAt = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

New-Item -ItemType Directory -Force -Path $logsDir, $statusDir | Out-Null

function Write-Log([string]$Text, [string]$Kind = '*') {
    $line = "[$Kind] [update] $Text"
    Add-Content -LiteralPath $logFile -Value $line -Encoding UTF8
    if ($Interactive) {
        $color = if ($Kind -eq 'x') { 'Red' } elseif ($Kind -eq '!') { 'Yellow' } else { 'Green' }
        Write-Host $line -ForegroundColor $color
    }
}

function Set-Status([string]$Phase, [int]$Estimate = 900) {
    $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $json = '{"phase":"' + $Phase + '","startedAt":' + $startedAt + ',"phaseStartedAt":' + $now + ',"estimatedSeconds":' + $Estimate + '}'
    [IO.File]::WriteAllText("$statusFile.tmp", $json)
    Move-Item -LiteralPath "$statusFile.tmp" -Destination $statusFile -Force
}

# runs a program, streaming its output into the log line by line (the status page tails it)
function Invoke-Logged([string]$Exe, [string[]]$Arguments) {
    $previous = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    & $Exe @Arguments 2>&1 | ForEach-Object {
        $text = "$_"
        Add-Content -LiteralPath $logFile -Value $text -Encoding UTF8
        if ($Interactive) { Write-Host $text }
    }
    $code = $LASTEXITCODE
    $ErrorActionPreference = $previous
    return $code
}

# --- settings -------------------------------------------------------------------------------------

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'Run this as administrator (or double-click "Update SnailyCAD.bat").' -ForegroundColor Red
    exit 1
}
if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "No installer manifest in $installDir; this updater is for CADs made by the one-line installer." -ForegroundColor Red
    exit 1
}
$single = @{}
foreach ($line in Get-Content -LiteralPath $manifestPath -Encoding UTF8) {
    if ($line -match '^([A-Z_]+)=(.*)$') { $single[$Matches[1]] = $Matches[2].Trim() }
}
$name = $single['NAME']; if (-not $name) { $name = 'snailycad' }
$serviceKind = $single['WIN_SERVICE']
$branch = $single['BRANCH']; if (-not $branch) { $branch = 'main' }

$portClient = '3000'
$clientUrl = $null
$envFile = Join-Path $appDir '.env'
if (Test-Path -LiteralPath $envFile) {
    foreach ($line in Get-Content -LiteralPath $envFile -Encoding UTF8) {
        if ($line -match '^\s*PORT_CLIENT\s*=\s*"?(\d+)"?') { $portClient = $Matches[1] }
        if ($line -match '^\s*NEXT_PUBLIC_CLIENT_URL\s*=\s*"?([^"\s]+)"?') { $clientUrl = $Matches[1] }
    }
}

$git = (Get-Command git.exe -ErrorAction SilentlyContinue | Select-Object -First 1).Source
if (-not $git) {
    foreach ($candidate in @("$env:ProgramFiles\Git\cmd\git.exe", "${env:ProgramFiles(x86)}\Git\cmd\git.exe")) {
        if ($candidate -and (Test-Path -LiteralPath $candidate)) { $git = $candidate; break }
    }
}
# the install folder belongs to the admin who installed it; this may run as SYSTEM
function Invoke-Git([string[]]$Arguments) {
    return Invoke-Logged $git (@('-c', 'safe.directory=*', '-C', $appDir) + $Arguments)
}
function Get-GitOutput([string[]]$Arguments) {
    $out = & $git -c 'safe.directory=*' -C $appDir @Arguments 2>$null
    return ($out | Out-String).Trim()
}

$env:PATH = "$nodeDir;$env:PATH"
$env:NEXT_TELEMETRY_DISABLED = '1'
$memoryMb = [int]((Get-CimInstance Win32_ComputerSystem -ErrorAction SilentlyContinue).TotalPhysicalMemory / 1MB)
$heap = if ($env:SNAILY_BUILD_HEAP_MB) { $env:SNAILY_BUILD_HEAP_MB } elseif ($memoryMb -eq 0) { 2048 } elseif ($memoryMb -lt 3000) { 1536 } elseif ($memoryMb -lt 6000) { 2048 } else { 4096 }
$env:NODE_OPTIONS = "--max-old-space-size=$heap"
Set-Location -LiteralPath $appDir

# --- the CAD service ------------------------------------------------------------------------------

function Stop-Cad {
    if ($serviceKind -eq 'task') {
        Stop-ScheduledTask -TaskPath '\SnailyCAD\' -TaskName $name -ErrorAction SilentlyContinue
    } elseif (Get-Service -Name $name -ErrorAction SilentlyContinue) {
        Stop-Service -Name $name -Force -ErrorAction SilentlyContinue
    }
    # whatever is still running from the install folder (node.exe, Prisma's engine), but not us
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessId -ne $PID -and $_.ExecutablePath -and $_.ExecutablePath.StartsWith("$installDir\", [StringComparison]::OrdinalIgnoreCase) } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

function Start-Cad {
    if ($serviceKind -eq 'task') {
        Start-ScheduledTask -TaskPath '\SnailyCAD\' -TaskName $name -ErrorAction SilentlyContinue
    } elseif (Get-Service -Name $name -ErrorAction SilentlyContinue) {
        Start-Service -Name $name -ErrorAction SilentlyContinue
    } else {
        Write-Log "The CAD service $name was not found; start the CAD by hand." '!'
    }
}

$statusServer = $null
function Start-StatusPage {
    $script = Join-Path $appDir 'scripts\status-server.mjs'
    if (-not (Test-Path -LiteralPath $script) -or -not (Test-Path -LiteralPath $node)) { return }
    $q = { param($s) '"' + $s + '"' }
    $arguments = @((& $q $script), '--status', (& $q $statusFile), '--log', (& $q $logFile),
        '--out', (& $q (Join-Path $statusDir 'log.json')), '--port', $portClient)
    $script:statusServer = Start-Process -FilePath $node -ArgumentList $arguments -WindowStyle Hidden -PassThru
}
function Stop-StatusPage {
    if ($script:statusServer -and -not $script:statusServer.HasExited) {
        Stop-Process -Id $script:statusServer.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    }
}

function Wait-CadStarted {
    $deadline = (Get-Date).AddMinutes(10)
    while ((Get-Date) -lt $deadline) {
        try {
            $client = New-Object Net.Sockets.TcpClient
            $client.Connect('127.0.0.1', [int]$portClient)
            $client.Close()
            return $true
        } catch {
            Start-Sleep -Seconds 5
        }
    }
    return $false
}

function Finish([bool]$Ok, [string]$Message) {
    Stop-StatusPage
    if ($Ok) {
        Set-Status 'starting' 120
        Write-Log 'Starting the CAD (it updates the database first).'
        Start-Cad
        if (Wait-CadStarted) {
            Set-Status 'running' 0
            Write-Log $Message
        } else {
            Set-Status 'failed' 0
            Write-Log "The CAD didn't come back within 10 minutes. See $logsDir\cad.log." 'x'
            $Ok = $false
        }
    } else {
        Set-Status 'failed' 0
        Write-Log $Message 'x'
        Write-Log 'Starting the CAD again.' '!'
        Start-Cad
    }
    if ($TaskName) { Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue }
    if ($Interactive) {
        if ($Ok -and $clientUrl) { Start-Process $clientUrl }
        Write-Host ''
        Write-Host "Full log: $logFile"
    }
    if ($Ok) { exit 0 } else { exit 1 }
}

# --- update ---------------------------------------------------------------------------------------

Set-Status 'preparing' 900
Write-Log "Update started ($installDir, branch $branch)."
if (-not $git) { Finish $false 'Git was not found. Install it (winget install Git.Git) and try again.' }
if (-not (Test-Path -LiteralPath $node) -or -not (Test-Path -LiteralPath $pnpm)) {
    Finish $false "The CAD's Node.js / pnpm is missing from $installDir\runtime. Run the installer again."
}

Write-Log 'Stopping the CAD.'
Stop-Cad
Start-StatusPage

$before = Get-GitOutput @('rev-parse', 'HEAD')
# rewritten by the CAD itself (website port, image domains): put back, not stashed
Invoke-Git @('checkout', '--', 'apps/client/package.json', 'apps/client/next.config.mjs') | Out-Null
if (Get-GitOutput @('status', '--porcelain', '--untracked-files=no')) {
    Write-Log 'Saving local changes with git stash.'
    if ((Invoke-Git @('stash', 'push', '-m', ('pre-update-' + (Get-Date -Format 'yyyy-MM-dd-HHmmss')))) -ne 0) {
        Finish $false 'Could not stash local changes.'
    }
}
Write-Log "Pulling the latest version from origin/$branch."
if ((Invoke-Git @('fetch', 'origin', $branch)) -ne 0) { Finish $false 'Could not reach the git remote.' }
if ((Invoke-Git @('pull', '--ff-only', 'origin', $branch)) -ne 0) {
    Finish $false "Could not fast-forward to origin/$branch (local commits?). Update by hand."
}
$after = Get-GitOutput @('rev-parse', 'HEAD')
Write-Log "Now at $($after.Substring(0, [Math]::Min(9, $after.Length)))."

if ($before -eq $after) { Write-Log 'Nothing new to pull; rebuilding anyway.' }

Set-Status 'installing' 900
Write-Log 'Installing packages with pnpm.'
if ((Invoke-Logged $node @($pnpm, 'install', '--prefer-offline', '--store-dir', $pnpmStore)) -ne 0) {
    Finish $false 'Installing the packages failed.'
}

Set-Status 'building' 900
Write-Log 'Copying the settings to the website and API.'
if ((Invoke-Logged $node @((Join-Path $appDir 'scripts\copy-env.mjs'), '--client', '--api')) -ne 0) { Finish $false 'Could not copy the settings to the website and API.' }

Write-Log 'Building the CAD; this takes 10-25 minutes.'
if ((Invoke-Logged $node @($pnpm, 'run', 'build')) -ne 0) { Finish $false 'The build failed. Click Update CAD again, or see the log.' }

Finish $true 'Update finished.'
