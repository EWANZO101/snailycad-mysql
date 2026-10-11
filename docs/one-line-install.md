<!-- Copy of the docs site's installations/methods/one-line-install.mdx; keep both in sync. -->

# One-line install (Ubuntu)

Install SnailyCADv4 on an Ubuntu server with **one command**. The command starts a setup wizard in
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

```bash
sudo bash /opt/snailycad/uninstall.sh
```

It lists what it will remove and asks first. It removes the CAD and **its database (all CAD
data)**, the `snailycad` service or the Docker containers and images, the firewall rules it opened,
the packages the wizard installed (Docker or MariaDB included), and the `/opt/snailycad` folder. A
database server or Docker that was already on the server is kept; only the CAD's own database and
user are removed from it. A database on **another** server is left alone: drop it there yourself.

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
