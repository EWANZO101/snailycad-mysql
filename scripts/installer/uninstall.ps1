# Removes a SnailyCAD install made by scripts/installer/install.ps1, using the manifest it kept of
# everything it added outside the install folder. Copied to <install folder>\uninstall.ps1.
#
# usage (PowerShell or cmd, as administrator):
#   powershell -ExecutionPolicy Bypass -File C:\SnailyCAD\uninstall.ps1 [-Yes] [-KeepMariaDB] [-Keep <items>]
#
#   -Yes          don't ask before removing
#   -KeepMariaDB  keep the MariaDB server the wizard installed (only the CAD's database and user
#                 are dropped from it); same as -Keep db-server
#   -Keep         leave these in place, comma-separated (one string, so it survives -File).
#                 Admin > Dashboard > Danger zone passes the items you untick there:
#                   database   the CAD's database and MySQL user (all CAD data)
#                   db-server  the MariaDB / PostgreSQL server the wizard installed (keeping the
#                              database keeps it too)
#                   runtime    the private Node.js + pnpm (and NSSM) in <install folder>\runtime
#                   firewall   the Windows Firewall rules the wizard added
#                   pkg:<id>   one winget package the wizard installed, e.g. pkg:Git.Git
#   -TaskName     the one-off scheduled task the CAD started this from; removed when done
#
# Written for Windows PowerShell 5.1: no PowerShell 7-only syntax.
param(
    [switch]$Yes,
    [switch]$KeepMariaDB,
    [string]$Keep = '',
    [string]$TaskName = ''
)
$ErrorActionPreference = 'Continue'
$keepItems = @($Keep -split ',' | ForEach-Object { $_.Trim() } | Where-Object { $_ })
if ($KeepMariaDB) { $keepItems += 'db-server' }
function Test-Keep([string]$Item) { return $keepItems -contains $Item }

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
        if ($key -eq 'WINGET_PACKAGE') { if (-not $packages.Contains($value) -and -not (Test-Keep "pkg:$value")) { [void]$packages.Add($value) } }
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
# removing the MariaDB server takes every database in it, so keeping the CAD's database keeps it too
$dropDatabase = $dbName -and -not (Test-Keep 'database')
$removeMariaDB = $ourMariaDB -and -not (Test-Keep 'db-server') -and -not (Test-Keep 'database')
$isPostgres = (Get-Value 'DB_ENGINE') -eq 'postgresql'
$ourPostgres = (Get-Value 'WINGET_POSTGRES') -eq '1'
$pgService = Get-Value 'POSTGRES_SERVICE'
if (-not $pgService) { $pgService = 'postgresql-x64-17' }
$removePostgres = $ourPostgres -and -not (Test-Keep 'db-server') -and -not (Test-Keep 'database')
$removeRuntime = -not (Test-Keep 'runtime')
if (Test-Keep 'firewall') { $rules = @() }

