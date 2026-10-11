<!-- Copy of docs/installations/methods/docker.mdx from the docs site; keep both in sync. -->

# Docker installation (MySQL / MariaDB edition)

There are two ways to run SnailyCADv4 in Docker:

- **[One-line installer](#one-line-installer-recommended)** (Ubuntu servers, recommended): one
  command, then a setup wizard in your browser installs Docker and everything else with buttons.
- **[By hand](#manual-installation)** (any OS with Docker, including Windows with Docker Desktop).

Both run the same three containers: **MariaDB 11.4**, the **API** and the **client** (website).

> **MySQL / MariaDB edition**
>
> These steps install the MySQL/MariaDB edition from
> [github.com/EWANZO101/snailycad-mysql](https://github.com/EWANZO101/snailycad-mysql). See
> [MySQL / MariaDB edition](../MYSQL-PORT.md) for how it differs from the
> standard edition.

## One-line installer (recommended)

### Requirements

- A server running **Ubuntu 22.04 or 24.04** (Debian works but isn't tested), with root access
  (`sudo`)
- At least **2 vCPUs**, about **4 GB of RAM + swap** for building, and **8 GB of free disk space**
- Nothing else: the wizard installs Docker, Docker Compose and Git for you

### 1. Run the installer

Connect to your server over SSH and run:

```bash
curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.sh | sudo bash
```

This only downloads and starts the setup wizard. When it's done it prints a link:

```text
SnailyCAD setup wizard is running. Open this link in your browser:

    http://203.0.113.10:3100/?token=6bfb6ec923b2c4f68e55cb529d5cfb9bd9ef
```

Open that link in your browser. The `token` part keeps other people out of the wizard, so don't
share the link. If you use the `ufw` firewall, the installer opens port `3100` for the wizard and
closes it again when you finish.

> **Can't reach the link?**
>
> Your hosting provider may have its own firewall in front of the server. Allow TCP port `3100` there
> too, or pick another port with `SNAILY_WIZARD_PORT` (see [installer options](#installer-options)).

### 2. Follow the setup wizard

The wizard walks you through seven steps. Each one has **Back** and **Next** buttons.

1. **Server**: checks the operating system, CPU, memory, disk space and systemd. A red ✕ must be
   fixed before you can continue; a yellow ! is only a warning.
2. **Method**: choose **Docker**. (**Standalone** runs the CAD directly with Node.js instead.)
3. **Requirements**: everything the CAD needs, each with its own **Install** button:
   - **System tools**: git, curl, xz-utils, ca-certificates
   - **Docker Engine** (`docker.io` from Ubuntu)
   - **Docker Compose** (`docker-compose-v2` from Ubuntu)
   - **SnailyCAD**: downloads the CAD's code

   Click **Install** next to each one, or **Install all missing**. A live log shows what's happening.
   **Next** unlocks when everything has a green ✓.

4. **Database**: with Docker this is always a **MariaDB container**. Choose the database name and
   user; a random password is generated for you.
5. **Website**: the server's IP and two free ports are filled in for you: one for the website, one
   for the API. You see the final URLs as you type. Use the IP for now; you can
   [add a domain](#using-a-domain) later.
6. **Review**: check the settings, then click **Install SnailyCAD**.
7. **Install**: follow the progress, step by step, with a live log:
   - **Settings**: writes the `.env` file and copies it to the API and the client
   - **Firewall**: opens the website and API ports (when `ufw` is active)
   - **Network**: creates the `cad_web` Docker network
   - **Build images**: builds the API and website images. **This takes 10–25 minutes.**
   - **Start containers**: starts MariaDB, then the API and the website
   - **Ready**: waits until the CAD answers

You can close the page while it installs; the install keeps going. Open the same link again to see
the progress.

### 3. Finish

When the install is done, click **Open my CAD** and **register the first account: it becomes the
owner of the CAD.** Then click **Close setup wizard**. That stops the wizard and closes its port.
The CAD keeps running and starts again on its own after a reboot.

If a step fails, the wizard shows the error and what to do:

- **Before the images are built** (settings, firewall, network): click **Change settings**, fix
  the problem and install again.
- **From the image build on**: click **Retry**. It rebuilds the images, reusing the steps that
  already worked, and starts the containers again with the same settings. Your database is kept.

### Where everything is

Everything lives in **`/opt/snailycad`**:

| Path                                    | What                                                       |
| --------------------------------------- | ---------------------------------------------------------- |
| `/opt/snailycad/app`                    | The CAD's code, `.env` and `production.docker-compose.yml` |
| `/opt/snailycad/app/.data`              | The MariaDB data (your CAD's database)                     |
| `/opt/snailycad/installer/install.log`  | The full log of every command the wizard ran               |
| `/opt/snailycad/installer/manifest.env` | Everything the installer added **outside** this folder     |
| `/opt/snailycad/uninstall.sh`           | Removes all of it again                                    |

The MariaDB container is only reachable from the server itself, on `127.0.0.1` and the port shown
in the install log (`DB_HOST_PORT` in `.env`). Use that to connect a database tool over an SSH
tunnel.

### Uninstalling

```bash
sudo bash /opt/snailycad/uninstall.sh
```

It lists what it will remove and asks before doing anything. It removes:

- the containers, the images and **the database** (all CAD data)
- the `cad_web` network, unless other containers still use it
- the firewall rules it opened
- **Docker itself, if the wizard installed it**. A Docker that was already on the server is kept,
  with everything else in it.
- the `/opt/snailycad` folder

Make a backup of the database first if you want to keep the data (see [backups](#backups)).

### Installer options

Set these in front of `bash`, for example
`curl -fsSL …/install.sh | sudo SNAILY_WIZARD_PORT=3200 bash`:

| Variable             | Default                                            | What                                                        |
| -------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| `SNAILY_NAME`        | `snailycad`                                        | Install name: folder `/opt/<name>` and Compose project name |
| `SNAILY_DIR`         | `/opt/$SNAILY_NAME`                                | Install folder                                              |
| `SNAILY_WIZARD_PORT` | `3100`                                             | Port of the setup wizard                                    |
| `SNAILY_REPO`        | `https://github.com/EWANZO101/snailycad-mysql.git` | Repository to install from                                  |
| `SNAILY_BRANCH`      | `main`                                             | Branch to install                                           |

> **One Docker install per server**
>
> The container names (`snaily-cad-mariadb`, `snaily-cad-api`, `snaily-cad-client`) are fixed, so
> only one Docker install can run on a server. For a second CAD on the same server, use the
> **Standalone** method with another `SNAILY_NAME`.

## Manual installation

Use this on Windows (with [Docker Desktop](https://docker.com/get-started)), on other Linux
distributions, or if you'd rather run each command yourself.

### Requirements

- [Git](https://git-scm.com/downloads) ([Linux guide](https://docs.snailycad.org/docs/guides/requirements/how-to-install-git-linux))
- [Docker](https://docker.com/get-started) with Docker Compose v2 (`docker compose version` works)

> **Warning**
>
> Don't install SnailyCADv4 in the root folder of your drive. Use your **Documents** folder on
> Windows (`cd Documents`) or your **home** folder on Linux (`cd ~`).

### 1. Get the code

```bash
git clone https://github.com/EWANZO101/snailycad-mysql.git snaily-cadv4
cd snaily-cadv4
```

### 2. Configure `.env`

**Windows:** `copy .env.example .env` **Linux:** `cp .env.example .env`

Open `.env` and set at least these values:

```bash title=".env"
# the database runs in the "mariadb" container, on its default port
DB_HOST="mariadb"
DB_PORT="3306"
DB_NAME="snailycad"
DB_USER="snailycad"
# letters and numbers only: it ends up inside a URL
DB_PASSWORD="change-me-to-something-long"

# random values; ENCRYPTION_TOKEN must be exactly 32 characters
JWT_SECRET="a-long-random-string"
ENCRYPTION_TOKEN="Geu2WGypP7irbwa3tCeeKS6YiyluFLep"

# where people open the CAD and where the API is (keep /v1)
CORS_ORIGIN_URL="http://203.0.113.10:3000"
NEXT_PUBLIC_CLIENT_URL="http://203.0.113.10:3000"
NEXT_PUBLIC_PROD_ORIGIN="http://203.0.113.10:8080/v1"

PORT_CLIENT=3000
PORT_API=8080
```

Two optional values control how MariaDB is reachable **from the server itself**:

- `DB_HOST_PORT`: the server port for the database. Defaults to `DB_PORT`. Change it when the server
  already runs MySQL/MariaDB on `3306`, for example `DB_HOST_PORT="3308"`. The containers keep
  using `DB_PORT`.
- `DB_BIND`: defaults to `127.0.0.1`, so the database is not reachable from the internet. Set
  `DB_BIND="0.0.0.0"` only if other machines must connect to it, and protect it with a firewall.

See the [`.env` reference](https://docs.snailycad.org/docs/guides/env/reference) for every value.

### 3. Copy the settings to the apps

The images read their settings from `apps/client/.env` and `apps/api/.env`. If you have Node.js
and the CAD's packages, run `node scripts/copy-env.mjs --client --api`. Without Node.js, copy the
file yourself:

**Linux:**

```bash
cp .env apps/client/.env && cp .env apps/api/.env
```

**Windows:**

```bash
copy .env apps\client\.env && copy .env apps\api\.env
```

If you changed `PORT_CLIENT` from `3000`, also change the `start` script in
`apps/client/package.json` to `"pnpm next start -p <your port>"`. (`copy-env.mjs` does that for
you.)

### 4. Create the network, build and start

```bash
docker network create cad_web
docker compose -f production.docker-compose.yml build
docker compose -f production.docker-compose.yml up -d
```

The build takes 10–25 minutes. On the first start, MariaDB creates the database and user from your
`.env`, then the API creates all tables.

> **Warning**
>
> Run the `build` command again **every time you change `.env`**: the website's URLs are built
> into the image.

### 5. Open the CAD

Open `NEXT_PUBLIC_CLIENT_URL` in your browser and **register the first account: it becomes the
owner of the CAD.**

> **Ports**
>
> The client and API ports must be open in your firewall (and your hosting provider's firewall) if
> you don't use a [reverse proxy](https://docs.snailycad.org/docs/installations/reverse-proxies/nginx).
> You can't use `localhost` to reach the CAD from another computer: use the server's IP.

## Managing the CAD

Run these in the folder with `production.docker-compose.yml` (`/opt/snailycad/app` for the
one-line installer). The installer names the Compose project after `SNAILY_NAME`, so add
`-p snailycad` to `docker compose` commands for an installer-made CAD.

| What            | Command                                                   |
| --------------- | --------------------------------------------------------- |
| Status          | `docker ps --format '{{.Names}}  {{.Status}}'`            |
| Logs (all)      | `docker compose -f production.docker-compose.yml logs -f` |
| API log         | `docker logs -f snaily-cad-api`                           |
| Stop            | `docker compose -f production.docker-compose.yml down`    |
| Start           | `docker compose -f production.docker-compose.yml up -d`   |
| Restart the API | `docker restart snaily-cad-api`                           |

`down` keeps your data: it lives in the `.data` folder next to the Compose file.

### Updating

```bash
git pull
docker compose -f production.docker-compose.yml build
docker compose -f production.docker-compose.yml up -d
```

The old containers keep running while the new images build. The API applies new database
migrations when it starts. See [updating with Docker](https://docs.snailycad.org/docs/installations/updating/methods/docker)
for more.

### Backups

```bash
docker exec snaily-cad-mariadb sh -c 'mariadb-dump -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' > snailycad-backup.sql
```

Restore into a running CAD:

```bash
docker exec -i snaily-cad-mariadb sh -c 'mariadb -u"$MARIADB_USER" -p"$MARIADB_PASSWORD" "$MARIADB_DATABASE"' < snailycad-backup.sql
```

### Using a domain

Point a DNS record at the server, set up a [reverse proxy](https://docs.snailycad.org/docs/installations/reverse-proxies/nginx)
for the client and API ports, then change `CORS_ORIGIN_URL`, `NEXT_PUBLIC_CLIENT_URL`,
`NEXT_PUBLIC_PROD_ORIGIN` and `DOMAIN` in `.env`, copy it to the apps again
([step 3](#3-copy-the-settings-to-the-apps)) and rebuild.

## Troubleshooting

**The API container keeps restarting.** Look at its log: `docker logs --tail 50 snaily-cad-api`.

- `Can't reach database server` or `Access denied`: the `DB_*` values don't match what MariaDB was
  first started with. MariaDB only reads `DB_USER`, `DB_PASSWORD` and `DB_NAME` on its **first**
  start; changing them later doesn't change the existing database.
- `Prisma failed to detect the libssl/openssl version` followed by `Schema engine error`: your
  images were built from an older `Dockerfile` without OpenSSL. Run `git pull`, then build and start
  again.

**The website shows but nothing loads or you can't log in.** `NEXT_PUBLIC_PROD_ORIGIN` must be the
API's address as your **browser** sees it (the server's IP or domain, with `/v1`), and the API port
must be open. After changing it, rebuild.

**Port already in use.** Another program uses `PORT_CLIENT`, `PORT_API` or the database port.
Pick other ports in `.env` (for the database, use `DB_HOST_PORT`), then build and start again.

**Docker and `ufw`.** Ports published by Docker are reachable even when `ufw` doesn't allow them,
because Docker manages its own firewall rules. That's why the database is bound to `127.0.0.1` by
default.
