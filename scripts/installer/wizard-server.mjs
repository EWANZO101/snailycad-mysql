#!/usr/bin/env node
/**
 * SnailyCAD setup wizard: a step-by-step install page served on the server's IP.
 *
 * Started by scripts/installer/install.sh (as a transient systemd unit). No dependencies, it runs
 * before `pnpm install`. The browser walks through checks -> database -> website -> install; then
 * this server creates the database, writes .env, opens the firewall and starts the CAD's systemd
 * service, whose start.sh installs, builds and starts the CAD. Progress comes from the status
 * files start.sh writes (.snaily-cache/status), the same ones the "CAD is updating" page uses.
 *
 * Every change made outside the install folder is written to installer/manifest.env first, so
 * uninstall.sh can remove it again.
 *
 * Access needs the token install.sh printed (?token=..., then kept in a cookie).
 */
import http from "node:http";
import net from "node:net";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const INSTALL_DIR = process.env.SNAILY_INSTALL_DIR;
if (!INSTALL_DIR) {
  console.error("SNAILY_INSTALL_DIR is not set; start this through install.sh.");
  process.exit(1);
}
const APP_DIR = path.join(INSTALL_DIR, "app");
const RUNTIME_BIN = path.join(INSTALL_DIR, "runtime", "node", "bin");
const INSTALLER_DIR = path.join(INSTALL_DIR, "installer");
const MANIFEST_PATH = path.join(INSTALLER_DIR, "manifest.env");
const TOKEN_PATH = path.join(INSTALLER_DIR, "token");
const STATUS_DIR = path.join(APP_DIR, ".snaily-cache", "status");
const PAGE_PATH = path.join(__dirname, "wizard.html");
const PORT = Number(process.env.SNAILY_WIZARD_PORT || 3100);
const TOKEN = fs.readFileSync(TOKEN_PATH, "utf8").trim();
const COOKIE = "snaily_wizard";
/** the wizard shuts itself down after this long, finished or not */
const MAX_RUNTIME_MS = 12 * 60 * 60 * 1000;

const SAFE_NAME = /^[A-Za-z0-9_]{1,32}$/;
const HOSTNAME = /^[A-Za-z0-9]([A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;

// --- helpers ----------------------------------------------------------------------

function run(command, args, { env, timeout = 10 * 60 * 1000 } = {}) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { env: { ...process.env, ...env }, timeout, maxBuffer: 16 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ ok: !error, code: error?.code ?? 0, stdout: String(stdout), stderr: String(stderr) });
      },
    );
  });
}

function readManifest() {
  const entries = [];
  for (const line of fs.readFileSync(MANIFEST_PATH, "utf8").split("\n")) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (match) entries.push([match[1], match[2]]);
  }
  return entries;
}

function manifestValue(key) {
  return readManifest().findLast(([k]) => k === key)?.[1] ?? null;
}

function addToManifest(key, value) {
  if (readManifest().some(([k, v]) => k === key && v === String(value))) return;
  fs.appendFileSync(MANIFEST_PATH, `${key}=${value}\n`);
}

function removeFromManifest(key, value) {
  const kept = fs
    .readFileSync(MANIFEST_PATH, "utf8")
    .split("\n")
    .filter((line) => line !== `${key}=${value}`);
  fs.writeFileSync(MANIFEST_PATH, kept.join("\n"));
}

const NAME = manifestValue("NAME") ?? "snailycad";
const BRANCH = manifestValue("BRANCH") ?? "main";

function randomHex(bytes) {
  return crypto.randomBytes(bytes).toString("hex");
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen({ port, host: "0.0.0.0", exclusive: true }, () => server.close(() => resolve(true)));
  });
}

async function firstFreePort(start, skip) {
  for (let port = start; port < start + 200; port++) {
    if (port === PORT || skip.includes(port)) continue;
    if (await isPortFree(port)) return port;
  }
  return null;
}

function serverIp() {
  for (const addresses of Object.values(os.networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) return address.address;
    }
  }
  return "127.0.0.1";
}

