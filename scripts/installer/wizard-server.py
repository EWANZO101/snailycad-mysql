#!/usr/bin/env python3
"""SnailyCAD setup wizard: a step-by-step install page served on the server's IP.

Started by scripts/installer/install.sh (Ubuntu) or scripts/installer/install.ps1 (Windows).
Written for the python3 that every Ubuntu ships, with no dependencies, so that everything else
(system tools, Node.js, pnpm, Docker, the CAD itself) can be installed from the page with a button.

On Windows (os.name == "nt") only the standalone method exists. The differences live in the
"platform" helpers and the win_* functions below: winget instead of apt, an NSSM service (or a
scheduled task) instead of systemd, Windows Firewall rules instead of ufw, and the wizard runs the
install/build itself instead of start.sh.

Two install methods:
- standalone: a private Node.js + pnpm in <install dir>/runtime, MySQL/MariaDB on the host, and
  a systemd service running start.sh (which installs, builds and starts the CAD and writes the
  status files this wizard follows);
- docker: production.docker-compose.yml (MariaDB, API and client containers).

Every change made outside the install folder is written to installer/manifest.env before it is
made, so uninstall.sh can remove it again. Access needs the token install.sh printed
(?token=..., then kept in a cookie).
"""
import glob
import hashlib
import hmac
import json
import os
import platform
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
import urllib.error
import urllib.request
import zipfile
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, quote, urlparse

IS_WINDOWS = os.name == "nt"
INSTALL_DIR = os.environ.get("SNAILY_INSTALL_DIR")
if not INSTALL_DIR:
    sys.exit("SNAILY_INSTALL_DIR is not set; start this through install.sh (or install.ps1 on Windows).")
APP_DIR = os.path.join(INSTALL_DIR, "app")
NODE_DIR = os.path.join(INSTALL_DIR, "runtime", "node")
# the Windows Node.js zip has node.exe, npm.cmd and the global packages' shims in its top folder
NODE_BIN = NODE_DIR if IS_WINDOWS else os.path.join(NODE_DIR, "bin")
LOGS_DIR = os.path.join(INSTALL_DIR, "logs")  # Windows: the CAD service's log
INSTALLER_DIR = os.path.join(INSTALL_DIR, "installer")
MANIFEST_PATH = os.path.join(INSTALLER_DIR, "manifest.env")
TOKEN_PATH = os.path.join(INSTALLER_DIR, "token")
RAW_LOG_PATH = os.path.join(INSTALLER_DIR, "install.log")
STATE_PATH = os.path.join(INSTALLER_DIR, "state.json")
STATUS_DIR = os.path.join(APP_DIR, ".snaily-cache", "status")
PAGE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "wizard.html")
COMPOSE_FILE = "production.docker-compose.yml"
COMPOSE_FILE_POSTGRES = "production.postgres.docker-compose.yml"
PORT = int(os.environ.get("SNAILY_WIZARD_PORT", "3100"))
NODE_MAJOR = os.environ.get("SNAILY_NODE_MAJOR", "22")
PNPM_VERSION = "9.0.4"
COOKIE = "snaily_wizard"
# the wizard shuts itself down after this long, finished or not
MAX_RUNTIME_SECONDS = 12 * 60 * 60

with open(TOKEN_PATH, encoding="utf-8-sig") as f:
    TOKEN = f.read().strip()

if IS_WINDOWS:
    # stdout is a log file there, in the ANSI code page: never fail on a character it lacks
    for stream in (sys.stdout, sys.stderr):
        if stream is not None and hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")

SAFE_NAME = re.compile(r"^[A-Za-z0-9_]{1,32}$")
HOSTNAME = re.compile(r"^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$")
APT_ENV = {"DEBIAN_FRONTEND": "noninteractive"}
APT_OPTS = ["-y", "-q", "-o", "DPkg::Lock::Timeout=300"]

lock = threading.Lock()


# --- manifest ---------------------------------------------------------------------------


def read_manifest():
    entries = []
    with open(MANIFEST_PATH, encoding="utf-8-sig") as f:
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
    with open(MANIFEST_PATH, "a", encoding="utf-8") as f:
        f.write(f"{key}={value}\n")


def set_in_manifest(key, value):
    with open(MANIFEST_PATH, encoding="utf-8-sig") as f:
        kept = [line for line in f.read().split("\n") if not line.startswith(f"{key}=")]
    kept = [line for line in kept if line] + [f"{key}={value}"]
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        f.write("\n".join(kept) + "\n")


def remove_from_manifest(key, value):
    with open(MANIFEST_PATH, encoding="utf-8-sig") as f:
        kept = [line for line in f.read().split("\n") if line and line != f"{key}={value}"]
    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
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
    with open(RAW_LOG_PATH, "a", encoding="utf-8", errors="replace") as f:
        f.write(text)
    os.chmod(RAW_LOG_PATH, 0o600)


# --- helpers ----------------------------------------------------------------------------


class StepError(Exception):
    pass


def windows_path():
    """PATH as a new login would see it: programs installed by winget a moment ago are found
    without restarting the wizard. Falls back to this process's PATH."""
    entries = []
    try:
        import winreg

        for root, key in ((winreg.HKEY_LOCAL_MACHINE, r"SYSTEM\CurrentControlSet\Control\Session Manager\Environment"),
                          (winreg.HKEY_CURRENT_USER, "Environment")):
            try:
                with winreg.OpenKey(root, key) as handle:
                    value = winreg.QueryValueEx(handle, "Path")[0]
                entries += winreg.ExpandEnvironmentStrings(value).split(";")
            except OSError:
                pass
    except ImportError:
        pass
    entries += os.environ.get("PATH", "").split(";")
    seen, result = set(), []
    for entry in entries:
        if entry and entry.lower() not in seen:
            seen.add(entry.lower())
            result.append(entry)
    return ";".join(result)


def env_with(extra=None):
    env = dict(os.environ)
    if IS_WINDOWS:
        env["PATH"] = f"{NODE_BIN};{windows_path()}"
    else:
        env["PATH"] = f"{NODE_BIN}:{env.get('PATH', '/usr/bin:/bin')}"
    env.update(extra or {})
    return env


def resolve(cmd, env):
    """Windows: CreateProcess only searches for .exe files; find the full path (and extension)."""
    if IS_WINDOWS and not os.path.isabs(cmd[0]):
        found = shutil.which(cmd[0], path=env["PATH"])
        if found:
            return [found, *cmd[1:]]
    return cmd


