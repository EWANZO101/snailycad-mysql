#!/usr/bin/env python3
"""SnailyCAD control daemon: a small, always-on HTTP service for the desktop Control Panel.

Unlike wizard-server.py (install-time only, shuts itself down after MAX_RUNTIME_SECONDS), this
process is meant to run for as long as the CAD itself does — it's what the popup Control Panel
talks to so a user can see status, and start/stop/restart/rebuild the CAD without opening a
terminal. Installed as its own service (systemd on Linux, NSSM or a scheduled task on Windows,
matching however the CAD's own service was set up) by wizard-server.py, right alongside it.

Binds to 127.0.0.1 only: this is a local admin surface for whoever can already reach this machine,
not a remote API, so the smallest safe exposure is loopback-only regardless of the token check.

Reads installer/manifest.env the same way wizard-server.py does, to work the same way the actual
install was made: standalone (systemd / NSSM / a scheduled task) or docker (docker compose).

Operations (start/stop/restart/rebuild/rebuild-restart) run in a background thread; the HTTP
response returns immediately (202) and the Control Panel polls /api/status for progress, the same
async pattern wizard-server.py already uses for installs.
"""
import glob
import hmac
import json
import os
import re
import secrets
import subprocess
import sys
import threading
import time
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

WINDOWS = sys.platform.startswith("win")

INSTALL_DIR = os.environ.get("SNAILY_INSTALL_DIR")
if not INSTALL_DIR:
    sys.exit("SNAILY_INSTALL_DIR is not set; this is started by the installer, not run by hand.")
APP_DIR = os.path.join(INSTALL_DIR, "app")
INSTALLER_DIR = os.path.join(INSTALL_DIR, "installer")
MANIFEST_PATH = os.path.join(INSTALLER_DIR, "manifest.env")
TOKEN_PATH = os.path.join(INSTALLER_DIR, "control-token")
NODE_DIR = os.path.join(INSTALL_DIR, "runtime", "node")
NODE_BIN = os.path.join(NODE_DIR, "bin")
NSSM_PATH = os.path.join(INSTALL_DIR, "runtime", "nssm.exe")
BUILD_LOG_PATH = os.path.join(INSTALLER_DIR, "control-build.log")
PAGE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "control.html")
TASK_PATH = "\\SnailyCAD\\"
PORT = int(os.environ.get("SNAILY_CONTROL_PORT", "3101"))

SECRET = re.compile(r"((?:token|secret|password|passwd|key|auth|cookie|session|dsn)[\w-]*\s*[=:]\s*)\S+", re.I)
URL_CREDENTIALS = re.compile(r"(\w+://)[^/\s:@]+:[^/\s@]+@")
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")


def sanitize(text):
    return URL_CREDENTIALS.sub(r"\1••••@", SECRET.sub(r"\1••••", text))


def manifest_value(key):
    if not os.path.exists(MANIFEST_PATH):
        return None
    with open(MANIFEST_PATH) as f:
        for line in f:
            if line.startswith(f"{key}="):
                return line.split("=", 1)[1].strip()
    return None


NAME = os.environ.get("SNAILY_CAD_SERVICE") or manifest_value("CAD_SERVICE") or manifest_value("NAME") or "snailycad"
METHOD = manifest_value("METHOD") or "standalone"  # "standalone" or "docker"
WIN_SERVICE = manifest_value("WIN_SERVICE") or "nssm"  # "nssm" or "task" (standalone, Windows only)
COMPOSE_FILE = manifest_value("DOCKER_COMPOSE_FILE") or "production.docker-compose.yml"
CAD_LOG = os.path.join(INSTALL_DIR, "logs", "cad.log") if WINDOWS else os.path.join(APP_DIR, "start.log")

if not os.path.exists(TOKEN_PATH):
    with open(TOKEN_PATH, "w") as f:
        f.write(secrets.token_hex(24))
    if not WINDOWS:
        os.chmod(TOKEN_PATH, 0o600)
with open(TOKEN_PATH) as f:
    TOKEN = f.read().strip()


# --- state --------------------------------------------------------------------------------

lock = threading.Lock()
OPERATION = {"kind": None, "startedAt": None, "lines": [], "error": None}  # the in-progress op, if any


