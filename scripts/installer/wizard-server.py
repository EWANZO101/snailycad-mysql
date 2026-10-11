#!/usr/bin/env python3
"""SnailyCAD setup wizard: a step-by-step install page served on the server's IP.

Started by scripts/installer/install.sh. Written for the python3 that every Ubuntu ships, with no
dependencies, so that everything else (system tools, Node.js, pnpm, Docker, the CAD itself) can
be installed from the page with a button.

Two install methods:
- standalone: a private Node.js + pnpm in <install dir>/runtime, MySQL/MariaDB on the host, and
  a systemd service running start.sh (which installs, builds and starts the CAD and writes the
  status files this wizard follows);
- docker: production.docker-compose.yml (MariaDB, API and client containers).

Every change made outside the install folder is written to installer/manifest.env before it is
made, so uninstall.sh can remove it again. Access needs the token install.sh printed
(?token=..., then kept in a cookie).
"""
import hashlib
import hmac
import json
import os
import re
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import threading
import time
import traceback
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

INSTALL_DIR = os.environ.get("SNAILY_INSTALL_DIR")
if not INSTALL_DIR:
    sys.exit("SNAILY_INSTALL_DIR is not set; start this through install.sh.")
APP_DIR = os.path.join(INSTALL_DIR, "app")
NODE_DIR = os.path.join(INSTALL_DIR, "runtime", "node")
NODE_BIN = os.path.join(NODE_DIR, "bin")
INSTALLER_DIR = os.path.join(INSTALL_DIR, "installer")
MANIFEST_PATH = os.path.join(INSTALLER_DIR, "manifest.env")
TOKEN_PATH = os.path.join(INSTALLER_DIR, "token")
RAW_LOG_PATH = os.path.join(INSTALLER_DIR, "install.log")
STATE_PATH = os.path.join(INSTALLER_DIR, "state.json")
STATUS_DIR = os.path.join(APP_DIR, ".snaily-cache", "status")
PAGE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wizard.html")
COMPOSE_FILE = "production.docker-compose.yml"
PORT = int(os.environ.get("SNAILY_WIZARD_PORT", "3100"))
NODE_MAJOR = os.environ.get("SNAILY_NODE_MAJOR", "22")
PNPM_VERSION = "9.0.4"
COOKIE = "snaily_wizard"
# the wizard shuts itself down after this long, finished or not
MAX_RUNTIME_SECONDS = 12 * 60 * 60

with open(TOKEN_PATH) as f:
    TOKEN = f.read().strip()

SAFE_NAME = re.compile(r"^[A-Za-z0-9_]{1,32}$")
HOSTNAME = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$")
APT_ENV = {"DEBIAN_FRONTEND": "noninteractive"}
APT_OPTS = ["-y", "-q", "-o", "DPkg::Lock::Timeout=300"]

lock = threading.Lock()


# --- manifest ---------------------------------------------------------------------------


def read_manifest():
    entries = []
    with open(MANIFEST_PATH) as f:
        for line in f:
            match = re.match(r"^([A-Z_]+)=(.*)$", line.rstrip("\n"))
            if match:
                entries.append((match.group(1), match.group(2)))
    return entries


def manifest_value(key):
    values = [v for k, v in read_manifest() if k == key]
    return values[-1] if values else None


def add_to_manifest(key, value):
    if (key, str(value)) in read_manifest():
        return
    with open(MANIFEST_PATH, "a") as f:
        f.write(f"{key}={value}\n")


def set_in_manifest(key, value):
    with open(MANIFEST_PATH) as f:
        kept = [line for line in f.read().split("\n") if not line.startswith(f"{key}=")]
    kept = [line for line in kept if line] + [f"{key}={value}"]
    with open(MANIFEST_PATH, "w") as f:
        f.write("\n".join(kept) + "\n")


def remove_from_manifest(key, value):
    with open(MANIFEST_PATH) as f:
        kept = [line for line in f.read().split("\n") if line and line != f"{key}={value}"]
    with open(MANIFEST_PATH, "w") as f:
        f.write("\n".join(kept) + "\n")


NAME = manifest_value("NAME") or "snailycad"
REPO = manifest_value("REPO") or ""
BRANCH = manifest_value("BRANCH") or "main"


# --- log --------------------------------------------------------------------------------

LINES = []
SECRET = re.compile(r"((?:token|secret|password|passwd|key|auth|cookie|session|dsn)[\w-]*\s*[=:]\s*)\S+", re.I)
URL_CREDENTIALS = re.compile(r"(\w+://)[^/\s:@]+:[^/\s@]+@")
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def sanitize(text):
    return URL_CREDENTIALS.sub(r"\1••••@", SECRET.sub(r"\1••••", text))[:180]


def say(text, level="info"):
    text = sanitize(text)
    if LINES and LINES[-1]["text"] == text:
        return  # e.g. the same build step reported for both images
    LINES.append({"t": int(time.time()), "level": level, "text": text})
    del LINES[:-120]
    print(f"[{level}] {text}", flush=True)


def raw_log(text):
    with open(RAW_LOG_PATH, "a") as f:
        f.write(text)
    os.chmod(RAW_LOG_PATH, 0o600)


# --- helpers ----------------------------------------------------------------------------


class StepError(Exception):
    pass


def env_with(extra=None):
    env = dict(os.environ)
    env["PATH"] = f"{NODE_BIN}:{env.get('PATH', '/usr/bin:/bin')}"
    env.update(extra or {})
    return env


