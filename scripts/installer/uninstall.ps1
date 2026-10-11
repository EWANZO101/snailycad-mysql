# Removes a SnailyCAD install made by scripts/installer/install.ps1, using the manifest it kept of
# everything it added outside the install folder. Copied to <install folder>\uninstall.ps1.
#
# usage (PowerShell or cmd, as administrator):
#   powershell -ExecutionPolicy Bypass -File C:\SnailyCAD\uninstall.ps1 [-Yes] [-KeepMariaDB]
#
#   -Yes          don't ask before removing
#   -KeepMariaDB  keep the MariaDB server the wizard installed (only the CAD's database and user
#                 are dropped from it)
#
# Written for Windows PowerShell 5.1: no PowerShell 7-only syntax.
param(
    [switch]$Yes,
    [switch]$KeepMariaDB
)
$ErrorActionPreference = 'Continue'

function Say([string]$Text) { Write-Host "[*] $Text" -ForegroundColor Green }
function Warn([string]$Text) { Write-Host "[!] $Text" -ForegroundColor Yellow }

$identity = [Security.Principal.WindowsIdentity]::GetCurrent()
$isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host 'Run this as administrator (right-click PowerShell > Run as administrator).' -ForegroundColor Red
    exit 1
}

$dir = $PSScriptRoot.TrimEnd('\')
$manifestPath = Join-Path $dir 'installer\manifest.env'
if (-not (Test-Path -LiteralPath $manifestPath)) {
    Write-Host "No installer manifest in $dir; is this a SnailyCAD install folder?" -ForegroundColor Red
    exit 1
}

# KEY=value lines; WINGET_PACKAGE and WIN_FW_RULE can appear more than once
$single = @{}
$packages = New-Object System.Collections.ArrayList
$rules = New-Object System.Collections.ArrayList
foreach ($line in Get-Content -LiteralPath $manifestPath -Encoding UTF8) {
    if ($line -match '^([A-Z_]+)=(.*)$') {
        $key = $Matches[1]
        $value = $Matches[2].Trim()
        if ($key -eq 'WINGET_PACKAGE') { if (-not $packages.Contains($value)) { [void]$packages.Add($value) } }
        elseif ($key -eq 'WIN_FW_RULE') { if (-not $rules.Contains($value)) { [void]$rules.Add($value) } }
        else { $single[$key] = $value }
    }
}
function Get-Value([string]$Key) { if ($single.ContainsKey($Key)) { return $single[$Key] }; return '' }

$name = Get-Value 'NAME'
$installDir = (Get-Value 'INSTALL_DIR').TrimEnd('\')
if ($installDir -ne $dir) {
    Write-Host "Manifest is for $installDir, not $dir. Stopping." -ForegroundColor Red
    exit 1
}
$cadService = Get-Value 'CAD_SERVICE'
$serviceKind = Get-Value 'WIN_SERVICE'
$dbName = Get-Value 'DB_NAME'
$dbUser = Get-Value 'DB_USER'
$dbAdmin = Get-Value 'DB_ADMIN'
$ourMariaDB = (Get-Value 'WINGET_MARIADB') -eq '1'
$mariaService = Get-Value 'MARIADB_SERVICE'
if (-not $mariaService) { $mariaService = 'MariaDB' }
$removeMariaDB = $ourMariaDB -and -not $KeepMariaDB

Write-Host 'This permanently removes:'
Write-Host "  - $dir (the CAD, its build, Node.js copy and logs)"
if ($cadService -and $serviceKind -eq 'task') { Write-Host "  - scheduled task \SnailyCAD\$cadService" }
elseif ($cadService) { Write-Host "  - Windows service $cadService" }
if ($dbName) { Write-Host "  - database $dbName and MySQL user $dbUser (all CAD data)" }
if ($rules.Count -gt 0) { Write-Host "  - Windows Firewall rule(s) $($rules -join ', ')" }
if ($removeMariaDB) { Write-Host '  - the MariaDB server it installed (and every database in it)' }
if ($packages.Count -gt 0) { Write-Host "  - program(s) it installed with winget: $($packages -join ', ')" }
if (-not $Yes) {
    $answer = Read-Host 'Continue? [y/N]'
    if ($answer -notmatch '^[yY]') { Write-Host 'Cancelled.'; exit 0 }
}

Set-Location -LiteralPath $env:SystemRoot

# --- the setup wizard (only the process install.ps1 started, checked by its command line) ---
$wizardPid = Get-Value 'WIZARD_PID'
if ($wizardPid -match '^[0-9]+$') {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $wizardPid" -ErrorAction SilentlyContinue
    if ($process -and $process.CommandLine -and $process.CommandLine.Contains("$dir\installer\wizard-server.py")) {
        Stop-Process -Id ([int]$wizardPid) -Force -ErrorAction SilentlyContinue
    }
}

# --- the CAD service ---
if ($cadService) {
    Say "Removing $cadService..."
    $nssm = Join-Path $dir 'runtime\nssm.exe'
    if ($serviceKind -eq 'task') {
        Stop-ScheduledTask -TaskPath '\SnailyCAD\' -TaskName $cadService -ErrorAction SilentlyContinue
        Unregister-ScheduledTask -TaskPath '\SnailyCAD\' -TaskName $cadService -Confirm:$false -ErrorAction SilentlyContinue
    } elseif (Get-Service -Name $cadService -ErrorAction SilentlyContinue) {
        if (Test-Path -LiteralPath $nssm) {
            & $nssm stop $cadService 2>&1 | Out-Null
            & $nssm remove $cadService confirm 2>&1 | Out-Null
        }
        if (Get-Service -Name $cadService -ErrorAction SilentlyContinue) {
            & sc.exe stop $cadService | Out-Null
            & sc.exe delete $cadService | Out-Null
        }
    }
}
# anything still running from the install folder (node.exe, Prisma's engine): by PID, checked by path
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
    Where-Object { $_.ExecutablePath -and $_.ExecutablePath.StartsWith("$dir\", [StringComparison]::OrdinalIgnoreCase) } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

# --- database ---
function Find-MySql {
    foreach ($root in @($env:ProgramFiles, ${env:ProgramFiles(x86)})) {
        if (-not $root) { continue }
        $found = Get-ChildItem -Path (Join-Path $root 'MariaDB*\bin\mysql.exe') -ErrorAction SilentlyContinue |
            Sort-Object FullName -Descending | Select-Object -First 1
        if ($found) { return $found.FullName }
    }
    return $null
}
$rootPasswordFile = Join-Path $dir 'installer\mariadb-root-password.txt'
if ($dbName -and $ourMariaDB -and $KeepMariaDB) {
    $mysql = Find-MySql
    if ($mysql -and (Test-Path -LiteralPath $rootPasswordFile)) {
        Say "Dropping database $dbName and user $dbUser..."
        $rootPassword = (Get-Content -LiteralPath $rootPasswordFile -Raw).Trim()
        $env:MYSQL_PWD = $rootPassword
        & $mysql -h 127.0.0.1 -P 3306 -u root -e "DROP DATABASE IF EXISTS ``$dbName``; DROP USER IF EXISTS '$dbUser'@'localhost'; DROP USER IF EXISTS '$dbUser'@'127.0.0.1';"
        if ($LASTEXITCODE -ne 0) { Warn 'Could not drop the database; remove it by hand.' }
        Remove-Item Env:\MYSQL_PWD
        Warn "MariaDB is kept. Its root password is: $rootPassword  (write it down: the file holding it is deleted now)"
    } else {
        Warn "Could not log in to MariaDB; drop the database $dbName and user $dbUser by hand."
    }
} elseif ($dbName -and -not $ourMariaDB) {
    Warn "The database $dbName is on a server this installer did not manage; drop it there yourself."
}

if ($removeMariaDB) {
    Say 'Removing MariaDB (and its data)...'
    & sc.exe stop $mariaService 2>&1 | Out-Null
    $entries = Get-ItemProperty -Path @('HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*',
        'HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*') -ErrorAction SilentlyContinue |
        Where-Object { $_.DisplayName -like 'MariaDB *' -and $_.PSChildName -match '^\{[0-9A-Fa-f-]+\}$' }
    foreach ($entry in $entries) {
        # CLEANUPDATA=1 (the default) deletes the data directory too
        $msi = Start-Process -FilePath 'msiexec.exe' -Wait -PassThru -ArgumentList @('/x', $entry.PSChildName, '/qn', '/norestart', 'CLEANUPDATA=1')
        if ($msi.ExitCode -ne 0 -and $msi.ExitCode -ne 3010) { Warn "Removing $($entry.DisplayName) ended with code $($msi.ExitCode)." }
    }
    if (-not $entries) { Warn 'MariaDB was not found in the installed programs; nothing to remove.' }
}

# --- programs installed with winget (Git, NSSM, Python) ---
if ($packages.Count -gt 0) {
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        foreach ($package in $packages) {
            Say "Removing $package..."
            & winget uninstall --id $package --exact --silent --disable-interactivity --accept-source-agreements | Out-Null
            if ($LASTEXITCODE -ne 0) { Warn "winget could not remove $package (code $LASTEXITCODE); remove it in Settings > Apps if you like." }
        }
    } else {
        Warn "winget is missing; remove $($packages -join ', ') in Settings > Apps if you like."
    }
}

# --- firewall ---
foreach ($rule in $rules) {
    & netsh.exe advfirewall firewall delete rule "name=$rule" | Out-Null
}

# --- the folder ---
Say "Deleting $dir..."
Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
if (Test-Path -LiteralPath $dir) {
    # node_modules paths can be longer than Remove-Item handles: robocopy an empty folder over it
    $empty = Join-Path $env:TEMP ('snailycad-empty-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Path $empty | Out-Null
    & robocopy.exe $empty $dir /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
    Remove-Item -LiteralPath $dir -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item -LiteralPath $empty -Force -ErrorAction SilentlyContinue
}
if (Test-Path -LiteralPath $dir) {
    Warn "$dir could not be deleted completely (a file may be in use). Restart Windows and delete it by hand."
} else {
    Say "Done. SnailyCAD ($name) is gone."
}