def log_line(text, level="info"):
    text = sanitize(ANSI.sub("", text).rstrip())
    if not text:
        return
    OPERATION["lines"].append({"t": int(time.time()), "level": level, "text": text})
    del OPERATION["lines"][:-200]
    print(f"[{level}] {text}", flush=True)


def run(cmd, cwd=None, timeout=900, on_line=None):
    """Runs cmd, streaming sanitized output to on_line; returns (ok, last_line)."""
    try:
        proc = subprocess.Popen(
            cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace",
        )
    except FileNotFoundError:
        return False, f"{cmd[0]} not found"
    last = ""
    deadline = time.time() + timeout
    for raw in proc.stdout:
        line = sanitize(ANSI.sub("", raw).rstrip())
        if line:
            last = line
            if on_line:
                on_line(line)
        if time.time() > deadline:
            proc.kill()
            return False, "timed out"
    proc.wait()
    return proc.returncode == 0, last


def quiet(cmd, timeout=20):
    try:
        out = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, errors="replace", timeout=timeout)
        return out.returncode == 0, out.stdout
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False, ""


# --- pnpm / node resolution (mirrors wizard-server.py's win_cli()/pnpm_cmd(), kept standalone so
# this script has no dependency on the installer file that may not exist on an upgraded install) ---

def pnpm_cmd():
    if WINDOWS:
        return [os.path.join(NODE_DIR, "node.exe"), os.path.join(NODE_DIR, "node_modules", "pnpm", "bin", "pnpm.cjs")]
    return [os.path.join(NODE_BIN, "pnpm")]


def find_nssm():
    if os.path.isfile(NSSM_PATH):
        return NSSM_PATH
    found = None
    try:
        from shutil import which
        found = which("nssm")
    except ImportError:
        pass
    return found


# --- service control ------------------------------------------------------------------------
# docker and standalone (systemd / NSSM / scheduled task) each get their own start/stop/restart/
# status/rebuild, dispatched once here so the HTTP layer and the Control Panel don't need to care.

def compose_cmd(*args):
    return ["docker", "compose", "-p", NAME, "-f", COMPOSE_FILE, *args]


def service_status():
    """'running' | 'stopped' | 'error' | 'unknown' — queries the OS/Docker directly, not cached state."""
    if METHOD == "docker":
        ok, out = quiet(["docker", "compose", "-p", NAME, "-f", COMPOSE_FILE, "ps", "--format", "json"], timeout=15)
        if not ok:
            return "unknown"
        if not out.strip():
            return "stopped"
        states = re.findall(r'"State"\s*:\s*"(\w+)"', out)
        if any(s == "running" for s in states):
            return "running"
        if states:
            return "stopped"
        return "unknown"
    if WINDOWS:
        if WIN_SERVICE == "task":
            ok, out = quiet(["schtasks", "/query", "/tn", f"{TASK_PATH}{NAME}", "/fo", "list"])
            if not ok:
                return "unknown"
            return "running" if "Running" in out else "stopped"
        nssm = find_nssm()
        ok, out = quiet(([nssm, "status", NAME] if nssm else ["sc", "query", NAME]))
        if not ok:
            return "unknown"
        if "SERVICE_RUNNING" in out or "RUNNING" in out:
            return "running"
        if "SERVICE_STOPPED" in out or "STOPPED" in out:
            return "stopped"
        return "unknown"
    ok, out = quiet(["systemctl", "is-active", NAME])
    out = out.strip()
    if out == "active":
        return "running"
    if out == "inactive":
        return "stopped"
    if out == "failed":
        return "error"
    return "unknown"


def service_start():
    if METHOD == "docker":
        return run(compose_cmd("up", "-d"), cwd=APP_DIR, timeout=300)
    if WINDOWS:
        if WIN_SERVICE == "task":
            return run(["schtasks", "/run", "/tn", f"{TASK_PATH}{NAME}"])
        nssm = find_nssm()
        return run([nssm, "start", NAME] if nssm else ["sc", "start", NAME])
    return run(["systemctl", "start", NAME])