def run(cmd, env=None, timeout=600, cwd=None, on_line=None):
    """Runs cmd; returns (ok, output). Output also goes to the raw install log."""
    raw_log(f"\n$ {' '.join(cmd)}\n")
    try:
        proc = subprocess.Popen(
            cmd, cwd=cwd, env=env_with(env), stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, errors="replace",
        )
    except FileNotFoundError:
        return False, f"{cmd[0]} not found"
    output = []
    deadline = time.time() + timeout
    for line in proc.stdout:
        raw_log(line)
        output.append(line)
        del output[:-200]
        if on_line:
            on_line(ANSI.sub("", line).rstrip())
        if time.time() > deadline:
            proc.kill()
            return False, "timed out"
    proc.wait()
    return proc.returncode == 0, "".join(output)


def check(result, message):
    ok, output = result
    if not ok:
        detail = next((l for l in reversed(output.strip().split("\n")) if l.strip()), "")
        raise StepError(f"{message}: {detail[:200]}" if detail else message)
    return output


def quiet(cmd, timeout=20):
    try:
        p = subprocess.run(cmd, env=env_with(), capture_output=True, text=True, timeout=timeout)
        return p.returncode == 0, p.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False, ""


def has_command(name):
    return shutil.which(name, path=env_with()["PATH"]) is not None


def package_installed(package):
    ok, out = quiet(["dpkg-query", "-W", "-f=${Status}", package])
    return ok and "install ok installed" in out


def port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("0.0.0.0", port))
            return True
        except OSError:
            return False


def first_free_port(start, skip=()):
    for port in range(start, start + 200):
        if port != PORT and port not in skip and port_free(port):
            return port
    return None


def server_ip():
    ok, out = quiet(["hostname", "-I"])
    for address in out.split():
        if re.match(r"^\d+(\.\d+){3}$", address):
            return address
    return "127.0.0.1"


def ufw_active():
    return has_command("ufw") and "Status: active" in quiet(["ufw", "status"])[1]


