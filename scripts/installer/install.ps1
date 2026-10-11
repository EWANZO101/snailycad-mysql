# SnailyCAD one-line installer for Windows 10/11 (x64).
#
#   PowerShell (Admin):
#     irm https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.ps1 | iex
#
#   Command Prompt (cmd):
#     powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.ps1 | iex"
#
# Not elevated? It downloads itself to %TEMP% and starts again as administrator (a UAC prompt).
#
# This only starts the setup wizard (Python 3, installed with winget when missing). Everything else
# is installed from the wizard in the browser, one button per requirement: Git, Node.js + pnpm,
# the CAD itself, its database (MariaDB with winget, or a MySQL/MariaDB you already have).
#
# Everything lives in one folder so it is easy to throw away:
#   $InstallDir\app        the CAD (git clone, made by the wizard)
#   $InstallDir\runtime    its own Node.js + pnpm (+ nssm.exe); a Node.js already on the PC is untouched
#   $InstallDir\logs       the CAD service's log
#   $InstallDir\installer  the wizard, its token and a manifest of everything added outside the
#                          folder (winget packages, the service, firewall rules, the database)
# Remove it all with:  powershell -ExecutionPolicy Bypass -File C:\SnailyCAD\uninstall.ps1
#
# Environment (set before running, e.g.  $env:SNAILY_WIZARD_PORT = 3200):
#   SNAILY_NAME         install name: service name                         (default: snailycad)
#   SNAILY_DIR          install folder                                     (default: C:\SnailyCAD)
#   SNAILY_REPO         git repository (GitHub URL or local folder)
#   SNAILY_BRANCH       branch to install                                  (default: main)
#   SNAILY_WIZARD_PORT  port of the setup wizard                           (default: 3100)
#
# Written for Windows PowerShell 5.1 (the one Windows ships): no PowerShell 7-only syntax.