async function commandExists(command) {
  return (await run("sh", ["-c", `command -v ${command}`])).ok;
}

async function ufwActive() {
  if (!(await commandExists("ufw"))) return false;
  return /Status: active/.test((await run("ufw", ["status"])).stdout);
}

function socketMysql(sql) {
  return run("mysql", ["-uroot", "-N", "-B", "-e", sql], { timeout: 30_000 });
}

function externalMysql(db, sql) {
  return run("mysql", ["-h", db.host, "-P", String(db.port), "-u", db.user, "-N", "-B", "-e", sql], {
    env: { MYSQL_PWD: db.password },
    timeout: 30_000,
  });
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

// --- system checks --------------------------------------------------------------------

async function getChecks() {
  const release = fs.existsSync("/etc/os-release") ? fs.readFileSync("/etc/os-release", "utf8") : "";
  const osName = release.match(/^PRETTY_NAME="?([^"\n]+)"?/m)?.[1] ?? `${os.type()} ${os.release()}`;
  const meminfo = fs.existsSync("/proc/meminfo") ? fs.readFileSync("/proc/meminfo", "utf8") : "";
  const kb = (key) => Number(meminfo.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"))?.[1] ?? 0);
  const memMb = Math.round(kb("MemTotal") / 1024);
  const swapMb = Math.round(kb("SwapTotal") / 1024);
  const disk = fs.statfsSync(INSTALL_DIR);
  const diskFreeGb = Math.round(((disk.bavail * disk.bsize) / 1024 ** 3) * 10) / 10;
  const cpus = os.cpus().length;

  const hasClient = await commandExists("mysql");
  const hasServer = (await commandExists("mysqld")) || (await commandExists("mariadbd"));
  const socketRoot = hasClient && (await socketMysql("SELECT 1")).ok;
  const port3306Free = await isPortFree(3306);

  const clientPort = await firstFreePort(3000, []);
  const apiPort = await firstFreePort(8080, [clientPort]);

  return {
    os: osName,
    cpus,
    memMb,
    swapMb,
    diskFreeGb,
    ip: serverIp(),
    ports: { client: clientPort, api: apiPort },
    items: [
      { label: "Operating system", value: osName, ok: /ubuntu/i.test(osName), warnOnly: true },
      { label: "CPU", value: `${cpus} core(s)`, ok: cpus >= 2, warnOnly: true, hint: "2 or more recommended" },
      {
        label: "Memory",
        value: `${memMb} MB RAM + ${swapMb} MB swap`,
        ok: memMb + swapMb >= 3800,
        warnOnly: true,
        hint: "the build needs about 4 GB of RAM + swap",
      },
      { label: "Free disk space", value: `${diskFreeGb} GB`, ok: diskFreeGb >= 5, hint: "at least 5 GB needed" },
    ],
    db: {
      // a MySQL/MariaDB server on this machine that root can use through its socket
      local: socketRoot,
      // nothing installed yet and the default port is free
      install: !hasServer && port3306Free,
    },
  };
}

// --- install job ------------------------------------------------------------------------

const STEPS = [
  ["database", "Database", "Create the database and its user"],
  ["config", "Settings", "Write the CAD's .env file"],
  ["firewall", "Firewall", "Open the website and API ports"],
  ["service", "Service", "Start the CAD as a system service"],
  ["dependencies", "Dependencies", "Download the packages the CAD needs"],
  ["build", "Build", "Compile the website and API (the longest step)"],
  ["start", "Start", "Run database migrations and start the CAD"],
];

const job = {
  started: false,
  failed: null,
  startedAt: null,
  settings: null,
  steps: Object.fromEntries(STEPS.map(([id]) => [id, "pending"])),
  lines: [],
};

function say(text, level = "info") {
  job.lines.push({ t: Math.floor(Date.now() / 1000), level, text });
  job.lines = job.lines.slice(-80);
  console.log(`[${level}] ${text}`);
}

class StepError extends Error {}

function check(result, message) {
  if (!result.ok) {
    const detail = (result.stderr || result.stdout).trim().split("\n").at(-1) ?? "";
    throw new StepError(detail ? `${message}: ${detail.slice(0, 200)}` : message);
  }
  return result;
}

function validateSettings(body) {
  const errors = [];
  const db = body?.db ?? {};
  const settings = {
    address: String(body?.address ?? "").trim(),
    clientPort: Number(body?.clientPort),
    apiPort: Number(body?.apiPort),
    db: { mode: db.mode },
  };

  if (!HOSTNAME.test(settings.address)) errors.push("Enter a valid IP address or domain.");
  for (const [label, port] of [["Website", settings.clientPort], ["API", settings.apiPort]]) {
    if (!Number.isInteger(port) || port < 1024 || port > 65535) errors.push(`${label} port must be 1024-65535.`);
    if (port === PORT) errors.push(`${label} port is the setup wizard's own port.`);
  }
  if (settings.clientPort === settings.apiPort) errors.push("Website and API need different ports.");

  if (db.mode === "local" || db.mode === "install") {
    settings.db.name = String(db.name ?? "");
    settings.db.user = String(db.user ?? "");
    if (!SAFE_NAME.test(settings.db.name)) errors.push("Database name: letters, numbers and _ only.");
    if (!SAFE_NAME.test(settings.db.user)) errors.push("Database user: letters, numbers and _ only.");
  } else if (db.mode === "external") {
    settings.db.host = String(db.host ?? "").trim();
    settings.db.port = Number(db.port);
    settings.db.user = String(db.user ?? "");
    settings.db.password = String(db.password ?? "");
    settings.db.name = String(db.name ?? "");
    if (!HOSTNAME.test(settings.db.host)) errors.push("Enter the database server's host.");
    if (!Number.isInteger(settings.db.port) || settings.db.port < 1 || settings.db.port > 65535) {
      errors.push("Enter the database server's port.");
    }
    if (!settings.db.user || settings.db.user.length > 80) errors.push("Enter the database user.");
    if (!SAFE_NAME.test(settings.db.name)) errors.push("Database name: letters, numbers and _ only.");
  } else {
    errors.push("Choose a database option.");
  }
  return { settings, errors };
}

async function ensureMysqlClient() {
  if (await commandExists("mysql")) return;
  say("Installing the MySQL client...");
  addToManifest("APT_PACKAGE", "mariadb-client");
  check(await run("apt-get", ["update", "-qq"]), "apt-get update failed");
  check(
    await run("apt-get", ["install", "-y", "-qq", "mariadb-client"], { env: { DEBIAN_FRONTEND: "noninteractive" } }),
    "Could not install the MySQL client",
  );
}

async function testExternal(db) {
  await ensureMysqlClient();
  const result = await externalMysql(db, "SELECT VERSION()");
  if (!result.ok) {
    return { ok: false, message: (result.stderr.trim().split("\n").at(-1) || "Could not connect.").slice(0, 200) };
  }
  return { ok: true, message: `Connected: ${result.stdout.trim()}` };
}

async function stepDatabase(settings) {
  const db = settings.db;

  if (db.mode === "external") {
    const test = await testExternal(db);
    if (!test.ok) throw new StepError(test.message);
    say(test.message);
    addToManifest("DB_NAME", db.name);
    addToManifest("DB_USER", db.user);
    addToManifest("DB_ADMIN", "external");
    // usually allowed; when it isn't the database must already exist
    await externalMysql(db, `CREATE DATABASE IF NOT EXISTS \`${db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    return { host: db.host, port: db.port, user: db.user, password: db.password, name: db.name };
  }

  if (db.mode === "install") {
    say("Installing MariaDB (a few minutes)...");
    addToManifest("APT_MARIADB", "1");
    check(await run("apt-get", ["update", "-qq"]), "apt-get update failed");
    check(
      await run("apt-get", ["install", "-y", "-qq", "mariadb-server"], { env: { DEBIAN_FRONTEND: "noninteractive" } }),
      "Could not install MariaDB",
    );
    check(await run("systemctl", ["enable", "--now", "mariadb"]), "Could not start MariaDB");
    say("MariaDB installed and running.");
  }

  check(await socketMysql("SELECT 1"), "Cannot log in to MySQL/MariaDB as root through its socket");

  // created by an earlier attempt of this wizard: reuse it. Anything else is not ours to touch.
  const ours = manifestValue("DB_NAME") === db.name && manifestValue("DB_USER") === db.user;
  if (!ours) {
    const existingDb = check(await socketMysql(`SHOW DATABASES LIKE '${db.name}'`), "Could not list databases");
    if (existingDb.stdout.trim()) throw new StepError(`A database named ${db.name} already exists. Pick another name.`);
    const existingUser = check(
      await socketMysql(`SELECT COUNT(*) FROM mysql.user WHERE user = '${db.user}'`),
      "Could not list users",
    );
    if (existingUser.stdout.trim() !== "0") throw new StepError(`A user named ${db.user} already exists. Pick another name.`);
  }

  addToManifest("DB_NAME", db.name);
  addToManifest("DB_USER", db.user);
  addToManifest("DB_ADMIN", "socket");

  const password = randomHex(16);
  const sql = [
    `CREATE DATABASE IF NOT EXISTS \`${db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    `DROP USER IF EXISTS '${db.user}'@'localhost'`,
    `DROP USER IF EXISTS '${db.user}'@'127.0.0.1'`,
    `CREATE USER '${db.user}'@'localhost' IDENTIFIED BY '${password}'`,
    `CREATE USER '${db.user}'@'127.0.0.1' IDENTIFIED BY '${password}'`,
    `GRANT ALL PRIVILEGES ON \`${db.name}\`.* TO '${db.user}'@'localhost'`,
    `GRANT ALL PRIVILEGES ON \`${db.name}\`.* TO '${db.user}'@'127.0.0.1'`,
    "FLUSH PRIVILEGES",
  ].join("; ");
  check(await socketMysql(sql), "Could not create the database");
  say(`Database ${db.name} and user ${db.user} created.`);

  const port = Number((await socketMysql("SELECT @@port")).stdout.trim() || 3306);
  return { host: "127.0.0.1", port, user: db.user, password, name: db.name };
}

function stepConfig(settings, database) {
  const clientUrl = `http://${settings.address}:${settings.clientPort}`;
  const apiUrl = `http://${settings.address}:${settings.apiPort}/v1`;
  const values = {
    DB_PASSWORD: encodeURIComponent(database.password),
    DB_USER: encodeURIComponent(database.user),
    DB_HOST: database.host,
    DB_PORT: String(database.port),
    DB_NAME: database.name,
    JWT_SECRET: randomHex(32),
    ENCRYPTION_TOKEN: randomHex(16),
    CORS_ORIGIN_URL: clientUrl,
    NEXT_PUBLIC_CLIENT_URL: clientUrl,
    NEXT_PUBLIC_PROD_ORIGIN: apiUrl,
    DOMAIN: "",
    SECURE_COOKIES_FOR_IFRAME: "false",
    PORT_API: String(settings.apiPort),
    PORT_CLIENT: String(settings.clientPort),
    NODE_ENV: "production",
  };

  let text = fs.readFileSync(path.join(APP_DIR, ".env.example"), "utf8");
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}="${value}"`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
  }
  const envPath = path.join(APP_DIR, ".env");
  fs.writeFileSync(envPath, text, { mode: 0o600 });
  say(`Settings written. Website: ${clientUrl}  API: ${apiUrl}`);
  return clientUrl;
}

async function stepFirewall(settings) {
  if (!(await ufwActive())) {
    say("No active ufw firewall; nothing to open.");
    return;
  }
  for (const port of [settings.clientPort, settings.apiPort]) {
    addToManifest("UFW_PORT", port);
    check(await run("ufw", ["allow", `${port}/tcp`, "comment", `${NAME} SnailyCAD`]), `Could not open port ${port}`);
  }
  say(`Firewall: opened ports ${settings.clientPort} and ${settings.apiPort}.`);
}

async function stepService() {
  const unitPath = `/etc/systemd/system/${NAME}.service`;
  addToManifest("CAD_SERVICE", NAME);
  const unit = `[Unit]
Description=SnailyCAD (${INSTALL_DIR}, made by the setup wizard)
After=network.target mariadb.service mysql.service
StartLimitIntervalSec=3600
StartLimitBurst=3

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
Environment=PATH=${RUNTIME_BIN}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
Environment=SNAILYCAD_SERVICE_NAME=${NAME}
Environment=UPDATE_BRANCH=${BRANCH}
ExecStart=${APP_DIR}/start.sh
StandardOutput=append:${APP_DIR}/start.log
StandardError=append:${APP_DIR}/start.log
Restart=on-failure
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
`;
  fs.writeFileSync(unitPath, unit);
  check(await run("systemctl", ["daemon-reload"]), "systemctl daemon-reload failed");
  check(await run("systemctl", ["enable", "--now", NAME]), "Could not start the CAD service");
  say(`Service ${NAME} started; it installs, builds and starts the CAD.`);
}

async function runInstall(settings) {
  job.started = true;
  job.failed = null;
  job.startedAt = Math.floor(Date.now() / 1000);
  job.settings = settings;
  let current = null;
  const step = async (id, fn) => {
    current = id;
    job.steps[id] = "active";
    const result = await fn();
    job.steps[id] = "done";
    return result;
  };

  try {
    const database = await step("database", () => stepDatabase(settings));
    job.cadUrl = await step("config", () => stepConfig(settings, database));
    await step("firewall", () => stepFirewall(settings));
    await step("service", () => stepService());
  } catch (error) {
    job.steps[current] = "failed";
    job.failed = error instanceof StepError ? error.message : "Unexpected error, see: journalctl -u " + NAME + "-installer";
    job.started = false; // the settings can be changed and the install tried again
    say(job.failed, "error");
    if (!(error instanceof StepError)) console.error(error);
  }
}

/** service phases come from the status files start.sh writes */
function serviceProgress() {
  const status = readJson(path.join(STATUS_DIR, "status.json"));
  const log = readJson(path.join(STATUS_DIR, "log.json"));
  const phase = status?.phase ?? null;
  const order = ["dependencies", "build", "start"];
  const activeIndex = { preparing: 0, installing: 0, building: 1, starting: 2 }[phase];

  if (phase === "running") {
    for (const id of order) job.steps[id] = "done";
  } else if (activeIndex !== undefined) {
    order.forEach((id, index) => {
      job.steps[id] = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
    });
  } else if (phase === "failed") {
    const active = order.find((id) => job.steps[id] === "active") ?? "dependencies";
    job.steps[active] = "failed";
  }
  return { phase, lines: log?.lines ?? [] };
}

async function retryService() {
  say("Restarting the CAD service...");
  await run("systemctl", ["reset-failed", NAME]);
  check(await run("systemctl", ["restart", NAME]), "Could not restart the CAD service");
}

async function finish() {
  if (readManifest().some(([k, v]) => k === "UFW_PORT" && v === String(PORT))) {
    await run("ufw", ["delete", "allow", `${PORT}/tcp`]);
    removeFromManifest("UFW_PORT", PORT);
  }
  fs.rmSync(TOKEN_PATH, { force: true });
  console.log("Setup wizard closed.");
  setTimeout(() => process.exit(0), 300);
}

// --- http -------------------------------------------------------------------------------

function tokenMatches(value) {
  if (typeof value !== "string" || value.length !== TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(value), Buffer.from(TOKEN));
}

function cookieToken(req) {
  const match = (req.headers.cookie ?? "").match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match?.[1];
}

function send(res, status, body, type = "application/json") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 64 * 1024) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data || "{}"));
      } catch {
        resolve(null);
      }
    });
  });
}

const LOCKED_PAGE = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>SnailyCAD Setup</title><body style="background:#111827;color:#d1d5db;font:16px system-ui;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px">
<div style="max-width:440px;text-align:center"><h1 style="color:#fff;font-size:1.4rem">SnailyCAD Setup</h1>
<p>Open the full link the installer printed in your terminal (it ends with <code>?token=…</code>).</p></div>`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://wizard");

  const queryToken = url.searchParams.get("token");
  if (url.pathname === "/" && queryToken && tokenMatches(queryToken)) {
    res.writeHead(302, {
      "Set-Cookie": `${COOKIE}=${TOKEN}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
      Location: "/",
      "Cache-Control": "no-store",
    });
    return res.end();
  }

  if (!tokenMatches(cookieToken(req))) {
    if (url.pathname.startsWith("/api/")) return send(res, 401, { error: "Not signed in to the wizard." });
    return send(res, 401, LOCKED_PAGE, "text/html; charset=utf-8");
  }

  try {
    if (req.method === "GET" && url.pathname === "/") {
      return send(res, 200, fs.readFileSync(PAGE_PATH, "utf8"), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && url.pathname === "/api/checks") {
      return send(res, 200, await getChecks());
    }
    if (req.method === "GET" && url.pathname === "/api/state") {
      const service = job.steps.service === "done" ? serviceProgress() : { phase: null, lines: [] };
      return send(res, 200, {
        started: job.started,
        failed: job.failed,
        startedAt: job.startedAt,
        phase: service.phase,
        steps: STEPS.map(([id, title, detail]) => ({ id, title, detail, state: job.steps[id] })),
        lines: [...job.lines, ...service.lines].sort((a, b) => a.t - b.t).slice(-80),
        cadUrl: job.cadUrl ?? null,
        name: NAME,
        uninstall: `sudo bash ${INSTALL_DIR}/uninstall.sh`,
      });
    }

    if (req.method !== "POST") return send(res, 404, { error: "Not found" });
    if (!String(req.headers["content-type"] ?? "").startsWith("application/json")) {
      return send(res, 415, { error: "JSON only" });
    }
    const body = await readBody(req);

    if (url.pathname === "/api/port") {
      const port = Number(body?.port);
      const free = Number.isInteger(port) && port >= 1024 && port <= 65535 && port !== PORT && (await isPortFree(port));
      return send(res, 200, { free });
    }
    if (url.pathname === "/api/db-test") {
      // placeholder website settings, only the database part is checked here
      const { settings, errors } = validateSettings({ db: body?.db, address: "localhost", clientPort: 65000, apiPort: 65001 });
      if (settings.db.mode !== "external") errors.push("Only an external database server can be tested.");
      if (errors.length) return send(res, 400, { ok: false, message: errors[0] });
      try {
        return send(res, 200, await testExternal(settings.db));
      } catch (error) {
        return send(res, 200, { ok: false, message: error.message });
      }
    }
    if (url.pathname === "/api/install") {
      if (job.started) return send(res, 409, { error: "The install is already running." });
      const { settings, errors } = validateSettings(body);
      for (const port of [settings.clientPort, settings.apiPort]) {
        if (!errors.length && !(await isPortFree(port))) errors.push(`Port ${port} is already in use.`);
      }
      if (errors.length) return send(res, 400, { error: errors.join(" ") });
      runInstall(settings);
      return send(res, 202, { ok: true });
    }
    if (url.pathname === "/api/retry") {
      if (job.steps.service !== "done") return send(res, 409, { error: "Nothing to retry yet." });
      try {
        await retryService();
        return send(res, 200, { ok: true });
      } catch (error) {
        return send(res, 500, { error: error.message });
      }
    }
    if (url.pathname === "/api/finish") {
      send(res, 200, { ok: true });
      return finish();
    }
    return send(res, 404, { error: "Not found" });
  } catch (error) {
    console.error(error);
    return send(res, 500, { error: "Unexpected error in the setup wizard." });
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Setup wizard on http://0.0.0.0:${PORT}`));
setTimeout(() => {
  console.log("Setup wizard timed out.");
  finish();
}, MAX_RUNTIME_MS).unref();
