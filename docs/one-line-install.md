<!-- Copy of the docs site's installations/methods/one-line-install.mdx; keep both in sync. -->

# One-line install (Ubuntu and Windows)

Install SnailyCADv4 on an Ubuntu server or a Windows 10/11 PC with **one command**. The command starts a setup wizard in
your browser that installs everything else with buttons, one step at a time.

Pick how the CAD should run:

### 🐳 Docker

The CAD and its own MariaDB database run in containers.

```bash
curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-docker.sh | sudo bash
```

- Nothing but Docker on the server
- Database included
- Restarts on its own after a reboot

[Full Docker guide →](install-docker.md#one-line-installer-recommended)

### 🐧 Ubuntu (standalone)

The CAD runs directly on Ubuntu with Node.js, as a system service.

```bash
curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-ubuntu.sh | sudo bash
```

- Uses less memory
- Can use a MySQL/MariaDB you already have
- The built-in **Update CAD** button works

Not sure yet? This one lets you choose in the wizard:

```bash
curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.sh | sudo bash
```

### 🪟 Windows 10 / 11

The CAD runs directly on Windows with Node.js, as a Windows service. Open **PowerShell as
administrator** (right-click Start > Terminal (Admin) or Windows PowerShell (Admin)) and paste:

```powershell
irm https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.ps1 | iex
```

Or paste this in **Command Prompt (cmd)**:

```bat
powershell -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.ps1 | iex"
```

The `curl … | sudo bash` lines above are for Linux only; they don't work in cmd or PowerShell.
See [Windows](#windows) below for what the Windows installer does.

> **MySQL / MariaDB edition**
>
> These commands install the MySQL/MariaDB edition from
> [github.com/EWANZO101/snailycad-mysql](https://github.com/EWANZO101/snailycad-mysql). See
> [MySQL / MariaDB edition](../MYSQL-PORT.md) for how it differs from the
> standard edition.

## Requirements

- A server running **Ubuntu 22.04 or 24.04** (Debian works but isn't tested), with root access
  (`sudo`)
- At least **2 vCPUs**, about **4 GB of RAM + swap** for building, and **8 GB of free disk space**
- Nothing else: the wizard installs the rest for you

## 1. Run the command

Connect to your server over SSH and paste one of the commands above. It only downloads and starts
the setup wizard, then prints a link:

```text
Install method: Ubuntu (standalone, Node.js)
SnailyCAD setup wizard is running. Open this link in your browser:

    http://203.0.113.10:3100/?token=6bfb6ec923b2c4f68e55cb529d5cfb9bd9ef
```

Open that link in your browser. The `token` part keeps other people out of the wizard, so don't
share the link. If you use the `ufw` firewall, the installer opens port `3100` for the wizard and
closes it again when you finish.

> **Can't reach the link?**
>
> Your hosting provider may have its own firewall in front of the server. Allow TCP port `3100` there
> too, or pick another port with `SNAILY_WIZARD_PORT` (see [options](#options)).

## 2. Follow the setup wizard

Each step has **Back** and **Next** buttons.

1. **Server**: checks the operating system, CPU, memory, disk space and systemd. A red ✕ must be
   fixed before you can continue; a yellow ! is only a warning.
2. **Method**: skipped, because your command already chose Docker or Ubuntu. (With `install.sh`
   you choose here. **Back** on the next step brings you here if you change your mind.)
3. **Requirements**: everything the CAD needs, each with its own **Install** button. Click them one
   by one or **Install all missing**, and watch the live log. **Next** unlocks when everything has a
   green ✓.

   | Docker                                              | Ubuntu (standalone)                                 |
   | --------------------------------------------------- | --------------------------------------------------- |
   | System tools (git, curl, xz-utils, ca-certificates) | System tools (git, curl, xz-utils, ca-certificates) |
   | Docker Engine                                       | Node.js 22, a private copy in the install folder    |
   | Docker Compose                                      | pnpm 9                                              |
   | SnailyCAD (the code)                                | SnailyCAD (the code)                                |

   The standalone method never touches a Node.js that is already installed on the server.

4. **Database**
   - **Docker:** always a MariaDB container. Choose the database name and user; the password is
     generated for you.
   - **Ubuntu:** choose one of
     - **Use the MySQL/MariaDB server on this machine**: creates a new database and user on it.
       Your other databases are not touched. Shown when one is installed.
     - **Install MariaDB for me**: installs MariaDB from Ubuntu, then creates the database. Shown
       when no database server is installed.
     - **Connect to another database server**: enter its host, port, user and password, then click
       **Test connection**.
5. **Website**: the server's IP and two free ports are filled in for you, one for the website and
   one for the API. You see the final URLs as you type.
6. **Review**: check the settings, then click **Install SnailyCAD**.
7. **Install**: follow the progress step by step, with a live log.
   - **Docker:** Settings → Firewall → Network → Build images → Start containers → Ready
   - **Ubuntu:** Database → Settings → Firewall → Service → Dependencies → Build → Start

   Building takes **10–25 minutes**. You can close the page; the install keeps going. Open the same
   link again to see the progress.

## 3. Finish

When it's done, click **Open my CAD** and **register the first account: it becomes the owner of
the CAD.** Then click **Close setup wizard**, which stops the wizard and closes its port. The CAD
keeps running and starts again after a reboot.

If a step fails, the wizard shows the error:

- **Change settings** (when nothing was started yet): fix the setting and install again.
- **Retry** (once the CAD was started): Docker rebuilds the images and starts the containers again;
  Ubuntu restarts the `snailycad` service, which picks up where the build stopped. Your settings
  and database are kept.

## Where everything is

Everything lives in **`/opt/snailycad`**:

| Path                                    | What                                                   |
| --------------------------------------- | ------------------------------------------------------ |
| `/opt/snailycad/app`                    | The CAD's code and its `.env`                          |
| `/opt/snailycad/runtime`                | Ubuntu: the private Node.js and pnpm                   |
| `/opt/snailycad/app/.data`              | Docker: the MariaDB data                               |
| `/opt/snailycad/app/start.log`          | Ubuntu: the CAD's install, build and run log           |
| `/opt/snailycad/installer/install.log`  | Every command the wizard ran                           |
| `/opt/snailycad/installer/manifest.env` | Everything the installer added **outside** this folder |
| `/opt/snailycad/uninstall.sh`           | Removes all of it again                                |

### Managing an Ubuntu (standalone) install

The CAD runs as the systemd service **`snailycad`**:

| What                                          | Command                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| Status                                        | `systemctl status snailycad`                                       |
| Restart (also rebuilds when the code changed) | `sudo systemctl restart snailycad`                                 |
| Stop / start                                  | `sudo systemctl stop snailycad` / `sudo systemctl start snailycad` |
| Live log                                      | `tail -f /opt/snailycad/app/start.log`                             |

To update, use **Admin → Dashboard → Update CAD** in the CAD. While it builds, the website shows
a progress page instead of an error.

For a Docker install, see [managing the CAD](install-docker.md#managing-the-cad).

## Uninstalling

The easiest way: as the CAD owner, open **Admin → Dashboard → Danger zone** and click **Uninstall
SnailyCAD**. It lists everything the installer added (the CAD, its database, Node.js and pnpm,
MariaDB or Docker if the wizard installed them, packages, firewall rules and download caches).
Untick anything you want to keep, for example the database, type the CAD's name and confirm. The
CAD then removes itself; the page tells you when it's gone. This works on Ubuntu (standalone) and
Windows installs; for Docker, use the command below on the server.

Or from the command line:

```bash
sudo bash /opt/snailycad/uninstall.sh
```

Add `--keep=database,runtime` (any of `database`, `db-server`, `docker`, `runtime`, `caches`,
`firewall`, `pkg:<package>`) to leave those in place, and `--yes` to skip the question.

It lists what it will remove and asks first. It removes the CAD and **its database (all CAD
data)**, the `snailycad` service or the Docker containers and images, the firewall rules it opened,
the packages the wizard installed (Docker or MariaDB included), and the `/opt/snailycad` folder. A
database server or Docker that was already on the server is kept; only the CAD's own database and
user are removed from it. A database on **another** server is left alone: drop it there yourself.

## Windows

### Requirements

- **Windows 10** (version 1809 or newer) or **Windows 11**, 64-bit (x64), and an administrator
  account
- **winget** ("App Installer" from the Microsoft Store). It comes with Windows 11 and recent
  Windows 10. If it's missing, the installer tells you; get it from
  [aka.ms/getwinget](https://aka.ms/getwinget) and run the line again.
- About **4 GB of RAM** (plus page file) for building, and **8 GB of free disk space**

### What the command does

1. If PowerShell isn't running as administrator, it asks (a UAC prompt) and continues in a new
   administrator window.
2. Checks Windows version, x64, free disk space and winget.
3. Installs **Python 3.12** with winget if no Python 3 is installed (the setup wizard runs on it).
4. Downloads the setup wizard into `C:\SnailyCAD\installer`, allows the wizard's port `3100` in
   Windows Firewall, starts the wizard in the background and opens it in your browser at
   `http://localhost:3100/?token=…`. It also prints a link for other PCs on your network.

### The wizard on Windows

The steps are the same as on Ubuntu, with these differences:

- **Method**: standalone only. Docker Desktop needs WSL 2 and several restarts, so it isn't offered.
- **Requirements**: **Git** (winget `Git.Git`), **Node.js 22** (a private copy in
  `C:\SnailyCAD\runtime`, a Node.js you already have is not touched) and **pnpm 9**.
- **Database**:
  - **Install MariaDB for me**: installs MariaDB with winget (`MariaDB.Server`, Windows service
    `MariaDB`, port 3306) with a random root password, then creates the database. The root
    password is in `C:\SnailyCAD\installer\mariadb-root-password.txt`. Shown when no MySQL/MariaDB is
    on the PC.
  - **Connect to another database server**: a MySQL 8 / MariaDB 10.6+ you already have, on this
    PC (`127.0.0.1`) or another one. Enter a user that may create the database.
- **Install**: Database → Settings → Firewall → Dependencies → Build → Service → Start. The wizard
  installs and builds the CAD itself, then starts it as a service.
- **Service**: the CAD runs as the Windows service **`snailycad`**, made with
  [NSSM](https://nssm.cc) (winget `NSSM.NSSM`). It starts at boot without anyone logged in,
  restarts the CAD if it stops, and logs to `C:\SnailyCAD\logs\cad.log`. If NSSM can't be
  downloaded, a scheduled task (`\SnailyCAD\snailycad`, runs as SYSTEM at startup) is used instead.
- **Firewall**: Windows Firewall rules `SnailyCAD-snailycad-<port>` for the website and API ports.
  A router or hosting firewall in front of the PC still needs its own port forwards.

To update, use **Admin → Dashboard → Update CAD** in the CAD, or double-click
**`C:\SnailyCAD\Update SnailyCAD.bat`** on the PC (it asks for administrator rights and shows the
progress in its window, then opens the CAD). Either way the CAD is offline for 10–25 minutes while
it builds, and the website shows a progress page. A CAD installed before this existed gets the
`.bat` the first time an updated CAD starts; update that one by hand once (see below).

### Where everything is

| Path                                  | What                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `C:\SnailyCAD\app`                    | The CAD's code and its `.env`                          |
| `C:\SnailyCAD\runtime`                | The private Node.js, pnpm, its package store, NSSM     |
| `C:\SnailyCAD\logs\cad.log`           | The CAD's log                                          |
| `C:\SnailyCAD\installer\install.log`  | Every command the wizard ran                           |
| `C:\SnailyCAD\installer\wizard.log`   | The setup wizard's own log                             |
| `C:\SnailyCAD\installer\manifest.env` | Everything the installer added **outside** this folder |
| `C:\SnailyCAD\Update SnailyCAD.bat`   | Double-click to update the CAD                         |
| `C:\SnailyCAD\logs\update.log`        | The last updates' log                                  |
| `C:\SnailyCAD\uninstall.ps1`          | Removes all of it again                                |

### Managing the CAD on Windows

| What         | Command (PowerShell as administrator)                  |
| ------------ | ------------------------------------------------------ |
| Status       | `Get-Service snailycad`                                |
| Restart      | `Restart-Service snailycad`                            |
| Stop / start | `Stop-Service snailycad` / `Start-Service snailycad`   |
| Live log     | `Get-Content C:\SnailyCAD\logs\cad.log -Wait -Tail 50` |

You can also use **services.msc**. After changing `C:\SnailyCAD\app\.env`, rebuild in
`C:\SnailyCAD\app` and restart the service.

### Uninstalling on Windows

In PowerShell or cmd, as administrator:

```bat
powershell -ExecutionPolicy Bypass -File C:\SnailyCAD\uninstall.ps1
```

It lists what it will remove and asks first. It removes the `snailycad` service (or scheduled
task), the firewall rules, the CAD's database, MariaDB if the wizard installed it (with all its
data), the programs it installed with winget (Python, Git, NSSM; not ones you already had) and
`C:\SnailyCAD`. Add `-KeepMariaDB` to keep MariaDB (only the CAD's database and user are dropped;
the root password is shown), `-Keep "database,runtime"` to keep any of `database`, `db-server`,
`runtime`, `firewall` or `pkg:<winget id>`, and `-Yes` to skip the question. The Danger zone on the
admin dashboard does the same with checkboxes.

### Windows options

Set these in the same PowerShell window before the `irm` line, for example
`$env:SNAILY_WIZARD_PORT = '3200'`:

| Variable             | Default        | What                       |
| -------------------- | -------------- | -------------------------- |
| `SNAILY_NAME`        | `snailycad`    | Service name               |
| `SNAILY_DIR`         | `C:\SnailyCAD` | Install folder             |
| `SNAILY_WIZARD_PORT` | `3100`         | Port of the setup wizard   |
| `SNAILY_REPO`        | the repo below | Repository to install from |
| `SNAILY_BRANCH`      | `main`         | Branch to install          |

## Options

Set these in front of `bash`, for example
`curl -fsSL …/install-ubuntu.sh | sudo SNAILY_NAME=cad2 SNAILY_WIZARD_PORT=3200 bash`:

| Variable             | Default                                            | What                                                |
| -------------------- | -------------------------------------------------- | --------------------------------------------------- |
| `SNAILY_NAME`        | `snailycad`                                        | Install name: folder `/opt/<name>` and service name |
| `SNAILY_DIR`         | `/opt/$SNAILY_NAME`                                | Install folder                                      |
| `SNAILY_WIZARD_PORT` | `3100`                                             | Port of the setup wizard                            |
| `SNAILY_REPO`        | `https://github.com/EWANZO101/snailycad-mysql.git` | Repository to install from                          |
| `SNAILY_BRANCH`      | `main`                                             | Branch to install                                   |

With a different `SNAILY_NAME` you can run several Ubuntu (standalone) CADs on one server. Only
one Docker install fits on a server, because its container names are fixed.