function Install-SnailyCAD {
    $ErrorActionPreference = 'Stop'
    $ProgressPreference = 'SilentlyContinue'  # Invoke-WebRequest is very slow with the progress bar
    [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12

    function Say([string]$Text) { Write-Host "[*] $Text" -ForegroundColor Green }
    function Warn([string]$Text) { Write-Host "[!] $Text" -ForegroundColor Yellow }
    function Fail([string]$Text) { throw $Text }
    function Get-Setting([string]$Name, [string]$Default) {
        $value = [Environment]::GetEnvironmentVariable($Name)
        if ([string]::IsNullOrWhiteSpace($value)) { return $Default }
        return $value.Trim()
    }

    $Name = Get-Setting 'SNAILY_NAME' 'snailycad'
    $InstallDir = Get-Setting 'SNAILY_DIR' 'C:\SnailyCAD'
    $Repo = Get-Setting 'SNAILY_REPO' 'https://github.com/EWANZO101/snailycad-mysql.git'
    $Branch = Get-Setting 'SNAILY_BRANCH' 'main'
    $WizardPort = Get-Setting 'SNAILY_WIZARD_PORT' '3100'
    $InstallerUrl = Get-Setting 'SNAILY_INSTALLER_URL' "https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/$Branch/scripts/installer"
    $WizardFiles = @('wizard-server.py', 'wizard.html', 'uninstall.ps1')

    # --- administrator ------------------------------------------------------------------

    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $isAdmin = (New-Object Security.Principal.WindowsPrincipal($identity)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Warn 'Administrator rights are needed. Starting again as administrator (answer Yes to the prompt)...'
        # `irm | iex` has no file to restart: download the script, with the SNAILY_* settings in front
        # (an elevated window does not inherit this window's environment)
        $script = Join-Path $env:TEMP 'snailycad-install.ps1'
        $body = (Invoke-WebRequest -UseBasicParsing -Uri "$InstallerUrl/install.ps1").Content
        $lines = @()
        foreach ($var in @('SNAILY_NAME', 'SNAILY_DIR', 'SNAILY_REPO', 'SNAILY_BRANCH', 'SNAILY_WIZARD_PORT', 'SNAILY_INSTALLER_URL')) {
            $value = [Environment]::GetEnvironmentVariable($var)
            if ($value) { $lines += ('$env:' + $var + " = '" + $value.Replace("'", "''") + "'") }
        }
        $text = ($lines -join "`r`n") + "`r`n" + $body
        [IO.File]::WriteAllText($script, $text, (New-Object Text.UTF8Encoding($true)))
        try {
            Start-Process -FilePath 'powershell.exe' -Verb RunAs -ArgumentList @(
                '-NoProfile', '-ExecutionPolicy', 'Bypass', '-NoExit', '-File', "`"$script`"")
        } catch {
            Fail 'The administrator prompt was declined. Open PowerShell with "Run as administrator" and paste the line again.'
        }
        Say 'The install continues in the new administrator window.'
        return
    }

    # --- checks -------------------------------------------------------------------------

    if ($Name -cnotmatch '^[a-z][a-z0-9-]{0,30}$') { Fail 'SNAILY_NAME must be lowercase letters, numbers and dashes.' }
    if ($WizardPort -notmatch '^[0-9]+$') { Fail 'SNAILY_WIZARD_PORT must be a number.' }
    $WizardPort = [int]$WizardPort

    $os = Get-CimInstance Win32_OperatingSystem
    $build = [int]$os.BuildNumber
    if ([Environment]::OSVersion.Version.Major -lt 10 -or $build -lt 17763) {
        Fail "This installer needs Windows 10 (version 1809 or newer) or Windows 11. This is $($os.Caption) (build $build)."
    }
    if ($os.ProductType -ne 1) {
        Warn "$($os.Caption) is a Windows Server. It may work, but only Windows 10 and 11 are tested."
    }
    $arch = $env:PROCESSOR_ARCHITEW6432
    if (-not $arch) { $arch = $env:PROCESSOR_ARCHITECTURE }
    if (-not [Environment]::Is64BitOperatingSystem -or $arch -ne 'AMD64') {
        Fail "A 64-bit (x64) Windows is needed; this one is $arch."
    }
    $drive = [IO.Path]::GetPathRoot([IO.Path]::GetFullPath($InstallDir))
    $disk = New-Object IO.DriveInfo($drive)
    $freeGb = [math]::Round($disk.AvailableFreeSpace / 1GB, 1)
    if ($freeGb -lt 8) { Fail "At least 8 GB of free disk space is needed on $drive (there is $freeGb GB)." }
    Say "$($os.Caption) (build $build), x64, $freeGb GB free on $drive"

    if (Test-Path -LiteralPath $InstallDir) {
        Fail "$InstallDir already exists. Remove the old install first: powershell -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`""
    }
    if (Get-Service -Name $Name -ErrorAction SilentlyContinue) {
        Fail "A Windows service named $Name already exists. Pick another name with `$env:SNAILY_NAME = '...'"
    }
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Any, $WizardPort)
    try { $listener.Start(); $listener.Stop() } catch {
        Fail "Port $WizardPort is already in use. Pick another one with `$env:SNAILY_WIZARD_PORT = '3200'"
    }

    # --- winget -------------------------------------------------------------------------

    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Say 'winget is not registered for this account yet; trying to register App Installer...'
        try { Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe } catch { }
        $env:Path = $env:Path + ';' + (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps')
    }
    if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
        Fail ('winget (App Installer) is missing. Install "App Installer" from the Microsoft Store ' +
            '(https://aka.ms/getwinget), or update it there if it is installed, then run the install line again.')
    }
    $wingetOptions = @('--exact', '--source', 'winget', '--silent', '--disable-interactivity',
        '--accept-package-agreements', '--accept-source-agreements')

    function Update-Path {
        $machine = [Environment]::GetEnvironmentVariable('Path', 'Machine')
        $user = [Environment]::GetEnvironmentVariable('Path', 'User')
        $env:Path = "$machine;$user;" + (Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps')
    }

    # --- python (the wizard) --------------------------------------------------------------

    # A real Python 3.8+; the "python.exe" in WindowsApps is only a Microsoft Store shortcut
    function Find-Python {
        # Windows PowerShell turns a native program's stderr into errors; 'Stop' would make them fatal
        $ErrorActionPreference = 'Continue'
        $candidates = @()
        foreach ($dir in @($env:ProgramFiles, ${env:ProgramFiles(x86)}, (Join-Path $env:LOCALAPPDATA 'Programs\Python'))) {
            if ($dir -and (Test-Path -LiteralPath $dir)) {
                $candidates += Get-ChildItem -Path $dir -Filter 'Python3*' -Directory -ErrorAction SilentlyContinue |
                    Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName 'python.exe' }
            }
        }
        $candidates += Get-Command python.exe -All -ErrorAction SilentlyContinue |
            Where-Object { $_.Source -notlike '*\WindowsApps\*' } | ForEach-Object { $_.Source }
        foreach ($candidate in $candidates) {
            if (-not (Test-Path -LiteralPath $candidate)) { continue }
            $ok = & $candidate -c 'import sys; print(1 if sys.version_info >= (3, 8) else 0)' 2>$null
            if ($ok -eq '1') { return $candidate }
        }
        return $null
    }

    $python = Find-Python
    $pythonInstalled = $false
    if (-not $python) {
        Say 'Installing Python 3.12 for the setup wizard (winget, a minute or two)...'
        & winget install --id Python.Python.3.12 @wingetOptions --scope machine `
            --override '/quiet InstallAllUsers=1 PrependPath=1 Include_test=0 Include_launcher=1'
        if ($LASTEXITCODE -ne 0) { Warn "winget ended with code $LASTEXITCODE; checking whether Python is there anyway..." }
        Update-Path
        $python = Find-Python
        if (-not $python) { Fail 'Python could not be installed. Install Python 3.12 from https://www.python.org/downloads/ (tick "Add to PATH"), then run the install line again.' }
        $pythonInstalled = $true
    }
    Say "Python: $python"

    # --- folder + manifest ------------------------------------------------------------------

    $installerDir = Join-Path $InstallDir 'installer'
    New-Item -ItemType Directory -Force -Path $installerDir | Out-Null
    New-Item -ItemType Directory -Force -Path (Join-Path $InstallDir 'logs') | Out-Null
    # installer\ holds the wizard token and later the MariaDB root password: administrators and SYSTEM only
    & icacls.exe $installerDir /inheritance:r /grant:r '*S-1-5-32-544:(OI)(CI)F' '*S-1-5-18:(OI)(CI)F' | Out-Null

    $manifest = Join-Path $installerDir 'manifest.env'
    $utf8 = New-Object Text.UTF8Encoding($false)
    $entries = @(
        "# What this install added outside $InstallDir. Read by uninstall.ps1.",
        "NAME=$Name", "INSTALL_DIR=$InstallDir", "REPO=$Repo", "BRANCH=$Branch", "PLATFORM=windows",
        # Docker needs WSL 2 and restarts on Windows: standalone only, the wizard skips its method step
        'METHOD=standalone', 'METHOD_PRESET=1')
    if ($pythonInstalled) { $entries += 'WINGET_PACKAGE=Python.Python.3.12' }
    [IO.File]::WriteAllText($manifest, (($entries -join "`n") + "`n"), $utf8)
    function Add-Manifest([string]$Line) { [IO.File]::AppendAllText($manifest, "$Line`n", $utf8) }

    # --- wizard files -------------------------------------------------------------------------

    Say 'Downloading the setup wizard...'
    foreach ($file in $WizardFiles) {
        $target = Join-Path $installerDir $file
        if (Test-Path -LiteralPath $Repo -PathType Container) {
            Copy-Item -LiteralPath (Join-Path $Repo "scripts\installer\$file") -Destination $target
        } else {
            try {
                Invoke-WebRequest -UseBasicParsing -Uri "$InstallerUrl/$file" -OutFile $target
            } catch {
                Fail "Could not download $InstallerUrl/$file : $($_.Exception.Message)"
            }
        }
    }
    Move-Item -LiteralPath (Join-Path $installerDir 'uninstall.ps1') -Destination (Join-Path $InstallDir 'uninstall.ps1')

    # --- firewall (the wizard's port, so it can be opened from another PC too) ------------------

    $wizardRule = "SnailyCAD-$Name-wizard"
    Add-Manifest "WIN_FW_RULE=$wizardRule"
    Add-Manifest "WIN_FW_WIZARD=$wizardRule"
    & netsh.exe advfirewall firewall add rule "name=$wizardRule" dir=in action=allow protocol=TCP "localport=$WizardPort" profile=any | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Say "Windows Firewall: allowed port $WizardPort for the setup wizard (removed again when you finish)."
    } else {
        Warn "Could not add a firewall rule for port $WizardPort; the wizard may only open on this PC."
    }

    # --- start the wizard ---------------------------------------------------------------------

    $bytes = New-Object byte[] 18
    $rng = New-Object Security.Cryptography.RNGCryptoServiceProvider
    $rng.GetBytes($bytes)
    $token = -join ($bytes | ForEach-Object { $_.ToString('x2') })
    [IO.File]::WriteAllText((Join-Path $installerDir 'token'), $token, $utf8)

    $env:SNAILY_INSTALL_DIR = $InstallDir
    $env:SNAILY_WIZARD_PORT = "$WizardPort"
    $env:PYTHONIOENCODING = 'utf-8'
    $env:PYTHONUNBUFFERED = '1'
    $wizardLog = Join-Path $installerDir 'wizard.log'
    # hidden window, keeps running when this window is closed
    $process = Start-Process -FilePath $python -WorkingDirectory $InstallDir -WindowStyle Hidden -PassThru `
        -ArgumentList @('-u', "`"$(Join-Path $installerDir 'wizard-server.py')`"") `
        -RedirectStandardOutput $wizardLog -RedirectStandardError (Join-Path $installerDir 'wizard-error.log')
    Add-Manifest "WIZARD_PID=$($process.Id)"

    $up = $false
    for ($i = 0; $i -lt 40 -and -not $up; $i++) {
        Start-Sleep -Milliseconds 500
        $client = New-Object Net.Sockets.TcpClient
        try { $client.Connect('127.0.0.1', $WizardPort); $up = $true } catch { } finally { $client.Close() }
        if ($process.HasExited) { break }
    }
    if (-not $up) {
        $errors = Get-Content -LiteralPath (Join-Path $installerDir 'wizard-error.log') -Tail 15 -ErrorAction SilentlyContinue
        Fail ("The setup wizard did not start. Its log is in $installerDir (wizard.log, wizard-error.log).`n" + ($errors -join "`n"))
    }

    $ip = $null
    try {
        $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } |
            Sort-Object InterfaceMetric | Select-Object -First 1 -ExpandProperty IPAddress
    } catch { }

    $localUrl = "http://localhost:$WizardPort/?token=$token"
    Write-Host ''
    Write-Host 'Install method: Windows (standalone, Node.js)' -ForegroundColor White
    Write-Host 'SnailyCAD setup wizard is running. It opens in your browser now; if not, open:' -ForegroundColor White
    Write-Host ''
    Write-Host "    $localUrl" -ForegroundColor Green
    if ($ip) {
        Write-Host ''
        Write-Host '  From another PC on your network:' -ForegroundColor White
        Write-Host "    http://${ip}:$WizardPort/?token=$token" -ForegroundColor Green
    }
    Write-Host ''
    Write-Host "Everything lives in $InstallDir. To remove it all again (as administrator):"
    Write-Host "    powershell -ExecutionPolicy Bypass -File `"$InstallDir\uninstall.ps1`""
    Write-Host ''
    try { Start-Process $localUrl } catch { Warn 'Could not open the browser; open the link above yourself.' }
}

try {
    Install-SnailyCAD
} catch {
    Write-Host ''
    Write-Host "[x] $($_.Exception.Message)" -ForegroundColor Red
    Write-Host '    Fix the problem above, then run the install line again.' -ForegroundColor Red
}