def read_json(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def random_hex(n):
    return secrets.token_hex(n)


def apt_install(packages, label):
    """Installs the missing ones of `packages`, recording each in the manifest first."""
    missing = [p for p in packages if not package_installed(p)]
    if not missing:
        return
    for package in missing:
        add_to_manifest("APT_PACKAGE", package)
    say(f"Installing {label} ({', '.join(missing)})...")
    check(run(["apt-get", "update", "-q"], env=APT_ENV, timeout=600), "apt-get update failed")
    check(run(["apt-get", "install", *APT_OPTS, *missing], env=APT_ENV, timeout=1200), f"Could not install {label}")


# --- requirements -----------------------------------------------------------------------


def method():
    return manifest_value("METHOD")


def node_version():
    ok, out = quiet([os.path.join(NODE_BIN, "node"), "-v"])
    return out if ok else None


def pnpm_version():
    if not node_version():
        return None
    ok, out = quiet([os.path.join(NODE_BIN, "pnpm"), "-v"])
    return out if ok else None


def docker_version():
    ok, out = quiet(["docker", "version", "--format", "{{.Server.Version}}"])
    return out if ok and out else None


def compose_version():
    ok, out = quiet(["docker", "compose", "version", "--short"])
    return out if ok and out else None


TOOL_PACKAGES = ["git", "curl", "xz-utils", "ca-certificates"]


def source_version():
    if not os.path.isdir(os.path.join(APP_DIR, ".git")):
        return None
    ok, out = quiet(["git", "-C", APP_DIR, "log", "-1", "--format=%h %cs"])
    return f"{BRANCH} @ {out}" if ok else BRANCH


def requirements():
    tools_missing = [p for p in TOOL_PACKAGES if not package_installed(p)]
    items = [{
        "id": "tools", "title": "System tools", "detail": "git, curl, xz-utils, ca-certificates (from Ubuntu)",
        "version": None if tools_missing else "installed", "needs": [],
    }]
    if method() == "docker":
        items += [
            {"id": "docker", "title": "Docker Engine", "detail": "docker.io from Ubuntu",
             "version": docker_version(), "needs": []},
            {"id": "compose", "title": "Docker Compose", "detail": "docker-compose-v2 from Ubuntu",
             "version": compose_version(), "needs": ["docker"]},
        ]
    else:
        items += [
            {"id": "node", "title": f"Node.js {NODE_MAJOR}", "detail": "Private copy in the install folder; the system Node.js is not touched",
             "version": node_version(), "needs": ["tools"]},
            {"id": "pnpm", "title": f"pnpm {PNPM_VERSION}", "detail": "Package manager the CAD is built with",
             "version": pnpm_version(), "needs": ["node"]},
        ]
    items.append({"id": "source", "title": "SnailyCAD", "detail": f"The CAD's code, branch {BRANCH}",
                  "version": source_version(), "needs": ["tools"]})
    for item in items:
        item["installed"] = item["version"] is not None
        item["state"] = "installed" if item["installed"] else "missing"
        if BUSY.get("req") == item["id"]:
            item["state"] = "installing"
        elif REQ_ERRORS.get(item["id"]):
            item["state"] = "failed"
            item["error"] = REQ_ERRORS[item["id"]]
    return items


def install_tools():
    apt_install(TOOL_PACKAGES, "system tools")


def install_node():
    base = f"https://nodejs.org/dist/latest-v{NODE_MAJOR}.x"
    arch = {"x86_64": "x64", "aarch64": "arm64", "arm64": "arm64"}.get(os.uname().machine)
    if not arch:
        raise StepError(f"Unsupported CPU architecture: {os.uname().machine}")
    say(f"Looking up the latest Node.js {NODE_MAJOR}...")
    try:
        sums = urllib.request.urlopen(f"{base}/SHASUMS256.txt", timeout=30).read().decode()
    except OSError as error:
        raise StepError(f"Could not reach nodejs.org: {error}")
    match = re.search(rf"^([0-9a-f]{{64}})\s+(node-v[\d.]+-linux-{arch}\.tar\.xz)$", sums, re.M)
    if not match:
        raise StepError(f"No Node.js {NODE_MAJOR} download for linux-{arch}.")
    digest, filename = match.groups()
    target = os.path.join(INSTALL_DIR, "runtime", filename)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    say(f"Downloading {filename}...")
    sha = hashlib.sha256()
    with urllib.request.urlopen(f"{base}/{filename}", timeout=60) as response, open(target, "wb") as out:
        while chunk := response.read(1 << 20):
            sha.update(chunk)
            out.write(chunk)
    if sha.hexdigest() != digest:
        os.remove(target)
        raise StepError("Node.js download checksum mismatch.")
    say("Checksum OK, unpacking...")
    shutil.rmtree(NODE_DIR, ignore_errors=True)
    staging = NODE_DIR + ".tmp"
    shutil.rmtree(staging, ignore_errors=True)
    with tarfile.open(target, "r:xz") as archive:
        if hasattr(tarfile, "tar_filter"):
            archive.extractall(staging, filter="tar")
        else:
            archive.extractall(staging)
    os.rename(os.path.join(staging, filename[: -len(".tar.xz")]), NODE_DIR)
    os.rmdir(staging)
    os.remove(target)
    say(f"Node.js {node_version()} installed.")


def install_pnpm():
    check(run([os.path.join(NODE_BIN, "npm"), "install", "-g", "--no-fund", "--no-audit", f"pnpm@{PNPM_VERSION}"],
              timeout=600), "Could not install pnpm")
    say(f"pnpm {pnpm_version()} installed.")


def install_docker():
    if not has_command("docker"):
        add_to_manifest("APT_DOCKER", "1")  # ours: uninstall.sh removes Docker with its data
    apt_install(["docker.io"], "Docker Engine")
    check(run(["systemctl", "enable", "--now", "docker"]), "Could not start Docker")
    say(f"Docker {docker_version()} running.")


def install_compose():
    apt_install(["docker-compose-v2"], "Docker Compose")
    say(f"Docker Compose {compose_version()} installed.")


def install_source():
    if os.path.isdir(APP_DIR):
        shutil.rmtree(APP_DIR)  # a failed earlier clone
    source = REPO
    if os.path.isdir(REPO):
        source = "file://" + os.path.abspath(REPO)  # keeps --depth working for local paths
    say(f"Downloading SnailyCAD ({BRANCH})...")
    check(run(["git", "clone", "-q", "--depth", "1", "--branch", BRANCH, source, APP_DIR], timeout=900),
          "Could not download SnailyCAD")
    say(f"SnailyCAD downloaded: {source_version()}.")


INSTALLERS = {
    "tools": install_tools, "node": install_node, "pnpm": install_pnpm,
    "docker": install_docker, "compose": install_compose, "source": install_source,
}
BUSY = {}
REQ_ERRORS = {}


def install_requirements(ids):
    try:
        for req_id in ids:
            BUSY["req"] = req_id
            REQ_ERRORS.pop(req_id, None)
            try:
                INSTALLERS[req_id]()
            except StepError as error:
                REQ_ERRORS[req_id] = str(error)
                say(str(error), "error")
                return
            except Exception as error:  # noqa: BLE001 - shown to the user, details in the journal
                traceback.print_exc()
                REQ_ERRORS[req_id] = f"Unexpected error: {error}"
                say(REQ_ERRORS[req_id], "error")
                return
    finally:
        BUSY.pop("req", None)


def start_requirements(req_id):
    items = {item["id"]: item for item in requirements()}
    if req_id == "all":
        ids = [i for i, item in items.items() if not item["installed"]]
    elif req_id in items:
        ids = [n for n in items[req_id]["needs"] if not items[n]["installed"]] + [req_id]
    else:
        raise StepError("Unknown requirement.")
    if not ids:
        return
    threading.Thread(target=install_requirements, args=(ids,), daemon=True).start()


# --- system checks ----------------------------------------------------------------------


def checks():
    release = ""
    if os.path.exists("/etc/os-release"):
        with open("/etc/os-release") as f:
            release = f.read()
    match = re.search(r'^PRETTY_NAME="?([^"\n]+)"?', release, re.M)
    os_name = match.group(1) if match else " ".join(os.uname()[0:3:2])
    meminfo = open("/proc/meminfo").read() if os.path.exists("/proc/meminfo") else ""

    def mb(key):
        m = re.search(rf"^{key}:\s+(\d+)", meminfo, re.M)
        return int(m.group(1)) // 1024 if m else 0

    mem, swap = mb("MemTotal"), mb("SwapTotal")
    st = os.statvfs(INSTALL_DIR)
    disk = round(st.f_bavail * st.f_frsize / 1024 ** 3, 1)
    cpus = os.cpu_count() or 0

    has_server = has_command("mysqld") or has_command("mariadbd")
    socket_root = has_command("mysql") and quiet(["mysql", "-uroot", "-N", "-e", "SELECT 1"])[0]
    client_port = first_free_port(3000)
    api_port = first_free_port(8080, [client_port])
    return {
        "os": os_name,
        "ip": server_ip(),
        "ports": {"client": client_port, "api": api_port},
        "method": method(),
        # chosen by the install command (install-docker.sh / install-ubuntu.sh)
        "methodPreset": manifest_value("METHOD_PRESET") == "1",
        "items": [
            {"label": "Operating system", "value": os_name, "ok": "ubuntu" in os_name.lower(), "warnOnly": True},
            {"label": "CPU", "value": f"{cpus} core(s)", "ok": cpus >= 2, "warnOnly": True, "hint": "2 or more recommended"},
            {"label": "Memory", "value": f"{mem} MB RAM + {swap} MB swap", "ok": mem + swap >= 3800, "warnOnly": True,
             "hint": "the build needs about 4 GB of RAM + swap"},
            {"label": "Free disk space", "value": f"{disk} GB", "ok": disk >= 8, "hint": "at least 8 GB needed"},
            {"label": "Systemd", "value": "available" if has_command("systemctl") else "missing",
             "ok": has_command("systemctl"), "hint": "needed to run the CAD as a service"},
        ],
        "docker": docker_version(),
        "db": {"local": socket_root, "install": not has_server and port_free(3306)},
    }


# --- install job ------------------------------------------------------------------------

STANDALONE_STEPS = [
    ("database", "Database", "Create the database and its user"),
    ("config", "Settings", "Write the CAD's .env file"),
    ("firewall", "Firewall", "Open the website and API ports"),
    ("service", "Service", "Start the CAD as a system service"),
    ("dependencies", "Dependencies", "Download the packages the CAD needs"),
    ("build", "Build", "Compile the website and API (the longest step)"),
    ("start", "Start", "Run database migrations and start the CAD"),
]
DOCKER_STEPS = [
    ("config", "Settings", "Write the CAD's .env file"),
    ("firewall", "Firewall", "Open the website and API ports"),
    ("network", "Network", "Create the Docker network"),
    ("images", "Build images", "Build the API and website images (the longest step)"),
    ("containers", "Start containers", "Start MariaDB, the API and the website"),
    ("ready", "Ready", "Wait for the CAD to answer"),
]

JOB = {"started": False, "failed": None, "startedAt": None, "cadUrl": None, "steps": {}, "method": None}


def job_steps():
    return DOCKER_STEPS if JOB["method"] == "docker" else STANDALONE_STEPS


def validate_settings(body):
    errors = []
    body = body or {}
    db = body.get("db") or {}
    try:
        client_port, api_port = int(body.get("clientPort")), int(body.get("apiPort"))
    except (TypeError, ValueError):
        client_port = api_port = 0
    settings = {"address": str(body.get("address", "")).strip(), "clientPort": client_port, "apiPort": api_port,
                "db": {"mode": db.get("mode")}}
    if not HOSTNAME.match(settings["address"]):
        errors.append("Enter a valid IP address or domain.")
    for label, port in (("Website", client_port), ("API", api_port)):
        if not 1024 <= port <= 65535:
            errors.append(f"{label} port must be 1024-65535.")
        if port == PORT:
            errors.append(f"{label} port is the setup wizard's own port.")
    if client_port == api_port:
        errors.append("Website and API need different ports.")

    mode = db.get("mode")
    expected = ("container",) if method() == "docker" else ("local", "install", "external")
    if mode not in expected:
        errors.append("Choose a database option.")
    elif mode == "external":
        try:
            ext_port = int(db.get("port"))
        except (TypeError, ValueError):
            ext_port = 0
        settings["db"].update(host=str(db.get("host", "")).strip(), port=ext_port, user=str(db.get("user", "")),
                              password=str(db.get("password", "")), name=str(db.get("name", "")))
        if not HOSTNAME.match(settings["db"]["host"]):
            errors.append("Enter the database server's host.")
        if not 1 <= ext_port <= 65535:
            errors.append("Enter the database server's port.")
        if not settings["db"]["user"] or len(settings["db"]["user"]) > 80:
            errors.append("Enter the database user.")
    else:
        settings["db"].update(name=str(db.get("name", "")), user=str(db.get("user", "")))
        if not SAFE_NAME.match(settings["db"]["user"]):
            errors.append("Database user: letters, numbers and _ only.")
    if not SAFE_NAME.match(settings["db"].get("name", "")):
        errors.append("Database name: letters, numbers and _ only.")
    return settings, errors


def socket_mysql(sql):
    return run(["mysql", "-uroot", "-N", "-B", "-e", sql], timeout=60)


def external_mysql(db, sql):
    return run(["mysql", "-h", db["host"], "-P", str(db["port"]), "-u", db["user"], "-N", "-B", "-e", sql],
               env={"MYSQL_PWD": db["password"]}, timeout=60)


def test_external(db):
    if not has_command("mysql"):
        apt_install(["mariadb-client"], "the MySQL client")
    ok, out = external_mysql(db, "SELECT VERSION()")
    if not ok:
        last = next((l for l in reversed(out.strip().split("\n")) if l.strip()), "Could not connect.")
        return {"ok": False, "message": last[:200]}
    return {"ok": True, "message": f"Connected: {out.strip()}"}


def step_database(settings):
    db = settings["db"]
    if db["mode"] == "external":
        result = test_external(db)
        if not result["ok"]:
            raise StepError(result["message"])
        say(result["message"])
        add_to_manifest("DB_NAME", db["name"])
        add_to_manifest("DB_USER", db["user"])
        add_to_manifest("DB_ADMIN", "external")
        # usually allowed; when it isn't, the database must already exist
        external_mysql(db, f"CREATE DATABASE IF NOT EXISTS `{db['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        return {"host": db["host"], "port": db["port"], "user": db["user"], "password": db["password"], "name": db["name"]}

    if db["mode"] == "install":
        add_to_manifest("APT_MARIADB", "1")
        apt_install(["mariadb-server"], "MariaDB")
        check(run(["systemctl", "enable", "--now", "mariadb"]), "Could not start MariaDB")
        say("MariaDB installed and running.")

    check(socket_mysql("SELECT 1"), "Cannot log in to MySQL/MariaDB as root through its socket")
    # created by an earlier attempt of this wizard: reuse it. Anything else is not ours to touch.
    ours = manifest_value("DB_NAME") == db["name"] and manifest_value("DB_USER") == db["user"]
    if not ours:
        if check(socket_mysql(f"SHOW DATABASES LIKE '{db['name']}'"), "Could not list databases").strip():
            raise StepError(f"A database named {db['name']} already exists. Pick another name.")
        count = check(socket_mysql(f"SELECT COUNT(*) FROM mysql.user WHERE user = '{db['user']}'"), "Could not list users")
        if count.strip() != "0":
            raise StepError(f"A user named {db['user']} already exists. Pick another name.")
    add_to_manifest("DB_NAME", db["name"])
    add_to_manifest("DB_USER", db["user"])
    add_to_manifest("DB_ADMIN", "socket")

    password = random_hex(16)
    sql = "; ".join([
        f"CREATE DATABASE IF NOT EXISTS `{db['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
        *(f"DROP USER IF EXISTS '{db['user']}'@'{h}'" for h in ("localhost", "127.0.0.1")),
        *(f"CREATE USER '{db['user']}'@'{h}' IDENTIFIED BY '{password}'" for h in ("localhost", "127.0.0.1")),
        *(f"GRANT ALL PRIVILEGES ON `{db['name']}`.* TO '{db['user']}'@'{h}'" for h in ("localhost", "127.0.0.1")),
        "FLUSH PRIVILEGES",
    ])
    check(socket_mysql(sql), "Could not create the database")
    say(f"Database {db['name']} and user {db['user']} created.")
    port = check(socket_mysql("SELECT @@port"), "Could not read the database port").strip() or "3306"
    return {"host": "127.0.0.1", "port": int(port), "user": db["user"], "password": password, "name": db["name"]}


def write_env(settings, database, extra=None):
    client_url = f"http://{settings['address']}:{settings['clientPort']}"
    api_url = f"http://{settings['address']}:{settings['apiPort']}/v1"
    values = {
        "DB_PASSWORD": quote(database["password"], safe=""),
        "DB_USER": quote(database["user"], safe=""),
        "DB_HOST": database["host"],
        "DB_PORT": str(database["port"]),
        "DB_NAME": database["name"],
        "JWT_SECRET": random_hex(32),
        "ENCRYPTION_TOKEN": random_hex(16),
        "CORS_ORIGIN_URL": client_url,
        "NEXT_PUBLIC_CLIENT_URL": client_url,
        "NEXT_PUBLIC_PROD_ORIGIN": api_url,
        "DOMAIN": "",
        "SECURE_COOKIES_FOR_IFRAME": "false",
        "PORT_API": str(settings["apiPort"]),
        "PORT_CLIENT": str(settings["clientPort"]),
        "NODE_ENV": "production",
        **(extra or {}),
    }
    with open(os.path.join(APP_DIR, ".env.example")) as f:
        text = f.read()
    for key, value in values.items():
        line = f'{key}="{value}"'
        pattern = re.compile(rf"^{key}=.*$", re.M)
        text = pattern.sub(lambda _: line, text) if pattern.search(text) else f"{text.rstrip()}\n{line}\n"
    env_path = os.path.join(APP_DIR, ".env")
    with open(os.open(env_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as f:
        f.write(text)
    say(f"Settings written. Website: {client_url}  API: {api_url}")
    return client_url, text


def step_firewall(settings):
    if not ufw_active():
        say("No active ufw firewall; nothing to open.")
        return
    for port in (settings["clientPort"], settings["apiPort"]):
        add_to_manifest("UFW_PORT", port)
        check(run(["ufw", "allow", f"{port}/tcp", "comment", f"{NAME} SnailyCAD"]), f"Could not open port {port}")
    say(f"Firewall: opened ports {settings['clientPort']} and {settings['apiPort']}.")


def step_service():
    add_to_manifest("CAD_SERVICE", NAME)
    unit = f"""[Unit]
Description=SnailyCAD ({INSTALL_DIR}, made by the setup wizard)
After=network.target mariadb.service mysql.service
StartLimitIntervalSec=3600
StartLimitBurst=3

[Service]
Type=simple
WorkingDirectory={APP_DIR}
Environment=PATH={NODE_BIN}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=SNAILYCAD_SERVICE_NAME={NAME}
Environment=UPDATE_BRANCH={BRANCH}
ExecStart={APP_DIR}/start.sh
StandardOutput=append:{APP_DIR}/start.log
StandardError=append:{APP_DIR}/start.log
Restart=on-failure
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
"""
    with open(f"/etc/systemd/system/{NAME}.service", "w") as f:
        f.write(unit)
    check(run(["systemctl", "daemon-reload"]), "systemctl daemon-reload failed")
    check(run(["systemctl", "enable", "--now", NAME]), "Could not start the CAD service")
    say(f"Service {NAME} started; it installs, builds and starts the CAD.")


# docker -------------------------------------------------------------------------------

BUILD_STEP = re.compile(r"^#\d+ \[([\w-]+) +(\w+) +(\d+/\d+)\] (.+)$")
BUILD_ALLOW = [
    (re.compile(r"Creating an optimized production build"), "Compiling the website…"),
    (re.compile(r"Compiled successfully"), "Website compiled"),
    (re.compile(r"Generating static pages \((\d+)/(\d+)\)"), r"Generating pages (\1/\2)"),
    (re.compile(r"Packages: \+(\d+)"), r"Installing \1 packages…"),
    (re.compile(r"(?:ESM|CJS) ⚡️ Build success"), "Package built"),
    (re.compile(r"Successfully compiled: (\d+) files"), r"API compiled (\1 files)"),
    (re.compile(r"(ERROR|error TS\d+|Failed to compile).*"), r"\g<0>"),
]


def compose(*args, timeout=600, on_line=None):
    return run(["docker", "compose", "-p", NAME, "-f", COMPOSE_FILE, *args], cwd=APP_DIR, timeout=timeout, on_line=on_line)


def build_line(line):
    match = BUILD_STEP.match(line)
    if match:
        service, _, progress, command = match.groups()
        say(f"{service}: step {progress} {command[:110]}")
        return
    for pattern, label in BUILD_ALLOW:
        found = pattern.search(line)
        if found:
            say(found.expand(label), "error" if label == r"\g<0>" else "info")
            return


def copy_env_for_docker(env_text, client_port):
    """What scripts/copy-env.mjs does, without needing node on the host: the images get their
    settings from apps/*/.env (the root .env is in .dockerignore)."""
    for app in ("client", "api"):
        path = os.path.join(APP_DIR, "apps", app, ".env")
        with open(os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as f:
            f.write(env_text)
    package_path = os.path.join(APP_DIR, "apps", "client", "package.json")
    with open(package_path) as f:
        package = json.load(f)
    package["scripts"]["start"] = f"pnpm next start -p {client_port}"
    with open(package_path, "w") as f:
        f.write(json.dumps(package, indent=2) + "\n")


def docker_install(settings, deploy_only=False):
    def step(step_id, fn):
        JOB["current"] = step_id
        JOB["steps"][step_id] = "active"
        save_state()
        result = fn()
        JOB["steps"][step_id] = "done"
        save_state()
        return result

    def config():
        db_port = first_free_port(3306, [settings["clientPort"], settings["apiPort"]])
        database = {"host": "mariadb", "port": 3306, "user": settings["db"]["user"], "password": random_hex(16),
                    "name": settings["db"]["name"]}
        # DB_HOST_PORT: where the MariaDB container is reachable on this server (localhost only)
        url, text = write_env(settings, database, {"DB_HOST_PORT": str(db_port), "DB_BIND": "127.0.0.1"})
        copy_env_for_docker(text, settings["clientPort"])
        add_to_manifest("DOCKER_PROJECT", NAME)
        say(f"MariaDB container will be reachable from this server on 127.0.0.1:{db_port}.")
        return url

    def network():
        if quiet(["docker", "network", "inspect", "cad_web"])[0]:
            say("Docker network cad_web already exists.")
            return
        add_to_manifest("DOCKER_NETWORK", "cad_web")
        check(run(["docker", "network", "create", "cad_web"]), "Could not create the Docker network")
        say("Docker network cad_web created.")

    def images():
        say("Building images; this takes 10-25 minutes...")
        check(compose("--progress", "plain", "build", timeout=3 * 60 * 60, on_line=build_line), "Building the images failed")
        say("Images built.")

    def containers():
        check(compose("up", "-d", timeout=900), "Could not start the containers")
        say("Containers started; MariaDB first, then the API and website.")

    def ready():
        deadline = time.time() + 15 * 60
        api_ok = client_ok = False
        while time.time() < deadline:
            if not api_ok and quiet(["curl", "-s", "-o", "/dev/null", "-m", "5", f"http://127.0.0.1:{settings['apiPort']}/v1"])[0]:
                api_ok = True
                say("API is answering.")
            if not client_ok and quiet(["curl", "-s", "-o", "/dev/null", "-m", "5", f"http://127.0.0.1:{settings['clientPort']}/auth/login"])[0]:
                client_ok = True
                say("Website is answering.")
            if api_ok and client_ok:
                return
            # a crash-looping container shows "Up" most of the time: look at its restart count
            ok, ids = quiet(["docker", "ps", "-aq", "--filter", f"label=com.docker.compose.project={NAME}"])
            for container in ids.split():
                ok, info = quiet(["docker", "inspect", "-f", "{{.Name}} {{.RestartCount}} {{.State.Status}}", container])
                if not ok:
                    continue
                name, restarts, status = info.lstrip("/").split(" ", 2)
                if int(restarts) > 0 or status in ("exited", "dead"):
                    tail = quiet(["docker", "logs", "--tail", "8", name])[1].strip().split("\n")
                    last = next((l for l in reversed(tail) if l.strip() and "ELIFECYCLE" not in l), "none")
                    raise StepError(f"Container {name} keeps stopping. Last log line: {last[-200:]} "
                                    f"(full log: docker logs {name})")
            time.sleep(5)
        raise StepError("The CAD did not answer within 15 minutes.")

    if not deploy_only:
        JOB["cadUrl"] = step("config", config)
        step("firewall", lambda: step_firewall(settings))
        step("network", network)
    # from here on the database container may hold data made with this .env, so a failure is
    # retried with the same settings instead of going back to the settings pages
    JOB["retryable"] = True
    step("images", images)
    step("containers", containers)
    step("ready", ready)
    JOB["phase"] = "running"
    say("SnailyCAD is running.")


def standalone_install(settings):
    def step(step_id, fn):
        JOB["current"] = step_id
        JOB["steps"][step_id] = "active"
        save_state()
        result = fn()
        JOB["steps"][step_id] = "done"
        save_state()
        return result

    database = step("database", lambda: step_database(settings))
    JOB["cadUrl"] = step("config", lambda: write_env(settings, database)[0])
    step("firewall", lambda: step_firewall(settings))
    step("service", step_service)


def save_state():
    """Keeps the install's progress across wizard restarts (no passwords: those live in .env)."""
    data = {k: v for k, v in JOB.items() if k != "settings"}
    settings = JOB.get("settings")
    if settings:
        data["settings"] = {**settings, "db": {k: v for k, v in settings["db"].items() if k != "password"}}
    tmp = f"{STATE_PATH}.tmp"
    with open(os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w") as f:
        json.dump(data, f)
    os.replace(tmp, STATE_PATH)


def load_state():
    data = read_json(STATE_PATH)
    if not data:
        return
    JOB.update(data)
    interrupted = [step_id for step_id, value in JOB["steps"].items() if value == "active"]
    if interrupted and JOB.get("method") == "docker":
        for step_id in interrupted:
            JOB["steps"][step_id] = "failed"
        JOB["failed"] = "The setup wizard restarted during this step. Press Retry to continue."
        if JOB.get("retryable"):
            JOB["phase"] = "failed"
        else:
            JOB["started"] = False


def install_failed(error):
    if JOB.get("current"):
        JOB["steps"][JOB["current"]] = "failed"
    if isinstance(error, StepError):
        JOB["failed"] = str(error)
    else:
        traceback.print_exc()
        JOB["failed"] = f"Unexpected error: {error}"
    if JOB.get("retryable"):
        JOB["phase"] = "failed"  # shows Retry
    else:
        JOB["started"] = False  # before anything ran: the settings can be changed and tried again
    say(JOB["failed"], "error")


def run_install(settings):
    JOB.update(started=True, failed=None, startedAt=int(time.time()), method=method(), phase=None, current=None,
               settings=settings, retryable=False)
    JOB["steps"] = {step_id: "pending" for step_id, _, _ in job_steps()}
    try:
        (docker_install if JOB["method"] == "docker" else standalone_install)(settings)
    except Exception as error:  # noqa: BLE001
        install_failed(error)
    finally:
        BUSY.pop("install", None)
        save_state()


def run_docker_retry():
    JOB.update(failed=None, phase=None)
    for step_id in ("images", "containers", "ready"):
        JOB["steps"][step_id] = "pending"
    try:
        say("Retrying: rebuilding the images (cached steps are skipped) and restarting the containers...")
        docker_install(JOB["settings"], deploy_only=True)
    except Exception as error:  # noqa: BLE001
        install_failed(error)
    finally:
        BUSY.pop("install", None)
        save_state()


def api_answers():
    port = (JOB.get("settings") or {}).get("apiPort")
    if not port:
        return True
    return quiet(["curl", "-s", "-o", "/dev/null", "-m", "3", f"http://127.0.0.1:{port}/v1"])[0]


def service_progress():
    """Standalone: start.sh's status files drive the last three steps."""
    status = read_json(os.path.join(STATUS_DIR, "status.json")) or {}
    log = read_json(os.path.join(STATUS_DIR, "log.json")) or {}
    phase = status.get("phase")
    order = ["dependencies", "build", "start"]
    active = {"preparing": 0, "installing": 0, "building": 1, "starting": 2}.get(phase)
    if phase == "running" and not api_answers():
        # start.sh marks the CAD running when the website answers; the API may still be applying
        # its first migrations
        phase = "starting"
        active = 2
    if phase == "running":
        for step_id in order:
            JOB["steps"][step_id] = "done"
    elif active is not None:
        for index, step_id in enumerate(order):
            JOB["steps"][step_id] = "done" if index < active else "active" if index == active else "pending"
    elif phase == "failed":
        current = next((s for s in order if JOB["steps"][s] == "active"), "dependencies")
        JOB["steps"][current] = "failed"
    return phase, log.get("lines", [])


def state():
    phase, service_lines = JOB.get("phase"), []
    if JOB.get("method") != "docker" and JOB["steps"].get("service") == "done":
        phase, service_lines = service_progress()
    return {
        "started": JOB["started"],
        "failed": JOB["failed"],
        "startedAt": JOB["startedAt"],
        "method": JOB.get("method") or method(),
        "phase": phase,
        "steps": [{"id": i, "title": t, "detail": d, "state": JOB["steps"].get(i, "pending")} for i, t, d in job_steps()],
        "lines": sorted(LINES + service_lines, key=lambda line: line["t"])[-100:],
        "busy": bool(BUSY),
        "cadUrl": JOB["cadUrl"],
        "uninstall": f"sudo bash {INSTALL_DIR}/uninstall.sh",
    }


def retry():
    if JOB.get("method") == "docker":
        BUSY["install"] = True
        threading.Thread(target=run_docker_retry, daemon=True).start()
        return
    say("Restarting the CAD service...")
    run(["systemctl", "reset-failed", NAME])
    check(run(["systemctl", "restart", NAME]), "Could not restart the CAD service")


def finish():
    if ("UFW_PORT", str(PORT)) in read_manifest():
        run(["ufw", "delete", "allow", f"{PORT}/tcp"])
        remove_from_manifest("UFW_PORT", PORT)
    try:
        os.remove(TOKEN_PATH)
    except OSError:
        pass
    print("Setup wizard closed.", flush=True)
    threading.Timer(0.5, lambda: os._exit(0)).start()


# --- http -------------------------------------------------------------------------------

LOCKED_PAGE = """<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SnailyCAD Setup</title><body style="background:#111827;color:#d1d5db;font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">
<div style="max-width:440px;text-align:center"><h1 style="color:#fff;font-size:1.4rem">SnailyCAD Setup</h1>
<p>Open the full link the installer printed in your terminal (it ends with <code>?token=…</code>).</p></div>"""


def token_matches(value):
    return isinstance(value, str) and hmac.compare_digest(value.encode(), TOKEN.encode())


class Handler(BaseHTTPRequestHandler):
    server_version = "SnailyCAD-Setup"

    def log_message(self, *args):
        pass

    def send(self, status, body, content_type="application/json", headers=None):
        data = (json.dumps(body) if content_type == "application/json" else body).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        match = re.search(rf"(?:^|;\s*){COOKIE}=([^;]+)", self.headers.get("Cookie", ""))
        return bool(match) and token_matches(match.group(1))

    def do_GET(self):
        url = urlparse(self.path)
        query_token = parse_qs(url.query).get("token", [None])[0]
        if url.path == "/" and query_token and token_matches(query_token):
            self.send_response(302)
            self.send_header("Set-Cookie", f"{COOKIE}={TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200")
            self.send_header("Location", "/")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if not self.authorized():
            if url.path.startswith("/api/"):
                return self.send(401, {"error": "Not signed in to the wizard."})
            return self.send(401, LOCKED_PAGE, "text/html; charset=utf-8")
        try:
            if url.path == "/":
                with open(PAGE_PATH) as f:
                    return self.send(200, f.read(), "text/html; charset=utf-8")
            if url.path == "/api/checks":
                return self.send(200, checks())
            if url.path == "/api/requirements":
                return self.send(200, {"items": requirements(), "busy": bool(BUSY), "lines": LINES[-40:]})
            if url.path == "/api/state":
                return self.send(200, state())
            return self.send(404, {"error": "Not found"})
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            return self.send(500, {"error": "Unexpected error in the setup wizard."})

    def do_POST(self):
        if not self.authorized():
            return self.send(401, {"error": "Not signed in to the wizard."})
        if not self.headers.get("Content-Type", "").startswith("application/json"):
            return self.send(415, {"error": "JSON only"})
        length = int(self.headers.get("Content-Length") or 0)
        if length > 64 * 1024:
            return self.send(413, {"error": "Too large"})
        try:
            body = json.loads(self.rfile.read(length) or b"{}")
        except ValueError:
            return self.send(400, {"error": "Bad JSON"})
        path = urlparse(self.path).path
        try:
            with lock:
                return self.route(path, body)
        except StepError as error:
            return self.send(400, {"error": str(error)})
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            return self.send(500, {"error": "Unexpected error in the setup wizard."})

    def route(self, path, body):
        if path == "/api/method":
            if JOB["started"] or BUSY:
                return self.send(409, {"error": "Wait for the running task to finish."})
            if body.get("method") not in ("standalone", "docker"):
                return self.send(400, {"error": "Choose standalone or docker."})
            set_in_manifest("METHOD", body["method"])
            REQ_ERRORS.clear()
            return self.send(200, {"ok": True})
        if path == "/api/requirements/install":
            if BUSY:
                return self.send(409, {"error": "Something is already being installed."})
            start_requirements(str(body.get("id")))
            return self.send(202, {"ok": True})
        if path == "/api/port":
            try:
                port = int(body.get("port"))
            except (TypeError, ValueError):
                port = 0
            return self.send(200, {"free": 1024 <= port <= 65535 and port != PORT and port_free(port)})
        if path == "/api/db-test":
            # placeholder website settings, only the database part is checked here
            settings, errors = validate_settings({"db": body.get("db"), "address": "localhost",
                                                  "clientPort": 65000, "apiPort": 65001})
            if settings["db"]["mode"] != "external":
                errors.append("Only an external database server can be tested.")
            if errors:
                return self.send(400, {"ok": False, "message": errors[0]})
            return self.send(200, test_external(settings["db"]))
        if path == "/api/install":
            if JOB["started"] or BUSY:
                return self.send(409, {"error": "The install is already running."})
            if not all(item["installed"] for item in requirements()):
                return self.send(400, {"error": "Install every requirement first."})
            settings, errors = validate_settings(body)
            if not errors:
                errors += [f"Port {p} is already in use." for p in (settings["clientPort"], settings["apiPort"]) if not port_free(p)]
            if errors:
                return self.send(400, {"error": " ".join(errors)})
            BUSY["install"] = True
            threading.Thread(target=run_install, args=(settings,), daemon=True).start()
            return self.send(202, {"ok": True})
        if path == "/api/retry":
            if not JOB["started"] or BUSY:
                return self.send(409, {"error": "Nothing to retry right now."})
            retry()
            return self.send(200, {"ok": True})
        if path == "/api/finish":
            self.send(200, {"ok": True})
            return finish()
        return self.send(404, {"error": "Not found"})


def main():
    load_state()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.daemon_threads = True
    threading.Timer(MAX_RUNTIME_SECONDS, finish).start()
    print(f"Setup wizard on http://0.0.0.0:{PORT}", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