def windows_force_stop(name, timeout=60):
    """Stop a Windows service unconditionally: stops it (and anything that declares itself a
    dependent of it) the normal way, then force-kills whatever's still running. A plain
    `nssm stop` / `sc stop` goes through the same Windows SCM call either way, so it fails outright
    with "Cannot stop service ... because it has dependent services" whenever anything else is set
    up to depend on this one — the same error the Control Panel must never show a user clicking
    Stop. This also clears a service stuck in StopPending, which a plain stop can't."""
    ps = (
        "$ErrorActionPreference = 'SilentlyContinue';"
        f"$svc = Get-Service -Name '{name}';"
        "if (-not $svc) { Write-Output 'service not found'; exit 1 }"
        f"$all = @($svc) + (Get-Service -Name '{name}' -DependentServices);"
        "foreach ($s in $all) { if ($s.Status -ne 'Stopped') { Stop-Service -Name $s.Name -Force } }"
        "Start-Sleep -Milliseconds 500;"
        "foreach ($s in $all) {"
        "  $cur = Get-Service -Name $s.Name -ErrorAction SilentlyContinue;"
        "  if ($cur -and $cur.Status -ne 'Stopped') {"
        "    $wmi = Get-CimInstance Win32_Service -Filter (\"Name='\" + $s.Name + \"'\");"
        "    if ($wmi -and $wmi.ProcessId -gt 0) { Stop-Process -Id $wmi.ProcessId -Force }"
        "  }"
        "}"
        "Start-Sleep -Milliseconds 500;"
        f"foreach ($s in $all) {{ Stop-Service -Name $s.Name -Force }};"
        f"$final = Get-Service -Name '{name}';"
        "if ($final.Status -ne 'Stopped') { Write-Output ('still ' + $final.Status); exit 1 }"
        "Write-Output 'stopped'"
    )
    return run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps], timeout=timeout)


def service_stop():
    if METHOD == "docker":
        return run(compose_cmd("stop"), cwd=APP_DIR, timeout=120)
    if WINDOWS:
        if WIN_SERVICE == "task":
            return run(["schtasks", "/end", "/tn", f"{TASK_PATH}{NAME}"])
        return windows_force_stop(NAME)
    return run(["systemctl", "stop", NAME])


def service_restart():
    if METHOD == "docker":
        return run(compose_cmd("restart"), cwd=APP_DIR, timeout=300)
    if WINDOWS:
        ok, last = service_stop()
        if not ok:
            return ok, last
        time.sleep(2)
        return service_start()
    return run(["systemctl", "restart", NAME])


def tail_log(n=200):
    if METHOD == "docker":
        ok, out = quiet(["docker", "compose", "-p", NAME, "-f", COMPOSE_FILE, "logs", "--tail", str(n)], timeout=20)
        return [sanitize(ANSI.sub("", l).rstrip()) for l in out.splitlines()] if ok else []
    if not os.path.exists(CAD_LOG):
        return []
    try:
        with open(CAD_LOG, "r", errors="replace") as f:
            lines = f.readlines()[-n:]
        return [sanitize(ANSI.sub("", l).rstrip()) for l in lines]
    except OSError:
        return []


# --- rebuild: runs the build directly, WITHOUT touching the running service, so a plain "Rebuild"
# never interrupts whoever's using the CAD right now — only "Rebuild and restart" does -----------

def do_rebuild():
    log_line("Rebuilding — this can take a few minutes…")
    if METHOD == "docker":
        ok, last = run(["docker", "compose", "-p", NAME, "-f", COMPOSE_FILE, "build"], cwd=APP_DIR, timeout=3 * 60 * 60, on_line=log_line)
    else:
        ok, last = run([*pnpm_cmd(), "run", "build"], cwd=APP_DIR, timeout=3 * 60 * 60, on_line=log_line)
    with open(BUILD_LOG_PATH, "a") as f:
        f.write(f"\n--- rebuild {time.strftime('%Y-%m-%d %H:%M:%S')} ({'ok' if ok else 'FAILED'}) ---\n")
        for entry in OPERATION["lines"]:
            f.write(entry["text"] + "\n")
    log_line("Rebuild finished successfully." if ok else f"Rebuild failed: {last}", "info" if ok else "error")
    return ok