Write-Host 'This permanently removes:'
if ($removeRuntime) { Write-Host "  - $dir (the CAD, its build, Node.js + pnpm and logs)" }
else { Write-Host "  - $dir except runtime\ (Node.js + pnpm are kept)" }
if ($cadService -and $serviceKind -eq 'task') { Write-Host "  - scheduled task \SnailyCAD\$cadService" }
elseif ($cadService) { Write-Host "  - Windows service $cadService" }
if ($dropDatabase) { Write-Host "  - database $dbName and database user $dbUser (all CAD data)" }
if ($rules.Count -gt 0) { Write-Host "  - Windows Firewall rule(s) $($rules -join ', ')" }
if ($removeMariaDB) { Write-Host '  - the MariaDB server it installed (and every database in it)' }
if ($removePostgres) { Write-Host '  - the PostgreSQL server and pgAdmin it installed (and every database in it)' }
if ($packages.Count -gt 0) { Write-Host "  - program(s) it installed with winget: $($packages -join ', ')" }
if ($keepItems.Count -gt 0) { Write-Host "Keeping: $($keepItems -join ', ')" }
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
$pgPasswordFile = Join-Path $dir 'installer\postgres-password.txt'
function Find-Psql {
    $root = $env:ProgramFiles
    $found = Get-ChildItem -Path (Join-Path $root 'PostgreSQL\*\bin\psql.exe') -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1
    if ($found) { return $found.FullName }
    return $null
}
if ($isPostgres) {
    if ($dropDatabase -and $ourPostgres -and -not $removePostgres) {
        $psql = Find-Psql
        if ($psql -and (Test-Path -LiteralPath $pgPasswordFile)) {
            Say "Dropping PostgreSQL database $dbName and user $dbUser..."
            $pgPassword = (Get-Content -LiteralPath $pgPasswordFile -Raw).Trim()
            $env:PGPASSWORD = $pgPassword
            & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -q -v ON_ERROR_STOP=1 `
                -c "DROP DATABASE IF EXISTS `"$dbName`" WITH (FORCE)" -c "DROP ROLE IF EXISTS `"$dbUser`""
            if ($LASTEXITCODE -ne 0) { Warn 'Could not drop the database; remove it by hand.' }
            Remove-Item Env:\PGPASSWORD
            Warn "PostgreSQL is kept. The postgres user's password is: $pgPassword  (write it down: the file holding it is deleted now)"
        } else {
            Warn "Could not log in to PostgreSQL; drop the database $dbName and user $dbUser by hand."
        }
    } elseif ($dropDatabase -and -not $ourPostgres) {
        Warn "The database $dbName is on a server this installer did not manage; drop it there yourself."
    } elseif ($dbName -and -not $dropDatabase) {
        Say "Keeping database $dbName and user $dbUser."
        if ($ourPostgres -and (Test-Path -LiteralPath $pgPasswordFile)) {
            $pgPassword = (Get-Content -LiteralPath $pgPasswordFile -Raw).Trim()
            Warn "PostgreSQL is kept. The postgres user's password is: $pgPassword  (write it down: the file holding it is deleted now)"
        }
    }
} elseif ($dropDatabase -and $ourMariaDB -and -not $removeMariaDB) {
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
} elseif ($dropDatabase -and -not $ourMariaDB) {
    Warn "The database $dbName is on a server this installer did not manage; drop it there yourself."
} elseif ($dbName -and -not $dropDatabase) {
    Say "Keeping database $dbName and user $dbUser."
    if ($ourMariaDB -and (Test-Path -LiteralPath $rootPasswordFile)) {
        $rootPassword = (Get-Content -LiteralPath $rootPasswordFile -Raw).Trim()
        Warn "MariaDB is kept. Its root password is: $rootPassword  (write it down: the file holding it is deleted now)"
    }
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

if ($removePostgres) {
    Say 'Removing PostgreSQL and pgAdmin (and their data)...'
    & sc.exe stop $pgService 2>&1 | Out-Null
    $pgDirs = @(Get-ChildItem -Path (Join-Path $env:ProgramFiles 'PostgreSQL\*') -Directory -ErrorAction SilentlyContinue)
    $removed = $false
    foreach ($pgDir in $pgDirs) {
        $uninstaller = Join-Path $pgDir.FullName 'uninstall-postgresql.exe'
        if (Test-Path -LiteralPath $uninstaller) {
            $process = Start-Process -FilePath $uninstaller -Wait -PassThru -ArgumentList @('--mode', 'unattended', '--unattendedmodeui', 'none')
            if ($process.ExitCode -ne 0) { Warn "Removing PostgreSQL ended with code $($process.ExitCode)." }
            $removed = $true
        }
        # the EDB uninstaller leaves the data directory behind
        Remove-Item -LiteralPath $pgDir.FullName -Recurse -Force -ErrorAction SilentlyContinue
    }
    if (-not $removed) { Warn 'PostgreSQL was not found in the installed programs; nothing to remove.' }
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
function Remove-Tree([string]$Path) {
    Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
    if (Test-Path -LiteralPath $Path) {
        # node_modules paths can be longer than Remove-Item handles: robocopy an empty folder over it
        $empty = Join-Path $env:TEMP ('snailycad-empty-' + [guid]::NewGuid().ToString('N'))
        New-Item -ItemType Directory -Path $empty | Out-Null
        & robocopy.exe $empty $Path /MIR /NFL /NDL /NJH /NJS /NP /R:1 /W:1 | Out-Null
        Remove-Item -LiteralPath $Path -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $empty -Force -ErrorAction SilentlyContinue
    }
}
if ($removeRuntime) {
    Say "Deleting $dir..."
    Remove-Tree $dir
    $left = Test-Path -LiteralPath $dir
} else {
    Say "Deleting $dir (keeping runtime\)..."
    Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -ne 'runtime' } | ForEach-Object { Remove-Tree $_.FullName }
    $left = @(Get-ChildItem -LiteralPath $dir -Force -ErrorAction SilentlyContinue | Where-Object { $_.Name -ne 'runtime' }).Count -gt 0
}
if ($left) {
    Warn "$dir could not be deleted completely (a file may be in use). Restart Windows and delete it by hand."
} else {
    Say "Done. SnailyCAD ($name) is gone."
}

if ($TaskName) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
}