def run(cmd, env=None, timeout=600, cwd=None, on_line=None, hide=()):
    """Runs cmd; returns (ok, output). Output also goes to the raw install log. Strings in `hide`
    (passwords on a command line) are masked in that log."""
    shown = " ".join(cmd)
    for secret in hide:
        shown = shown.replace(secret, "••••")
    raw_log(f"\n$ {shown}\n")
    full_env = env_with(env)
    try:
        proc = subprocess.Popen(
            resolve(cmd, full_env), cwd=cwd, env=full_env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace",
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


def quiet(cmd, timeout=20, env=None):
    full_env = env_with(env)
    try:
        p = subprocess.run(resolve(cmd, full_env), env=full_env, capture_output=True, text=True, timeout=timeout,
                           encoding="utf-8", errors="replace")
        return p.returncode == 0, p.stdout.strip()
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
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
    if IS_WINDOWS:
        # the address of the network card the default route uses (UDP connect sends nothing)
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
                s.connect(("8.8.8.8", 53))
                return s.getsockname()[0]
        except OSError:
            return "127.0.0.1"
    ok, out = quiet(["hostname", "-I"])
    for address in out.split():
        if re.match(r"^\d+(\.\d+){3}$", address):
            return address
    return "127.0.0.1"


_public_ip = {"value": None, "checked": False}


def public_ip():
    """the internet-facing IPv4 address, asked once from a lookup service; None when there's no
    internet or the lookup fails (the local address still works)"""
    if _public_ip["checked"]:
        return _public_ip["value"]
    for url in ("https://api.ipify.org", "https://ifconfig.me/ip", "https://icanhazip.com"):
        try:
            with urllib.request.urlopen(url, timeout=4) as response:
                value = response.read(64).decode("ascii", "ignore").strip()
            if re.match(r"^\d+(\.\d+){3}$", value):
                _public_ip["value"] = value
                break
        except (OSError, ValueError, urllib.error.URLError):
            continue
    _public_ip["checked"] = True
    return _public_ip["value"]


def address_options():
    """addresses the CAD can be opened on: public (from the internet), local network, this
    computer. A VPS usually has one address that's both public and local."""
    local = server_ip()
    public = public_ip()
    options = []
    if public:
        options.append({"kind": "public", "address": public})
    if local and local != "127.0.0.1" and local != public:
        options.append({"kind": "local", "address": local})
    options.append({"kind": "this", "address": "localhost"})
    return options


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


# --- windows helpers --------------------------------------------------------------------

WINGET_OPTS = ["--exact", "--source", "winget", "--silent", "--disable-interactivity",
               "--accept-package-agreements", "--accept-source-agreements"]
# winget's "already installed" / "no newer version" results: nothing to do
WINGET_ALREADY = ("0x8a15002b", "0x8a150061")


def winget_install(package_id, label, scope="machine", override=None, hide=(), record=True):
    """Installs a winget package (recorded in the manifest first, so uninstall.ps1 removes it)."""
    if not has_command("winget"):
        raise StepError("winget is missing. Install \"App Installer\" from the Microsoft Store "
                        "(https://aka.ms/getwinget), then press Install again.")
    if record:
        add_to_manifest("WINGET_PACKAGE", package_id)
    say(f"Installing {label} with winget ({package_id})...")
    cmd = ["winget", "install", "--id", package_id, *WINGET_OPTS]
    if scope:
        cmd += ["--scope", scope]
    if override:
        cmd += ["--override", override]
    ok, out = run(cmd, timeout=1800, hide=hide)
    if not ok and not any(code in out.lower() for code in WINGET_ALREADY):
        detail = next((l for l in reversed(out.strip().split("\n")) if l.strip()), "")
        raise StepError(f"Could not install {label}: {detail[:200]}" if detail else f"Could not install {label}")


def win_node():
    return os.path.join(NODE_DIR, "node.exe")


def win_cli(package, script):
    """node.exe + a package's JS entry point: no .cmd shims (they need cmd.exe and its quoting)."""
    return [win_node(), os.path.join(NODE_DIR, "node_modules", package, *script.split("/"))]


def npm_cmd():
    return win_cli("npm", "bin/npm-cli.js") if IS_WINDOWS else [os.path.join(NODE_BIN, "npm")]


def pnpm_cmd():
    return win_cli("pnpm", "bin/pnpm.cjs") if IS_WINDOWS else [os.path.join(NODE_BIN, "pnpm")]


def http_answers(url, timeout=5):
    """True when anything answers on url, error pages included (what `curl -s` exiting 0 means)."""
    try:
        urllib.request.urlopen(url, timeout=timeout).close()
        return True
    except urllib.error.HTTPError:
        return True
    except (OSError, ValueError):
        return False


def netsh_rule(name, port=None):
    """Adds (port given) or deletes a Windows Firewall inbound rule. Names have no spaces."""
    if port is None:
        return run(["netsh", "advfirewall", "firewall", "delete", "rule", f"name={name}"])
    return run(["netsh", "advfirewall", "firewall", "add", "rule", f"name={name}", "dir=in", "action=allow",
                "protocol=TCP", f"localport={port}", "profile=any"])


def windows_mysql_exe():
    """mysql.exe of an installed MariaDB/MySQL (they don't add themselves to PATH)."""
    found = shutil.which("mysql", path=env_with()["PATH"])
    if found:
        return found
    roots = [os.environ.get("ProgramFiles", r"C:\Program Files"), os.environ.get("ProgramFiles(x86)", "")]
    patterns = [r"MariaDB*\bin\mysql.exe", r"MySQL\MySQL Server*\bin\mysql.exe"]
    candidates = sorted((path for root in roots if root for pattern in patterns
                         for path in glob.glob(os.path.join(root, pattern))), reverse=True)
    return candidates[0] if candidates else None


def windows_db_server_present():
    if not port_free(3306) or windows_mysql_exe():
        return True
    return any(quiet(["sc", "query", name])[0] for name in ("MariaDB", "MySQL", "MySQL80", "MySQL84"))


# --- requirements -----------------------------------------------------------------------


def method():
    return manifest_value("METHOD")


def node_version():
    ok, out = quiet([win_node() if IS_WINDOWS else os.path.join(NODE_BIN, "node"), "-v"])
    return out if ok else None


def pnpm_version():
    if not node_version():
        return None
    ok, out = quiet([*pnpm_cmd(), "-v"])
    return out if ok else None


def git_version():
    ok, out = quiet(["git", "--version"])
    return out.replace("git version", "").strip() if ok and out else None


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
    if IS_WINDOWS:
        items = [{"id": "tools", "title": "Git", "detail": "Git for Windows, installed with winget (Git.Git)",
                  "version": git_version(), "needs": []}]
    else:
        tools_missing = [p for p in TOOL_PACKAGES if not package_installed(p)]
        items = [{
            "id": "tools", "title": "System tools", "detail": "git, curl, xz-utils, ca-certificates (from Ubuntu)",
            "version": None if tools_missing else "installed", "needs": [],
        }]
    if method() == "docker" and not IS_WINDOWS:
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
    if IS_WINDOWS:
        if git_version():
            return
        winget_install("Git.Git", "Git")
        if not git_version():
            raise StepError("Git was installed but git.exe is not found. Restart the setup wizard (run the install line again).")
        say(f"Git {git_version()} installed.")
        return
    apt_install(TOOL_PACKAGES, "system tools")


def install_node():
    base = f"https://nodejs.org/dist/latest-v{NODE_MAJOR}.x"
    machine = platform.machine() if IS_WINDOWS else os.uname().machine
    arch = {"x86_64": "x64", "amd64": "x64", "aarch64": "arm64", "arm64": "arm64"}.get(machine.lower())
    if not arch:
        raise StepError(f"Unsupported CPU architecture: {machine}")
    say(f"Looking up the latest Node.js {NODE_MAJOR}...")
    try:
        sums = urllib.request.urlopen(f"{base}/SHASUMS256.txt", timeout=30).read().decode()
    except OSError as error:
        raise StepError(f"Could not reach nodejs.org: {error}")
    # Windows: the zip (no installer, nothing registered with the system); Linux: the .tar.xz
    kind, ext = ("win", "zip") if IS_WINDOWS else ("linux", "tar.xz")
    match = re.search(rf"^([0-9a-f]{{64}})\s+(node-v[\d.]+-{kind}-{arch}\.{re.escape(ext)})$", sums, re.M)
    if not match:
        raise StepError(f"No Node.js {NODE_MAJOR} download for {kind}-{arch}.")
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
    if IS_WINDOWS:
        with zipfile.ZipFile(target) as archive:
            archive.extractall(staging)
    else:
        with tarfile.open(target, "r:xz") as archive:
            if hasattr(tarfile, "tar_filter"):
                archive.extractall(staging, filter="tar")
            else:
                archive.extractall(staging)
    os.rename(os.path.join(staging, filename[: -len(f".{ext}")]), NODE_DIR)
    os.rmdir(staging)
    os.remove(target)
    say(f"Node.js {node_version()} installed.")


def install_pnpm():
    # Windows: --prefix keeps pnpm in the private Node.js folder (npm's default there is the
    # user's %APPDATA%, which the CAD service running as SYSTEM can't see)
    prefix = ["--prefix", NODE_DIR] if IS_WINDOWS else []
    check(run([*npm_cmd(), "install", "-g", *prefix, "--no-fund", "--no-audit", f"pnpm@{PNPM_VERSION}"],
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
    # Windows: keep LF line endings whatever Git's global autocrlf says, and allow long paths
    options = ["-c", "core.autocrlf=false", "-c", "core.longpaths=true"] if IS_WINDOWS else []
    if IS_WINDOWS and os.path.isdir(REPO):
        source = os.path.abspath(REPO)
    check(run(["git", "clone", "-q", *options, "--depth", "1", "--branch", BRANCH, source, APP_DIR], timeout=900),
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


DOCKER_ON_WINDOWS = ("Not available on Windows: Docker Desktop needs WSL 2 and several restarts. "
                     "Use Standalone; it works the same for your users.")


def windows_memory_mb():
    """(RAM MB, page file MB) from GlobalMemoryStatusEx."""
    import ctypes

    class MemoryStatus(ctypes.Structure):
        _fields_ = [("dwLength", ctypes.c_ulong), ("dwMemoryLoad", ctypes.c_ulong),
                    ("ullTotalPhys", ctypes.c_ulonglong), ("ullAvailPhys", ctypes.c_ulonglong),
                    ("ullTotalPageFile", ctypes.c_ulonglong), ("ullAvailPageFile", ctypes.c_ulonglong),
                    ("ullTotalVirtual", ctypes.c_ulonglong), ("ullAvailVirtual", ctypes.c_ulonglong),
                    ("ullAvailExtendedVirtual", ctypes.c_ulonglong)]

    status = MemoryStatus()
    status.dwLength = ctypes.sizeof(MemoryStatus)
    if not ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(status)):
        return 0, 0
    ram = status.ullTotalPhys // 1024 ** 2
    return ram, max(0, status.ullTotalPageFile // 1024 ** 2 - ram)


def windows_name():
    release, version = platform.release(), platform.version()  # "10", "10.0.22631"
    try:
        build = int(version.split(".")[2])
    except (IndexError, ValueError):
        build = 0
    name = "Windows 11" if release in ("10", "11") and build >= 22000 else f"Windows {release}"
    edition = platform.win32_edition() if hasattr(platform, "win32_edition") else ""
    return f"{name} {edition or ''} (build {build})".replace("  ", " "), build


def windows_checks():
    os_name, build = windows_name()
    try:
        mem, swap = windows_memory_mb()
    except Exception:  # noqa: BLE001 - only informational
        mem, swap = 0, 0
    disk = round(shutil.disk_usage(INSTALL_DIR).free / 1024 ** 3, 1)
    cpus = os.cpu_count() or 0
    machine = platform.machine()
    winget = has_command("winget")
    client_port = first_free_port(3000)
    api_port = first_free_port(8080, [client_port])
    return {
        "platform": "windows",
        "os": os_name,
        "ip": server_ip(),
        "addresses": address_options(),
        # the install's name: the default database name / user, so a second install doesn't clash
        "name": NAME,
        "ports": {"client": client_port, "api": api_port},
        "method": method(),
        "methodPreset": manifest_value("METHOD_PRESET") == "1",
        "methods": {"docker": DOCKER_ON_WINDOWS},
        "items": [
            {"label": "Operating system", "value": os_name, "ok": build >= 17763, "warnOnly": True,
             "hint": "Windows 10 (1809 or newer) or Windows 11 is tested"},
            {"label": "CPU", "value": f"{cpus} core(s), {machine}", "ok": machine.lower() in ("amd64", "x86_64"),
             "hint": "a 64-bit (x64) processor is needed"},
            {"label": "Memory", "value": f"{mem} MB RAM + {swap} MB page file", "ok": mem + swap >= 3800, "warnOnly": True,
             "hint": "the build needs about 4 GB of RAM + page file"},
            {"label": "Free disk space", "value": f"{disk} GB", "ok": disk >= 8, "hint": "at least 8 GB needed"},
            {"label": "winget (App Installer)", "value": "available" if winget else "missing", "ok": winget,
             "hint": "install App Installer from the Microsoft Store: https://aka.ms/getwinget"},
        ],
        "docker": None,
        # no root-over-socket on Windows: an existing server is used as an "external" one
        "db": {"local": False, "install": not windows_db_server_present(),
               "postgresql": {"local": False, "install": not pg_server_present()}},
    }


def checks():
    if IS_WINDOWS:
        return windows_checks()
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
        "platform": "linux",
        "os": os_name,
        "ip": server_ip(),
        "addresses": address_options(),
        # the install's name: the default database name / user, so a second install doesn't clash
        "name": NAME,
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
        "db": {"local": socket_root, "install": not has_server and port_free(3306),
               "postgresql": {"local": pg_local_admin_works(), "install": not pg_server_present()}},
    }


# --- install job ------------------------------------------------------------------------

CONTROL_STEP = ("control", "Control Panel", "Set up the background service behind the desktop Control Panel")
STANDALONE_STEPS = [
    ("database", "Database", "Create the database and its user"),
    ("config", "Settings", "Write the CAD's .env file"),
    ("firewall", "Firewall", "Open the website and API ports"),
    ("service", "Service", "Start the CAD as a system service"),
    ("dependencies", "Dependencies", "Download the packages the CAD needs"),
    ("build", "Build", "Compile the website and API (the longest step)"),
    ("start", "Start", "Run database migrations and start the CAD"),
    CONTROL_STEP,
]
# Windows: no start.sh, so the wizard installs and builds before the service starts the CAD
WINDOWS_STEPS = [
    ("database", "Database", "Create the database and its user"),
    ("config", "Settings", "Write the CAD's .env file"),
    ("firewall", "Firewall", "Add Windows Firewall rules for the website and API ports"),
    ("dependencies", "Dependencies", "Download the packages the CAD needs"),
    ("build", "Build", "Compile the website and API (the longest step)"),
    ("service", "Service", "Start the CAD as a Windows service"),
    ("start", "Start", "Run database migrations and wait for the CAD to answer"),
    CONTROL_STEP,
]
DOCKER_STEPS = [
    ("config", "Settings", "Write the CAD's .env file"),
    ("firewall", "Firewall", "Open the website and API ports"),
    ("network", "Network", "Create the Docker network"),
    ("images", "Build images", "Build the API and website images (the longest step)"),
    ("containers", "Start containers", "Start the database, the API and the website"),
    ("ready", "Ready", "Wait for the CAD to answer"),
    CONTROL_STEP,
]

JOB = {"started": False, "failed": None, "startedAt": None, "cadUrl": None, "steps": {}, "method": None}


def job_steps():
    if IS_WINDOWS:
        return WINDOWS_STEPS
    return DOCKER_STEPS if JOB["method"] == "docker" else STANDALONE_STEPS


def validate_settings(body):
    errors = []
    body = body or {}
    db = body.get("db") or {}
    try:
        client_port, api_port = int(body.get("clientPort")), int(body.get("apiPort"))
    except (TypeError, ValueError):
        client_port = api_port = 0
    engine = db.get("engine") or "mysql"
    # apiAddress is optional: blank/absent means "same host as the website", which is also the only
    # choice the wizard offered before this field existed - existing callers of this endpoint that
    # don't send it at all keep working exactly as before.
    api_address = str(body.get("apiAddress", "")).strip()
    website_address = str(body.get("address", "")).strip()
    settings = {"address": website_address, "apiAddress": api_address or website_address,
                "clientPort": client_port, "apiPort": api_port,
                "db": {"mode": db.get("mode"), "engine": engine}}
    if engine not in ("mysql", "postgresql"):
        errors.append("Choose MySQL / MariaDB or PostgreSQL.")
    if not HOSTNAME.match(settings["address"]):
        errors.append("Enter a valid IP address or domain.")
    if not HOSTNAME.match(settings["apiAddress"]):
        errors.append("Enter a valid IP address or domain for the API.")
    for label, port in (("Website", client_port), ("API", api_port)):
        if not 1024 <= port <= 65535:
            errors.append(f"{label} port must be 1024-65535.")
        if port == PORT:
            errors.append(f"{label} port is the setup wizard's own port.")
    if client_port == api_port:
        errors.append("Website and API need different ports.")
    # Danger zone password (UNINSTALL_PASSWORD): goes into .env inside double quotes
    uninstall_password = str(body.get("uninstallPassword") or "snaily-2026")
    if not re.match(r"""^[^\s"'\\$`]{6,64}$""", uninstall_password):
        errors.append("Danger zone password: 6-64 characters, no spaces, quotes, \\, $ or `.")
    settings["uninstallPassword"] = uninstall_password

    mode = db.get("mode")
    if IS_WINDOWS:
        expected = ("install", "external")
    else:
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
    if IS_WINDOWS:
        return windows_root_mysql(sql)
    return run(["mysql", "-uroot", "-N", "-B", "-e", sql], timeout=60)


def external_mysql(db, sql):
    if IS_WINDOWS and not windows_mysql_exe():
        return node_mysql(db, sql)
    client = windows_mysql_exe() if IS_WINDOWS else "mysql"
    return run([client, "-h", db["host"], "-P", str(db["port"]), "-u", db["user"], "-N", "-B", "-e", sql],
               env={"MYSQL_PWD": db["password"]}, timeout=60)


# windows database helpers ----------------------------------------------------------------

MARIADB_SERVICE = "MariaDB"
ROOT_PASSWORD_PATH = os.path.join(INSTALLER_DIR, "mariadb-root-password.txt")
DB_CLIENT_DIR = os.path.join(INSTALLER_DIR, "dbclient")
# a tiny mysql client for when no mysql.exe is installed (an external server on Windows):
# prints rows tab-separated like `mysql -N -B`
NODE_MYSQL_SCRIPT = """const mysql = require("mysql2/promise");
(async () => {
  const c = await mysql.createConnection({ host: process.env.DBQ_HOST, port: Number(process.env.DBQ_PORT),
    user: process.env.DBQ_USER, password: process.env.MYSQL_PWD || "", multipleStatements: true, connectTimeout: 10000 });
  const [rows] = await c.query(process.env.DBQ_SQL);
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row && typeof row === "object" && !Array.isArray(row)) console.log(Object.values(row).join("\\t"));
  }
  await c.end();
})().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
"""


def node_mysql(db, sql):
    if not os.path.isdir(os.path.join(DB_CLIENT_DIR, "node_modules", "mysql2")):
        if not node_version():
            return False, "Install the requirements first (Node.js is used to test the connection)."
        os.makedirs(DB_CLIENT_DIR, exist_ok=True)
        ok, out = run([*npm_cmd(), "install", "--prefix", DB_CLIENT_DIR, "--no-fund", "--no-audit", "mysql2@3"], timeout=300)
        if not ok:
            return False, out
    script = os.path.join(DB_CLIENT_DIR, "query.cjs")
    with open(script, "w", encoding="utf-8") as f:
        f.write(NODE_MYSQL_SCRIPT)
    return run([win_node(), script], cwd=DB_CLIENT_DIR, timeout=60,
               env={"DBQ_HOST": db["host"], "DBQ_PORT": str(db["port"]), "DBQ_USER": db["user"],
                    "MYSQL_PWD": db["password"], "DBQ_SQL": sql})


def windows_root_password():
    try:
        with open(ROOT_PASSWORD_PATH, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return None


def windows_root_mysql(sql):
    """root on the MariaDB this wizard installed (password in installer/mariadb-root-password.txt)."""
    client = windows_mysql_exe()
    if not client:
        return False, "mysql.exe of MariaDB not found"
    return run([client, "-h", "127.0.0.1", "-P", "3306", "-u", "root", "-N", "-B", "-e", sql],
               env={"MYSQL_PWD": windows_root_password() or ""}, timeout=60)


def windows_service_running(name):
    ok, out = quiet(["sc", "query", name])
    return ok and "RUNNING" in out


def windows_install_mariadb():
    """MariaDB.Server with winget. The MSI properties (see mariadb.com/kb, "Installing MariaDB MSI
    Packages on Windows"): SERVICENAME makes it a Windows service (none without it), PASSWORD is
    root's password, PORT the TCP port, UTF8 sets utf8 as the server's character set. Uninstalling
    removes its data directory (CLEANUPDATA defaults to 1)."""
    password = windows_root_password()
    if not (password and manifest_value("WINGET_MARIADB") == "1" and windows_mysql_exe()):
        password = random_hex(16)
        with open(os.open(ROOT_PASSWORD_PATH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
            f.write(password)
        add_to_manifest("WINGET_MARIADB", "1")
        add_to_manifest("MARIADB_SERVICE", MARIADB_SERVICE)
        winget_install("MariaDB.Server", "MariaDB", scope=None, record=False, hide=(password,),
                       override=f"/qn /norestart SERVICENAME={MARIADB_SERVICE} PORT=3306 PASSWORD={password} UTF8=1")
    deadline = time.time() + 120
    while not windows_service_running(MARIADB_SERVICE):
        if time.time() > deadline:
            raise StepError(f"The {MARIADB_SERVICE} service did not start (see services.msc).")
        run(["sc", "start", MARIADB_SERVICE])
        time.sleep(3)
    say(f"MariaDB installed and running (service {MARIADB_SERVICE}). Its root password is in {ROOT_PASSWORD_PATH}.")


def test_external(db):
    if not IS_WINDOWS and not has_command("mysql"):
        apt_install(["mariadb-client"], "the MySQL client")
    ok, out = external_mysql(db, "SELECT VERSION()")
    if not ok:
        last = next((l for l in reversed(out.strip().split("\n")) if l.strip()), "Could not connect.")
        return {"ok": False, "message": last[:200]}
    return {"ok": True, "message": f"Connected: {out.strip()}"}


# postgresql ------------------------------------------------------------------------------
# The CAD can also run on PostgreSQL (DB_PROVIDER="postgresql"). Linux: the distribution's
# postgresql package, administered as the postgres user over its socket (peer auth). Windows: the
# EDB installer through winget (PostgreSQL.PostgreSQL.17, with pgAdmin), administered as the
# postgres superuser with the password the wizard generated.

PG_WINGET_ID = "PostgreSQL.PostgreSQL.17"
PG_SERVICE = "postgresql-x64-17"
PG_PASSWORD_PATH = os.path.join(INSTALLER_DIR, "postgres-password.txt")
# a tiny psql for when no psql.exe is installed (an external server on Windows)
NODE_PG_SCRIPT = """const { Client } = require("pg");
(async () => {
  const c = new Client({ host: process.env.DBQ_HOST, port: Number(process.env.DBQ_PORT), user: process.env.DBQ_USER,
    password: process.env.PGPASSWORD || "", database: process.env.DBQ_DB, connectionTimeoutMillis: 10000 });
  await c.connect();
  const result = await c.query(process.env.DBQ_SQL);
  for (const r of [].concat(result)) for (const row of r.rows || []) console.log(Object.values(row).join("\\t"));
  await c.end();
})().catch((e) => { console.error(e.message || String(e)); process.exit(1); });
"""


def pg_quote_ident(name):
    return '"' + name.replace('"', '""') + '"'


def pg_server_present():
    if IS_WINDOWS:
        return windows_psql_exe() is not None or not port_free(5432)
    return bool(glob.glob("/usr/lib/postgresql/*/bin/postgres")) or has_command("postgres") or not port_free(5432)


def windows_psql_exe():
    found = shutil.which("psql", path=env_with()["PATH"])
    if found:
        return found
    root = os.environ.get("ProgramFiles", r"C:\Program Files")
    candidates = sorted(glob.glob(os.path.join(root, "PostgreSQL", "*", "bin", "psql.exe")), reverse=True)
    return candidates[0] if candidates else None


def windows_pg_password():
    try:
        with open(PG_PASSWORD_PATH, encoding="utf-8") as f:
            return f.read().strip()
    except OSError:
        return None


def pg_admin(sql, database="postgres"):
    """SQL as the PostgreSQL superuser: over the socket as the postgres user on Linux, with the
    password the wizard generated on Windows. Prints rows tab-separated like `mysql -N -B`."""
    if IS_WINDOWS:
        client = windows_psql_exe()
        if not client:
            return False, "psql.exe of PostgreSQL not found"
        return run([client, "-h", "127.0.0.1", "-p", "5432", "-U", "postgres", "-d", database, "-tAX",
                    "-F", "\t", "-v", "ON_ERROR_STOP=1", "-c", sql],
                   env={"PGPASSWORD": windows_pg_password() or ""}, timeout=60)
    return run(["runuser", "-u", "postgres", "--", "psql", "-d", database, "-tAX", "-F", "\t",
                "-v", "ON_ERROR_STOP=1", "-c", sql], cwd="/tmp", timeout=60)


def pg_local_admin_works():
    if IS_WINDOWS or not has_command("psql") or not pg_server_present():
        return False
    return quiet(["runuser", "-u", "postgres", "--", "psql", "-tAXc", "SELECT 1"])[0]


def node_pg(db, sql, database):
    if not os.path.isdir(os.path.join(DB_CLIENT_DIR, "node_modules", "pg")):
        if not node_version():
            return False, "Install the requirements first (Node.js is used to test the connection)."
        os.makedirs(DB_CLIENT_DIR, exist_ok=True)
        ok, out = run([*npm_cmd(), "install", "--prefix", DB_CLIENT_DIR, "--no-fund", "--no-audit", "pg@8"], timeout=300)
        if not ok:
            return False, out
    script = os.path.join(DB_CLIENT_DIR, "query-pg.cjs")
    with open(script, "w", encoding="utf-8") as f:
        f.write(NODE_PG_SCRIPT)
    return run([win_node(), script], cwd=DB_CLIENT_DIR, timeout=60,
               env={"DBQ_HOST": db["host"], "DBQ_PORT": str(db["port"]), "DBQ_USER": db["user"],
                    "PGPASSWORD": db["password"], "DBQ_DB": database, "DBQ_SQL": sql})


def external_pg(db, sql, database=None):
    database = database or db["name"]
    if IS_WINDOWS and not windows_psql_exe():
        return node_pg(db, sql, database)
    client = windows_psql_exe() if IS_WINDOWS else "psql"
    return run([client, "-h", db["host"], "-p", str(db["port"]), "-U", db["user"], "-d", database,
                "-tAX", "-F", "\t", "-v", "ON_ERROR_STOP=1", "-c", sql],
               env={"PGPASSWORD": db["password"], "PGCONNECT_TIMEOUT": "10"}, timeout=60)


def test_external_pg(db):
    if not IS_WINDOWS and not has_command("psql"):
        apt_install(["postgresql-client"], "the PostgreSQL client")
    ok, out = external_pg(db, "SELECT version()")
    if not ok and "does not exist" in out:
        # the database isn't there yet: it's created at install, if the user may
        ok, out = external_pg(db, "SELECT version()", "postgres")
    if not ok:
        last = next((l for l in reversed(out.strip().split("\n")) if l.strip()), "Could not connect.")
        return {"ok": False, "message": last[:200]}
    return {"ok": True, "message": f"Connected: {out.strip().split(',')[0]}"}


def windows_install_postgres():
    """PostgreSQL 17 with winget (the EDB installer, unattended). It brings pgAdmin 4 and psql;
    the superuser's password is generated and kept in installer/postgres-password.txt."""
    password = windows_pg_password()
    if not (password and manifest_value("WINGET_POSTGRES") == "1" and windows_psql_exe()):
        password = random_hex(16)
        with open(os.open(PG_PASSWORD_PATH, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
            f.write(password)
        add_to_manifest("WINGET_POSTGRES", "1")
        add_to_manifest("POSTGRES_SERVICE", PG_SERVICE)
        winget_install(PG_WINGET_ID, "PostgreSQL 17 (with pgAdmin)", scope=None, record=False, hide=(password,),
                       override=("--mode unattended --unattendedmodeui none --serverport 5432 "
                                 f"--superpassword {password} --servicename {PG_SERVICE} "
                                 "--enable-components server,pgAdmin,commandlinetools --disable-components stackbuilder"))
    deadline = time.time() + 180
    while not windows_service_running(PG_SERVICE):
        if time.time() > deadline:
            raise StepError(f"The {PG_SERVICE} service did not start (see services.msc).")
        run(["sc", "start", PG_SERVICE])
        time.sleep(3)
    say(f"PostgreSQL installed and running (service {PG_SERVICE}), with pgAdmin 4. "
        f"The postgres user's password is in {PG_PASSWORD_PATH}.")


# database reuse / erase -----------------------------------------------------------------
# Before creating a database, the wizard checks whether that exact name is already there (a
# previous unrelated install, or a database the admin didn't mean to point at) and - if the admin
# explicitly confirms it through the wizard's own 3-step gate (see db_conflict() and /api/install
# below) - erases only its *contents*, never the database object, its owner, or its grants. This
# is deliberately a content-only wipe (DROP TABLE / DROP SCHEMA ... CASCADE), not DROP DATABASE:
# an "external" database's user is very often not the account that created the database itself and
# may not have the server-level privilege to drop/recreate it, even though it fully owns the
# tables inside it.

def clear_mysql_tables(query, name):
    """query: a callable like socket_mysql, or (lambda sql: external_mysql(db, sql)). Drops every
    base table in database `name`, leaving the database itself, its user and its grants as they
    were. SnailyCAD's schema has no views/routines, so base tables are everything that matters."""
    ok, out = query(f"SELECT table_name FROM information_schema.tables "
                     f"WHERE table_schema = '{name}' AND table_type = 'BASE TABLE'")
    if not ok:
        raise StepError(f"Could not list the existing tables in {name} to erase them.")
    tables = [t.strip() for t in out.strip().split("\n") if t.strip() and SAFE_NAME.match(t.strip())]
    if not tables:
        return
    sql = "SET FOREIGN_KEY_CHECKS=0; " + "; ".join(f"DROP TABLE IF EXISTS `{t}`" for t in tables) + "; SET FOREIGN_KEY_CHECKS=1"
    check(query(sql), f"Could not drop the existing tables in {name}")


def clear_pg_schema(query, name):
    """query: a callable like (lambda sql: pg_admin(sql, name)) or (lambda sql: external_pg(db, sql, name))
    - already connected to database `name`. Drops and recreates its public schema in one statement
    (CASCADE handles foreign-key order), leaving the database itself, its owner and its grants as
    they were."""
    check(query("DROP SCHEMA public CASCADE; CREATE SCHEMA public"), f"Could not erase the existing contents of {name}")


def db_conflict(settings):
    """Checks whether settings['db']['name'] already exists on the database server this install
    would use, before anything is created. Returns None when there's nothing to warn about: no
    server reachable yet (install/local mode, nothing there so far), the name is free, or this is
    the same wizard run's own earlier attempt (the manifest already owns that name/user - safe to
    reuse without asking again). Otherwise returns {"name", "host", "tableCount", "sampleTables"}
    for the wizard to show before letting the admin choose to erase it.

    Advisory only, for the UI: step_database()/step_database_pg() independently re-check right
    before doing anything destructive, using the same queries, so a client can never make this the
    only thing standing between it and an erase - the server decides for itself every time."""
    db = settings["db"]
    if db["mode"] not in ("install", "local", "external"):
        return None  # docker's "container" mode always starts from a fresh container
    name = db["name"]
    if manifest_value("DB_NAME") == name and manifest_value("DB_USER") == db.get("user"):
        return None

    if db.get("engine") == "postgresql":
        if db["mode"] == "external":
            if not external_pg(db, "SELECT 1", "postgres")[0]:
                return None  # can't connect at all; the normal install flow reports that error
            exists = external_pg(db, f"SELECT 1 FROM pg_database WHERE datname = '{name}'", "postgres")
            if not (exists[0] and exists[1].strip()):
                return None
            host = db["host"]
            count_ok, count_out = external_pg(db, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
            names_ok, names_out = external_pg(db, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 5")
        else:
            if not pg_server_present() or not pg_admin("SELECT 1")[0]:
                return None
            exists = pg_admin(f"SELECT 1 FROM pg_database WHERE datname = '{name}'")
            if not (exists[0] and exists[1].strip()):
                return None
            host = "127.0.0.1"
            count_ok, count_out = pg_admin("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'", name)
            names_ok, names_out = pg_admin("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name LIMIT 5", name)
    else:
        if db["mode"] == "external":
            if not external_mysql(db, "SELECT 1")[0]:
                return None
            exists = external_mysql(db, f"SHOW DATABASES LIKE '{name}'")
            host = db["host"]
            query = lambda sql: external_mysql(db, sql)  # noqa: E731
        else:
            if not socket_mysql("SELECT 1")[0]:
                return None
            exists = socket_mysql(f"SHOW DATABASES LIKE '{name}'")
            host = "127.0.0.1"
            query = socket_mysql
        if not (exists[0] and exists[1].strip()):
            return None
        count_ok, count_out = query(f"SELECT COUNT(*) FROM information_schema.tables "
                                     f"WHERE table_schema = '{name}' AND table_type = 'BASE TABLE'")
        names_ok, names_out = query(f"SELECT table_name FROM information_schema.tables WHERE table_schema = '{name}' "
                                     f"AND table_type = 'BASE TABLE' ORDER BY table_name LIMIT 5")

    table_count = int(count_out.strip()) if count_ok and count_out.strip().isdigit() else 0
    sample_tables = [t.strip() for t in names_out.strip().split("\n") if t.strip()] if names_ok else []
    return {"name": name, "host": host, "tableCount": table_count, "sampleTables": sample_tables}


def step_database_pg(db):
    add_to_manifest("DB_ENGINE", "postgresql")
    if db["mode"] == "external":
        result = test_external_pg(db)
        if not result["ok"]:
            raise StepError(result["message"])
        say(result["message"])
        ours = manifest_value("DB_NAME") == db["name"] and manifest_value("DB_USER") == db["user"]
        exists = external_pg(db, f"SELECT 1 FROM pg_database WHERE datname = '{db['name']}'", "postgres")
        db_exists = bool(exists[0] and exists[1].strip())
        if not ours and db_exists:
            count_out = check(external_pg(db, "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'"),
                              "Could not count the existing tables")
            table_count = int(count_out.strip()) if count_out.strip().isdigit() else 0
            if not db.get("confirmedClear"):
                detail = f" with {table_count} existing table(s)" if table_count else ""
                raise StepError(f"Database {db['name']} already exists{detail}. Pick another name, "
                                f"or confirm erasing it in the wizard first.")
            say(f"Erasing the existing contents of {db['name']} (confirmed)...")
            clear_pg_schema(lambda sql: external_pg(db, sql), db["name"])
        add_to_manifest("DB_NAME", db["name"])
        add_to_manifest("DB_USER", db["user"])
        add_to_manifest("DB_ADMIN", "external")
        if not db_exists:
            # usually allowed (CREATEDB); when it isn't, the database must already exist
            external_pg(db, f"CREATE DATABASE {pg_quote_ident(db['name'])}", "postgres")
        return {"host": db["host"], "port": db["port"], "user": db["user"], "password": db["password"], "name": db["name"]}

    if db["mode"] == "install" and IS_WINDOWS:
        windows_install_postgres()
    elif db["mode"] == "install":
        add_to_manifest("APT_POSTGRES", "1")
        apt_install(["postgresql"], "PostgreSQL")
        check(run(["systemctl", "enable", "--now", "postgresql"]), "Could not start PostgreSQL")
        say("PostgreSQL installed and running.")

    check(pg_admin("SELECT 1"), "Cannot log in to PostgreSQL as postgres" if IS_WINDOWS
          else "Cannot log in to PostgreSQL as the postgres user")
    # created by an earlier attempt of this wizard: reuse it. Anything else is not ours to touch
    # without the admin explicitly confirming it first (see db_conflict() and /api/install).
    ours = manifest_value("DB_NAME") == db["name"] and manifest_value("DB_USER") == db["user"]
    db_exists = check(pg_admin(f"SELECT 1 FROM pg_database WHERE datname = '{db['name']}'"), "Could not list databases").strip()
    role_exists = check(pg_admin(f"SELECT 1 FROM pg_roles WHERE rolname = '{db['user']}'"), "Could not list users").strip()
    if not ours and (db_exists or role_exists) and not db.get("confirmedClear"):
        what = f"database named {db['name']}" if db_exists else f"user named {db['user']}"
        raise StepError(f"A {what} already exists. Pick another name, or confirm erasing it in the wizard first.")
    if not ours and db_exists and db.get("confirmedClear"):
        say(f"Erasing the existing contents of {db['name']} (confirmed)...")
        clear_pg_schema(lambda sql: pg_admin(sql, db["name"]), db["name"])
    add_to_manifest("DB_NAME", db["name"])
    add_to_manifest("DB_USER", db["user"])
    add_to_manifest("DB_ADMIN", "postgres" if IS_WINDOWS else "socket")

    password = random_hex(16)
    user, name = pg_quote_ident(db["user"]), pg_quote_ident(db["name"])
    verb = "ALTER" if role_exists else "CREATE"
    check(pg_admin(f"{verb} ROLE {user} LOGIN PASSWORD '{password}'"), "Could not create the database user")
    if not db_exists:
        check(pg_admin(f"CREATE DATABASE {name} OWNER {user} ENCODING 'UTF8' TEMPLATE template0"),
              "Could not create the database")
    say(f"Database {db['name']} and user {db['user']} created.")
    port = check(pg_admin("SHOW port"), "Could not read the database port").strip() or "5432"
    return {"host": "127.0.0.1", "port": int(port), "user": db["user"], "password": password, "name": db["name"]}


def step_database(settings):
    db = settings["db"]
    if db.get("engine") == "postgresql":
        return step_database_pg(db)
    if db["mode"] == "external":
        result = test_external(db)
        if not result["ok"]:
            raise StepError(result["message"])
        say(result["message"])
        ours = manifest_value("DB_NAME") == db["name"] and manifest_value("DB_USER") == db["user"]
        exists = external_mysql(db, f"SHOW DATABASES LIKE '{db['name']}'")
        db_exists = bool(exists[0] and exists[1].strip())
        if not ours and db_exists:
            count_ok, count_out = external_mysql(db, f"SELECT COUNT(*) FROM information_schema.tables "
                                                 f"WHERE table_schema = '{db['name']}' AND table_type = 'BASE TABLE'")
            table_count = int(count_out.strip()) if count_ok and count_out.strip().isdigit() else 0
            if not db.get("confirmedClear"):
                detail = f" with {table_count} existing table(s)" if table_count else ""
                raise StepError(f"Database {db['name']} already exists{detail}. Pick another name, "
                                f"or confirm erasing it in the wizard first.")
            say(f"Erasing the existing contents of {db['name']} (confirmed)...")
            clear_mysql_tables(lambda sql: external_mysql(db, sql), db["name"])
        add_to_manifest("DB_NAME", db["name"])
        add_to_manifest("DB_USER", db["user"])
        add_to_manifest("DB_ADMIN", "external")
        # usually allowed; when it isn't, the database must already exist
        external_mysql(db, f"CREATE DATABASE IF NOT EXISTS `{db['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        return {"host": db["host"], "port": db["port"], "user": db["user"], "password": db["password"], "name": db["name"]}

    if db["mode"] == "install" and IS_WINDOWS:
        windows_install_mariadb()
    elif db["mode"] == "install":
        add_to_manifest("APT_MARIADB", "1")
        apt_install(["mariadb-server"], "MariaDB")
        check(run(["systemctl", "enable", "--now", "mariadb"]), "Could not start MariaDB")
        say("MariaDB installed and running.")

    check(socket_mysql("SELECT 1"), "Cannot log in to MariaDB as root" if IS_WINDOWS
          else "Cannot log in to MySQL/MariaDB as root through its socket")
    # created by an earlier attempt of this wizard: reuse it. Anything else is not ours to touch
    # without the admin explicitly confirming it first (see db_conflict() and /api/install).
    ours = manifest_value("DB_NAME") == db["name"] and manifest_value("DB_USER") == db["user"]
    if not ours:
        db_exists = bool(check(socket_mysql(f"SHOW DATABASES LIKE '{db['name']}'"), "Could not list databases").strip())
        user_count = check(socket_mysql(f"SELECT COUNT(*) FROM mysql.user WHERE user = '{db['user']}'"), "Could not list users")
        user_exists = user_count.strip() != "0"
        if (db_exists or user_exists) and not db.get("confirmedClear"):
            what = f"database named {db['name']}" if db_exists else f"user named {db['user']}"
            raise StepError(f"A {what} already exists. Pick another name, or confirm erasing it in the wizard first.")
        if db_exists and db.get("confirmedClear"):
            say(f"Erasing the existing contents of {db['name']} (confirmed)...")
            clear_mysql_tables(socket_mysql, db["name"])
    add_to_manifest("DB_NAME", db["name"])
    add_to_manifest("DB_USER", db["user"])
    add_to_manifest("DB_ADMIN", "root" if IS_WINDOWS else "socket")

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
    # .get(...) with a fallback to settings['address']: any caller built before apiAddress existed
    # (or a settings dict assembled elsewhere without it) still gets the old same-host behavior.
    api_url = f"http://{settings.get('apiAddress') or settings['address']}:{settings['apiPort']}/v1"
    values = {
        "DB_PROVIDER": "postgresql" if settings["db"].get("engine") == "postgresql" else "mysql",
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
        "UNINSTALL_PASSWORD": settings.get("uninstallPassword") or "snaily-2026",
        **(extra or {}),
    }
    with open(os.path.join(APP_DIR, ".env.example"), encoding="utf-8") as f:
        text = f.read()
    for key, value in values.items():
        line = f'{key}="{value}"'
        pattern = re.compile(rf"^{key}=.*$", re.M)
        text = pattern.sub(lambda _: line, text) if pattern.search(text) else f"{text.rstrip()}\n{line}\n"
    env_path = os.path.join(APP_DIR, ".env")
    with open(os.open(env_path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600), "w", encoding="utf-8") as f:
        f.write(text)
    say(f"Settings written. Website: {client_url}  API: {api_url}")
    return client_url, text


def step_firewall(settings):
    if IS_WINDOWS:
        for port in (settings["clientPort"], settings["apiPort"]):
            rule = f"SnailyCAD-{NAME}-{port}"
            add_to_manifest("WIN_FW_RULE", rule)
            netsh_rule(rule)  # an earlier attempt's rule: no duplicates
            check(netsh_rule(rule, port), f"Could not add a firewall rule for port {port}")
        say(f"Windows Firewall: allowed ports {settings['clientPort']} and {settings['apiPort']}.")
        return
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
After=network.target mariadb.service mysql.service postgresql.service
StartLimitIntervalSec=600
StartLimitBurst=5

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


CONTROL_NAME_SUFFIX = "-control"


def control_service_name():
    return f"{NAME}{CONTROL_NAME_SUFFIX}"


def step_control_service():
    """A second, small systemd service running control-server.py: the always-on HTTP API the
    desktop Control Panel talks to (start/stop/restart/rebuild/rebuild+restart). Works for both
    standalone and docker installs — it drives systemctl or docker compose depending on METHOD,
    which it reads from the same manifest.env this wizard already writes to."""
    control_name = control_service_name()
    add_to_manifest("CONTROL_SERVICE", control_name)
    script_path = os.path.join(INSTALLER_DIR, "control-server.py")
    control_log = os.path.join(INSTALLER_DIR, "control.log")
    unit = f"""[Unit]
Description=SnailyCAD Control Panel service for {NAME}
After=network.target {NAME}.service

[Service]
Type=simple
WorkingDirectory={INSTALLER_DIR}
Environment=SNAILY_INSTALL_DIR={INSTALL_DIR}
Environment=SNAILY_CAD_SERVICE={NAME}
ExecStart={sys.executable} {script_path}
StandardOutput=append:{control_log}
StandardError=append:{control_log}
Restart=on-failure
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
"""
    with open(f"/etc/systemd/system/{control_name}.service", "w") as f:
        f.write(unit)
    check(run(["systemctl", "daemon-reload"]), "systemctl daemon-reload failed")
    check(run(["systemctl", "enable", "--now", control_name]), "Could not start the Control Panel service")
    control_port = os.environ.get("SNAILY_CONTROL_PORT", "3101")
    say(f"Control Panel service {control_name} started on 127.0.0.1:{control_port} (loopback only). "
        f"From your own PC: ssh -L {control_port}:127.0.0.1:{control_port} this-server, then open "
        f"http://127.0.0.1:{control_port}/ — or open it directly if you're on this machine.")


# docker -------------------------------------------------------------------------------

BUILD_STEP = re.compile(r"^#\d+ \[([\w-]+) +(\w+) +(\d+/\d+)\] (.+)$")
BUILD_ALLOW = [
    # the Dockerfile's network fallbacks (scripts/docker/build-network.sh)
    (re.compile(r"\[snailycad build\] (.+)"), r"\1"),
    (re.compile(r"Creating an optimized production build"), "Compiling the website…"),
    (re.compile(r"Compiled successfully"), "Website compiled"),
    (re.compile(r"Generating static pages \((\d+)/(\d+)\)"), r"Generating pages (\1/\2)"),
    (re.compile(r"Packages: \+(\d+)"), r"Installing \1 packages…"),
    (re.compile(r"(?:ESM|CJS) ⚡️ Build success"), "Package built"),
    (re.compile(r"Successfully compiled: (\d+) files"), r"API compiled (\1 files)"),
    (re.compile(r"(ERROR|error TS\d+|Failed to compile).*"), r"\g<0>"),
]


# a build that failed because the container couldn't reach the internet
NETWORK_TROUBLE = re.compile(
    r"Temporary failure resolving|Could not resolve|Failed to fetch|Unable to connect|Could not connect|"
    r"Connection timed out|Network is unreachable|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|ECONNRESET|"
    r"Unable to locate package|getaddrinfo", re.I)


def compose(*args, timeout=600, on_line=None):
    compose_file = manifest_value("DOCKER_COMPOSE_FILE") or COMPOSE_FILE
    # Force BuildKit: the Dockerfile's --mount=type=cache layers and this function's own build_line
    # progress parser (BUILD_STEP, above) both assume BuildKit's build output, which isn't always
    # the host Docker Engine's default builder.
    env = {"DOCKER_BUILDKIT": "1", "COMPOSE_DOCKER_CLI_BUILD": "1"}
    return run(["docker", "compose", "-p", NAME, "-f", compose_file, *args], cwd=APP_DIR, timeout=timeout,
               on_line=on_line, env=env)


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
        postgres = settings["db"].get("engine") == "postgresql"
        port = 5432 if postgres else 3306
        db_port = first_free_port(port, [settings["clientPort"], settings["apiPort"]])
        database = {"host": "postgres" if postgres else "mariadb", "port": port, "user": settings["db"]["user"],
                    "password": random_hex(16), "name": settings["db"]["name"]}
        # DB_HOST_PORT: where the database container is reachable on this server (localhost only)
        url, text = write_env(settings, database, {"DB_HOST_PORT": str(db_port), "DB_BIND": "127.0.0.1"})
        copy_env_for_docker(text, settings["clientPort"])
        set_in_manifest("DOCKER_COMPOSE_FILE", COMPOSE_FILE_POSTGRES if postgres else COMPOSE_FILE)
        if postgres:
            set_in_manifest("DB_ENGINE", "postgresql")
        add_to_manifest("DOCKER_PROJECT", NAME)
        label = "PostgreSQL" if postgres else "MariaDB"
        say(f"{label} container will be reachable from this server on 127.0.0.1:{db_port}.")
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
        # the network fallbacks (public DNS, other mirrors, retries) are in the Dockerfile itself
        ok, output = compose("--progress", "plain", "build", timeout=3 * 60 * 60, on_line=build_line)
        if not ok:
            trouble = [l.strip() for l in output.split("\n") if NETWORK_TROUBLE.search(l)]
            if trouble:
                raise StepError(
                    "Building the images failed: Docker couldn't download packages from the internet "
                    f"({trouble[-1][:160]}). Check this server's internet and DNS; if only Docker is "
                    'affected, add "dns": ["1.1.1.1", "8.8.8.8"] to /etc/docker/daemon.json, run '
                    "systemctl restart docker, then press Retry.")
            check((ok, output), "Building the images failed")
        say("Images built.")

    def containers():
        check(compose("up", "-d", timeout=900), "Could not start the containers")
        say("Containers started; the database first, then the API and website.")

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
    step("control", step_control_service)
    JOB["phase"] = "running"
    say("SnailyCAD is running.")


# windows ----------------------------------------------------------------------------------

NSSM_PATH = os.path.join(INSTALL_DIR, "runtime", "nssm.exe")
PNPM_STORE = os.path.join(INSTALL_DIR, "runtime", "pnpm-store")
CAD_LOG = os.path.join(LOGS_DIR, "cad.log")
START_CMD = os.path.join(INSTALL_DIR, "runtime", "start-cad.cmd")
TASK_PATH = "\\SnailyCAD\\"
START_ALLOW = [
    (re.compile(r"(\d+) migrations? found"), r"\g<0>"),
    (re.compile(r"Applying migration `?([\w-]+)"), r"Applying migration \1"),
    (re.compile(r"All migrations have been successfully applied|No pending migrations to apply"), r"\g<0>"),
    (re.compile(r"Generated Prisma Client"), "Prisma client generated"),
    (re.compile(r"(?:Ready in|started server on|Listening on|ready on).*", re.I), r"\g<0>"),
    (re.compile(r"(Error|ERROR|error:).*"), r"\g<0>"),
]


def windows_heap_mb():
    """The build's Node.js heap limit, as start.sh picks it."""
    if os.environ.get("SNAILY_BUILD_HEAP_MB"):
        return os.environ["SNAILY_BUILD_HEAP_MB"]
    try:
        mem = windows_memory_mb()[0]
    except Exception:  # noqa: BLE001
        mem = 0
    return 2048 if mem == 0 else 1536 if mem < 3000 else 2048 if mem < 6000 else 4096


def windows_build_env():
    return {"NODE_OPTIONS": f"--max-old-space-size={windows_heap_mb()}", "NEXT_TELEMETRY_DISABLED": "1"}


def windows_dependencies():
    say("Installing the CAD's packages with pnpm (a few minutes)...")
    # --frozen-lockfile: trust pnpm-lock.yaml as-is instead of re-resolving it against the
    # registry, same as the Docker image's install - faster and still reproducible on a fresh clone.
    check(run([*pnpm_cmd(), "install", "--frozen-lockfile", "--prefer-offline", "--store-dir", PNPM_STORE],
              cwd=APP_DIR, env=windows_build_env(), timeout=3600, on_line=build_line),
          "Could not install the dependencies")
    say("Dependencies installed.")


def windows_build():
    check(run([win_node(), os.path.join("scripts", "copy-env.mjs"), "--client", "--api"], cwd=APP_DIR),
          "Could not copy the settings to the website and API")
    say("Building; this takes 10-25 minutes...")
    check(run([*pnpm_cmd(), "run", "build"], cwd=APP_DIR, env=windows_build_env(), timeout=3 * 60 * 60,
              on_line=build_line), "The build failed")
    say("Build finished.")


def find_nssm():
    found = shutil.which("nssm", path=env_with()["PATH"])
    if found:
        return found
    # winget's portable packages: a link in WinGet\Links, the files in WinGet\Packages
    roots = [os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WinGet"),
             os.path.join(os.environ.get("ProgramFiles", r"C:\Program Files"), "WinGet")]
    for root in roots:
        for pattern in (os.path.join(root, "Links", "nssm.exe"),
                        os.path.join(root, "Packages", "NSSM.NSSM*", "*", "win64", "nssm.exe"),
                        os.path.join(root, "Packages", "NSSM.NSSM*", "win64", "nssm.exe")):
            matches = glob.glob(pattern)
            if matches:
                return matches[0]
    return None


def ensure_nssm():
    """nssm.exe copied into the install folder, so the service keeps working whatever happens to
    winget's copy. None when it can't be had (the scheduled task is used then)."""
    if os.path.isfile(NSSM_PATH):
        return NSSM_PATH
    source = find_nssm()
    if not source:
        try:
            winget_install("NSSM.NSSM", "NSSM (runs the CAD as a Windows service)", scope=None)
        except StepError as error:
            say(f"{error} Using a scheduled task instead.", "error")
            return None
        source = find_nssm()
    if not source:
        say("NSSM was installed but nssm.exe was not found. Using a scheduled task instead.", "error")
        return None
    os.makedirs(os.path.dirname(NSSM_PATH), exist_ok=True)
    shutil.copyfile(source, NSSM_PATH)
    return NSSM_PATH


def service_environment():
    return {"PATH": f"{NODE_BIN};{windows_path()}", "SNAILYCAD_SERVICE_NAME": NAME, "UPDATE_BRANCH": BRANCH,
            "NEXT_TELEMETRY_DISABLED": "1"}


def nssm_commands(nssm, depends_on=None):
    """The commands that make the CAD a Windows service with NSSM: `pnpm run start` in the app
    folder as LocalSystem, started at boot (delayed, after the network and database), restarted
    10 s after it stops, with its output in logs\\cad.log (rotated at 10 MB)."""
    start = [*pnpm_cmd(), "run", "start"]
    env = [f"{k}={v}" for k, v in service_environment().items()]
    commands = [
        [nssm, "install", NAME, start[0], *start[1:]],
        [nssm, "set", NAME, "AppDirectory", APP_DIR],
        [nssm, "set", NAME, "DisplayName", f"SnailyCAD ({NAME})"],
        [nssm, "set", NAME, "Description", f"SnailyCAD in {INSTALL_DIR}, made by the setup wizard"],
        [nssm, "set", NAME, "Start", "SERVICE_DELAYED_AUTO_START"],
        [nssm, "set", NAME, "AppEnvironmentExtra", *env],
        [nssm, "set", NAME, "AppStdout", CAD_LOG],
        [nssm, "set", NAME, "AppStderr", CAD_LOG],
        [nssm, "set", NAME, "AppRotateFiles", "1"],
        [nssm, "set", NAME, "AppRotateOnline", "1"],
        [nssm, "set", NAME, "AppRotateBytes", "10485760"],
        [nssm, "set", NAME, "AppExit", "Default", "Restart"],
        [nssm, "set", NAME, "AppRestartDelay", "10000"],
        [nssm, "set", NAME, "AppKillProcessTree", "1"],
    ]
    if depends_on:
        commands.append([nssm, "set", NAME, "DependOnService", depends_on])
    commands.append([nssm, "start", NAME])
    return commands


def ps_quote(text):
    return "'" + str(text).replace("'", "''") + "'"


def write_start_cmd():
    """runtime\\start-cad.cmd: what the scheduled task runs (tasks have no environment settings)."""
    lines = ["@echo off", f'cd /d "{APP_DIR}"']
    lines += [f'set "{k}={v}"' for k, v in service_environment().items()]
    start = " ".join(f'"{part}"' for part in pnpm_cmd())
    lines.append(f'{start} run start >> "{CAD_LOG}" 2>&1')
    with open(START_CMD, "w", encoding="utf-8", newline="\r\n") as f:
        f.write("\n".join(lines) + "\n")


def task_script():
    """PowerShell that registers runtime\\start-cad.cmd as a task: SYSTEM, at startup, restarted
    every minute if it fails, no time limit."""
    action_args = f'/d /c "{START_CMD}"'
    return "; ".join([
        "$ErrorActionPreference = 'Stop'",
        f"$a = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument {ps_quote(action_args)} -WorkingDirectory {ps_quote(APP_DIR)}",
        "$t = New-ScheduledTaskTrigger -AtStartup",
        "$p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest",
        "$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable "
        "-ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)",
        f"Register-ScheduledTask -TaskName {ps_quote(NAME)} -TaskPath {ps_quote(TASK_PATH)} -Action $a -Trigger $t "
        "-Principal $p -Settings $s -Force | Out-Null",
        f"Start-ScheduledTask -TaskName {ps_quote(NAME)} -TaskPath {ps_quote(TASK_PATH)}",
    ])


def powershell(script, timeout=120):
    return run(["powershell", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", script],
               timeout=timeout)


def windows_service():
    """NSSM, because it makes a real Windows service: it runs at boot without anyone logged in,
    shows up in services.msc, restarts the CAD whenever it stops, stops the whole process tree,
    can wait for the MariaDB service, and writes and rotates the log. A scheduled task (the
    fallback, when NSSM can't be downloaded) only restarts when the task fails to start and keeps
    no log of its own."""
    os.makedirs(LOGS_DIR, exist_ok=True)
    # "Update SnailyCAD.bat": double-click to update (runs app\scripts\update-cad.ps1)
    bat = os.path.join(APP_DIR, "scripts", "installer", "update-snailycad.bat")
    if os.path.isfile(bat):
        shutil.copyfile(bat, os.path.join(INSTALL_DIR, "Update SnailyCAD.bat"))
    add_to_manifest("CAD_SERVICE", NAME)
    depends_on = (MARIADB_SERVICE if manifest_value("WINGET_MARIADB") == "1"
                  else manifest_value("POSTGRES_SERVICE") or None if manifest_value("WINGET_POSTGRES") == "1" else None)
    nssm = ensure_nssm()
    if nssm:
        set_in_manifest("WIN_SERVICE", "nssm")
        if quiet([nssm, "status", NAME])[0]:  # an earlier attempt
            run([nssm, "stop", NAME], timeout=120)
            run([nssm, "remove", NAME, "confirm"])
        for cmd in nssm_commands(nssm, depends_on):
            check(run(cmd, timeout=120), f"Could not set up the {NAME} service")
        say(f"Windows service {NAME} started; logs in {CAD_LOG}.")
        return
    set_in_manifest("WIN_SERVICE", "task")
    write_start_cmd()
    check(powershell(task_script()), "Could not create the scheduled task")
    say(f"Scheduled task {TASK_PATH}{NAME} started (runs as SYSTEM at startup); logs in {CAD_LOG}.")


def control_task_script(control_cmd_path):
    """PowerShell that registers the control daemon as a scheduled task, the same fallback used
    for the CAD itself when NSSM can't be had."""
    control_name = control_service_name()
    action_args = f'/d /c "{control_cmd_path}"'
    return "; ".join([
        "$ErrorActionPreference = 'Stop'",
        f"$a = New-ScheduledTaskAction -Execute 'cmd.exe' -Argument {ps_quote(action_args)} -WorkingDirectory {ps_quote(INSTALLER_DIR)}",
        "$t = New-ScheduledTaskTrigger -AtStartup",
        "$p = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest",
        "$s = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable "
        "-ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1)",
        f"Register-ScheduledTask -TaskName {ps_quote(control_name)} -TaskPath {ps_quote(TASK_PATH)} -Action $a -Trigger $t "
        "-Principal $p -Settings $s -Force | Out-Null",
        f"Start-ScheduledTask -TaskName {ps_quote(control_name)} -TaskPath {ps_quote(TASK_PATH)}",
    ])


def control_service_windows():
    """The Windows twin of step_control_service(): registers control-server.py as its own service
    (NSSM, or a scheduled task when NSSM isn't available — whichever the CAD's own service used),
    the always-on HTTP API the desktop Control Panel talks to."""
    control_name = control_service_name()
    control_log = os.path.join(LOGS_DIR, "control.log")
    add_to_manifest("CONTROL_SERVICE", control_name)
    win_service = manifest_value("WIN_SERVICE") or "nssm"
    control_port = os.environ.get("SNAILY_CONTROL_PORT", "3101")
    # "Control Panel.url": double-click to open the popup controller, the same convenience as
    # "Update SnailyCAD.bat" above — no command line needed
    with open(os.path.join(INSTALL_DIR, "Control Panel.url"), "w", encoding="utf-8", newline="\r\n") as f:
        f.write(f"[InternetShortcut]\nURL=http://127.0.0.1:{control_port}/\n")
    script_path = os.path.join(INSTALLER_DIR, "control-server.py")
    env = {"SNAILY_INSTALL_DIR": INSTALL_DIR, "SNAILYCAD_SERVICE_NAME": NAME}
    if win_service == "nssm":
        nssm = ensure_nssm()
        if nssm:
            if quiet([nssm, "status", control_name])[0]:  # an earlier attempt
                run([nssm, "stop", control_name], timeout=60)
                run([nssm, "remove", control_name, "confirm"])
            env_list = [f"{k}={v}" for k, v in env.items()]
            commands = [
                [nssm, "install", control_name, sys.executable, script_path],
                [nssm, "set", control_name, "AppDirectory", INSTALLER_DIR],
                [nssm, "set", control_name, "DisplayName", f"SnailyCAD Control Panel ({NAME})"],
                [nssm, "set", control_name, "Description", f"Background service for the {NAME} desktop Control Panel"],
                [nssm, "set", control_name, "Start", "SERVICE_DELAYED_AUTO_START"],
                [nssm, "set", control_name, "AppEnvironmentExtra", *env_list],
                [nssm, "set", control_name, "AppStdout", control_log],
                [nssm, "set", control_name, "AppStderr", control_log],
                [nssm, "set", control_name, "AppRotateFiles", "1"],
                [nssm, "set", control_name, "AppRotateOnline", "1"],
                [nssm, "set", control_name, "AppRotateBytes", "10485760"],
                [nssm, "set", control_name, "AppExit", "Default", "Restart"],
                [nssm, "set", control_name, "AppRestartDelay", "10000"],
                # Deliberately NOT DependOnService=NAME: Windows SCM refuses to stop a service
                # that has a running dependent ("Cannot stop service ... because it has dependent
                # services") unless -Force is used. That would make every "Stop" click/command
                # against NAME fail while this control panel is up, which defeats its purpose. The
                # control panel already tolerates NAME being stopped/unknown (see service_status()
                # in control-server.py), so it doesn't need a hard SCM dependency on it to work.
                [nssm, "start", control_name],
            ]
            for cmd in commands:
                check(run(cmd, timeout=120), f"Could not set up the {control_name} service")
            say(f"Control Panel service {control_name} started; logs in {control_log}.")
            return
        say("NSSM is not available for the Control Panel service; using a scheduled task instead.", "error")
    # scheduled-task fallback: a tiny .cmd wrapper (tasks have no environment settings of their own)
    os.makedirs(LOGS_DIR, exist_ok=True)
    control_cmd_path = os.path.join(INSTALL_DIR, "runtime", "start-control.cmd")
    lines = ["@echo off", f'cd /d "{INSTALLER_DIR}"']
    lines += [f'set "{k}={v}"' for k, v in env.items()]
    lines.append(f'"{sys.executable}" "{script_path}" >> "{control_log}" 2>&1')
    with open(control_cmd_path, "w", encoding="utf-8", newline="\r\n") as f:
        f.write("\n".join(lines) + "\n")
    check(powershell(control_task_script(control_cmd_path)), "Could not create the Control Panel scheduled task")
    say(f"Control Panel scheduled task {TASK_PATH}{control_name} started; logs in {control_log}.")


def windows_wait_started():
    deadline = time.time() + 20 * 60
    api_ok = client_ok = False
    position = 0
    last_line = ""
    while time.time() < deadline:
        try:
            with open(CAD_LOG, encoding="utf-8", errors="replace") as f:
                f.seek(position)
                chunk = f.read()
                position = f.tell()
        except OSError:
            chunk = ""
        for line in ANSI.sub("", chunk).splitlines():
            if line.strip():
                last_line = line.strip()
            for pattern, label in START_ALLOW:
                found = pattern.search(line)
                if found:
                    say(found.expand(label)[:170], "error" if pattern.pattern.startswith("(Error") else "info")
                    break
        if not api_ok and http_answers(f"http://127.0.0.1:{JOB['settings']['apiPort']}/v1"):
            api_ok = True
            say("API is answering.")
        if not client_ok and http_answers(f"http://127.0.0.1:{JOB['settings']['clientPort']}/auth/login"):
            client_ok = True
            say("Website is answering.")
        if api_ok and client_ok:
            return
        time.sleep(5)
    raise StepError(f"The CAD did not answer within 20 minutes. Last log line: {last_line[-200:] or 'none'} "
                    f"(full log: {CAD_LOG})")


def windows_install(settings, deploy_only=False):
    def step(step_id, fn):
        JOB["current"] = step_id
        JOB["steps"][step_id] = "active"
        save_state()
        result = fn()
        JOB["steps"][step_id] = "done"
        save_state()
        return result

    if not deploy_only:
        database = step("database", lambda: step_database(settings))
        JOB["cadUrl"] = step("config", lambda: write_env(settings, database)[0])
        step("firewall", lambda: step_firewall(settings))
    # the database and .env exist from here on: a failure is retried with the same settings
    JOB["retryable"] = True
    step("dependencies", windows_dependencies)
    step("build", windows_build)
    step("service", windows_service)
    step("start", windows_wait_started)
    step("control", control_service_windows)
    JOB["phase"] = "running"
    say("SnailyCAD is running.")


def run_windows_retry():
    JOB.update(failed=None, phase=None)
    for step_id in ("dependencies", "build", "service", "start", "control"):
        JOB["steps"][step_id] = "pending"
    try:
        say("Retrying: installing, building and starting the CAD again (finished parts are quick)...")
        windows_install(JOB["settings"], deploy_only=True)
    except Exception as error:  # noqa: BLE001
        install_failed(error)
    finally:
        BUSY.pop("install", None)
        save_state()


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
    step("control", step_control_service)


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
    if interrupted and (JOB.get("method") == "docker" or IS_WINDOWS):
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
        if IS_WINDOWS:
            windows_install(settings)
        else:
            (docker_install if JOB["method"] == "docker" else standalone_install)(settings)
    except Exception as error:  # noqa: BLE001
        install_failed(error)
    finally:
        BUSY.pop("install", None)
        save_state()


def run_docker_retry():
    JOB.update(failed=None, phase=None)
    for step_id in ("images", "containers", "ready", "control"):
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
    if not IS_WINDOWS and JOB.get("method") != "docker" and JOB["steps"].get("service") == "done":
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
        "uninstall": (f'powershell -ExecutionPolicy Bypass -File "{os.path.join(INSTALL_DIR, "uninstall.ps1")}"'
                      if IS_WINDOWS else f"sudo bash {INSTALL_DIR}/uninstall.sh"),
        "platform": "windows" if IS_WINDOWS else "linux",
        # where to look when the CAD fails to install or start
        "logHint": (f"The full log is {CAD_LOG} (and {RAW_LOG_PATH} for the install steps)." if IS_WINDOWS
                    else "The full log is start.log in the app folder."),
    }


def retry():
    if IS_WINDOWS:
        BUSY["install"] = True
        threading.Thread(target=run_windows_retry, daemon=True).start()
        return
    if JOB.get("method") == "docker":
        BUSY["install"] = True
        threading.Thread(target=run_docker_retry, daemon=True).start()
        return
    say("Restarting the CAD service...")
    run(["systemctl", "reset-failed", NAME])
    check(run(["systemctl", "restart", NAME]), "Could not restart the CAD service")


def finish():
    wizard_rule = manifest_value("WIN_FW_WIZARD")
    if IS_WINDOWS and wizard_rule:
        netsh_rule(wizard_rule)
        remove_from_manifest("WIN_FW_RULE", wizard_rule)
        remove_from_manifest("WIN_FW_WIZARD", wizard_rule)
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
                with open(PAGE_PATH, encoding="utf-8") as f:
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
            if IS_WINDOWS and body["method"] == "docker":
                return self.send(400, {"error": DOCKER_ON_WINDOWS})
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
            db = settings["db"]
            return self.send(200, test_external_pg(db) if db.get("engine") == "postgresql" else test_external(db))
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
            # Database reuse check: never trust the client's word alone that an existing database
            # was meant to be erased. The wizard's own 3-step dialog sends confirmClear/
            # confirmClearName once the admin has gone through it; this still re-derives the
            # conflict itself (db_conflict) and only accepts the confirmation when the typed name
            # matches exactly - a stale or tampered confirmation falls straight back to the warning.
            raw_db = body.get("db") or {}
            confirmed = (raw_db.get("confirmClear") is True
                        and isinstance(raw_db.get("confirmClearName"), str)
                        and raw_db["confirmClearName"] == settings["db"]["name"])
            conflict = db_conflict(settings)
            if conflict and not confirmed:
                return self.send(409, {"error": f"Database {conflict['name']} already exists.",
                                       "needsConfirmation": True, "dbConflict": conflict})
            if conflict and confirmed:
                settings["db"]["confirmedClear"] = True
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