def run_operation(kind):
    with lock:
        if OPERATION["kind"] is not None:
            return False
        OPERATION["kind"] = kind
        OPERATION["startedAt"] = int(time.time())
        OPERATION["lines"] = []
        OPERATION["error"] = None

    def finish(ok, error=None):
        OPERATION["kind"] = None
        OPERATION["error"] = None if ok else (error or "Operation failed")

    def worker():
        try:
            if kind == "start":
                ok, last = service_start()
                log_line("Service started." if ok else f"Could not start the service: {last}", "info" if ok else "error")
                finish(ok, last if not ok else None)
            elif kind == "stop":
                ok, last = service_stop()
                log_line("Service stopped." if ok else f"Could not stop the service: {last}", "info" if ok else "error")
                finish(ok, last if not ok else None)
            elif kind == "restart":
                log_line("Restarting…")
                ok, last = service_restart()
                log_line("Service restarted." if ok else f"Could not restart the service: {last}", "info" if ok else "error")
                finish(ok, last if not ok else None)
            elif kind == "rebuild":
                ok = do_rebuild()
                finish(ok, None if ok else "Rebuild failed — see the log")
            elif kind == "rebuild-restart":
                ok = do_rebuild()
                if not ok:
                    log_line("Skipping restart — the rebuild failed, so the currently running build keeps serving.", "error")
                    finish(False, "Rebuild failed — the service was not restarted, so it's still running the previous build")
                    return
                log_line("Rebuild succeeded — restarting…")
                ok2, last = service_restart()
                log_line("Service restarted." if ok2 else f"Rebuild succeeded, but the restart failed: {last}", "info" if ok2 else "error")
                finish(ok2, None if ok2 else last)
        except Exception as e:  # noqa: BLE001 — never leave OPERATION stuck mid-flight
            traceback.print_exc()
            log_line(f"Unexpected error: {e}", "error")
            finish(False, str(e))

    threading.Thread(target=worker, daemon=True).start()
    return True


# --- HTTP ---------------------------------------------------------------------------------

def token_matches(value):
    return isinstance(value, str) and hmac.compare_digest(value.encode(), TOKEN.encode())


class Handler(BaseHTTPRequestHandler):
    server_version = "SnailyCAD-Control"

    def log_message(self, *args):
        pass

    def send(self, status, body, content_type="application/json"):
        data = (json.dumps(body) if content_type == "application/json" else body).encode()
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Frame-Options", "DENY")
        self.end_headers()
        self.wfile.write(data)

    def authorized(self):
        # loopback-only binding is the real boundary; the header check is defense in depth
        # against other local users/processes on a shared machine
        return token_matches(self.headers.get("X-Control-Token", ""))

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/":
            with open(PAGE_PATH) as f:
                html = f.read().replace("__CONTROL_TOKEN__", TOKEN)
            return self.send(200, html, "text/html; charset=utf-8")
        if not self.authorized():
            return self.send(401, {"error": "Missing or wrong control token."})
        if url.path == "/api/status":
            return self.send(200, {
                "service": NAME,
                "method": METHOD,
                "status": service_status(),
                "operation": OPERATION["kind"],
                "operationStartedAt": OPERATION["startedAt"],
                "lastError": OPERATION["error"],
                "lines": OPERATION["lines"][-40:],
            })
        if url.path == "/api/logs":
            return self.send(200, {"lines": tail_log()})
        return self.send(404, {"error": "Not found"})

    def do_POST(self):
        if not self.authorized():
            return self.send(401, {"error": "Missing or wrong control token."})
        path = urlparse(self.path).path
        kind = {"/api/start": "start", "/api/stop": "stop", "/api/restart": "restart",
                "/api/rebuild": "rebuild", "/api/rebuild-restart": "rebuild-restart"}.get(path)
        if not kind:
            return self.send(404, {"error": "Not found"})
        if not run_operation(kind):
            return self.send(409, {"error": f"Already {OPERATION['kind']} — wait for it to finish."})
        return self.send(202, {"ok": True, "operation": kind})


def main():
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    server.daemon_threads = True
    print(f"SnailyCAD control daemon on http://127.0.0.1:{PORT} (service: {NAME}, method: {METHOD})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
