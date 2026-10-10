#!/usr/bin/env node
/**
 * "The CAD is updating" page, served while SnailyCAD is installing, building or restarting.
 *
 * Started by start.sh (and scripts/update-cad.sh). It:
 * - serves the progress page on PORT_CLIENT (default 3000) for every URL, with a 503 status,
 *   plus /__snaily_status.json and /__snaily_log.json, while the CAD itself isn't running;
 * - tails the start log and publishes a safe, filtered version of it (only known progress lines,
 *   credentials masked). The raw log is never served;
 * - releases the port on SIGUSR1 (right before the CAD starts) and exits once the status file
 *   says the CAD is running or failed.
 *
 * usage: node scripts/status-server.mjs --status <status.json> --log <start.log> --out <log.json>
 *        [--port 3000] [--page scripts/status-page/index.html]
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

const STATUS_PATH = arg("status");
const LOG_PATH = arg("log");
const OUT_PATH = arg("out");
const PORT = Number(arg("port", process.env.PORT_CLIENT || "3000"));
const PAGE_PATH = arg("page", path.join(__dirname, "status-page", "index.html"));
const MAX_LINES = 60;
const MAX_RUNTIME_MS = 45 * 60 * 1000;
/** lines from a previous run are kept only when it ended this recently (e.g. the updater's steps) */
const CARRY_OVER_SECONDS = 60;

if (!STATUS_PATH || !LOG_PATH || !OUT_PATH) {
  console.error("usage: status-server.mjs --status <file> --log <file> --out <file>");
  process.exit(1);
}

// --- log filtering ------------------------------------------------------------

const ANSI = /\x1b\[[0-9;]*[A-Za-z]/g;
const TURBO_PREFIX = /^(?:@snailycad\/[\w-]+:[\w-]+: )+/;
const PACKAGE = /^@snailycad\/([\w-]+):[\w-]+:/;
const CONCURRENTLY_PREFIX = /^\[\d\] /;

/** only lines matching one of these are published */
const ALLOW = [
  [/^\[(\*|!|x)\] (.+)$/, null],
  [/Creating an optimized production build/, "Compiling the client…"],
  [/Compiled successfully/, "Client compiled"],
  [/Linting and checking validity/, "Checking types…"],
  [/Collecting page data/, "Collecting page data…"],
  [/Generating static pages \((\d+)\/(\d+)\)/, "Generating pages ($1/$2)"],
  [/Finalizing page optimization/, "Optimising pages…"],
  [/Collecting build traces/, "Collecting build traces…"],
  [/(?:ESM|CJS) ⚡️ Build success/, "Package built"],
  [/DTS ⚡️ Build success/, "Package types built"],
  [/^Tasks:\s+(.+)$/, "Tasks: $1"],
  [/^\s*Time:\s+(.+)$/, "Step took $1"],
  [/(\d+) migrations found/, "$1 database migrations found"],
  [/Applying migration `([\w-]+)`/, "Applying migration $1"],
  [/All migrations have been successfully applied/, "Database migrations applied"],
  [/No pending migrations to apply/, "Database is up to date"],
  [/Generated Prisma Client/, "Database client generated"],
  [/✓ Ready in (\S+)/, "Website ready in $1"],
  [/SnailyCADv4 is running with version (\S+)/, "API running, version $1"],
  [/\[demo\] (.+)$/, "Demo: $1"],
  [/(Failed to compile|Type error)/, "Error: $1 (see server logs)"],
];

const SECRET = /((?:token|secret|password|passwd|key|auth|cookie|session|dsn)[\w-]*\s*[=:]\s*)\S+/gi;
const URL_CREDENTIALS = /(\w+:\/\/)[^/\s:@]+:[^/\s@]+@/g;

function sanitize(text) {
  return text.replace(SECRET, "$1••••").replace(URL_CREDENTIALS, "$1••••@").slice(0, 160);
}

function classify(raw) {
  let line = raw.replace(ANSI, "").trimEnd();
  const pkg = line.match(PACKAGE)?.[1] ?? null;
  line = line.replace(TURBO_PREFIX, "").replace(CONCURRENTLY_PREFIX, "").trim();
  if (!line) return null;

  for (const [pattern, label] of ALLOW) {
    const match = line.match(pattern);
    if (!match) continue;

    if (label === null) {
      const level = { "*": "info", "!": "warn", x: "error" }[match[1]];
      return { level, text: sanitize(match[2]) };
    }

    let text = label.replace(/\$(\d)/g, (_, index) => match[Number(index)] ?? "");
    if (pkg && !/^(Tasks|Step)/.test(text)) text = `${pkg}: ${text}`;
    return { level: text.startsWith("Error") ? "error" : "info", text: sanitize(text) };
  }
  return null;
}

// --- state --------------------------------------------------------------------

let lines = [];
let lastText = null;

try {
  const previous = JSON.parse(fs.readFileSync(OUT_PATH, "utf8"));
  if (Date.now() / 1000 - (previous.updatedAt ?? 0) < CARRY_OVER_SECONDS) {
    lines = (previous.lines ?? []).slice(-MAX_LINES);
    lastText = lines.at(-1)?.text ?? null;
  }
} catch {
  // no previous log
}

function writeLog() {
  const tmp = `${OUT_PATH}.${process.pid}.tmp`;
  try {
    fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
    fs.writeFileSync(
      tmp,
      JSON.stringify({ updatedAt: Math.floor(Date.now() / 1000), lines: lines.slice(-MAX_LINES) }),
    );
    fs.chmodSync(tmp, 0o644);
    fs.renameSync(tmp, OUT_PATH);
  } catch {
    // not critical
  }
}

function readPhase() {
  try {
    return JSON.parse(fs.readFileSync(STATUS_PATH, "utf8")).phase ?? null;
  } catch {
    return null;
  }
}

// --- tail the log ---------------------------------------------------------------

let position = 0;
let partial = "";
try {
  position = fs.statSync(LOG_PATH).size;
} catch {
  position = 0;
}
writeLog();

function readNewLines() {
  let stat;
  try {
    stat = fs.statSync(LOG_PATH);
  } catch {
    return;
  }
  if (stat.size < position) position = 0; // log was truncated
  if (stat.size === position) return;

  const fd = fs.openSync(LOG_PATH, "r");
  const buffer = Buffer.alloc(stat.size - position);
  fs.readSync(fd, buffer, 0, buffer.length, position);
  fs.closeSync(fd);
  position = stat.size;

  const chunk = partial + buffer.toString("utf8");
  const parts = chunk.split("\n");
  partial = parts.pop() ?? "";

  let changed = false;
  for (const part of parts) {
    const entry = classify(part);
    if (entry && entry.text !== lastText) {
      lines.push({ ...entry, t: Math.floor(Date.now() / 1000) });
      lastText = entry.text;
      changed = true;
    }
  }
  if (lines.length > MAX_LINES * 2) lines = lines.slice(-MAX_LINES);
  if (changed) writeLog();
}

// --- http -----------------------------------------------------------------------

function readFileOr(file, fallback) {
  try {
    return fs.readFileSync(file);
  } catch {
    return fallback;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const noStore = { "Cache-Control": "no-store" };

  if (url.pathname === "/__snaily_status.json") {
    res.writeHead(200, { ...noStore, "Content-Type": "application/json" });
    res.end(readFileOr(STATUS_PATH, "{}"));
    return;
  }

  if (url.pathname === "/__snaily_log.json") {
    res.writeHead(200, { ...noStore, "Content-Type": "application/json" });
    res.end(readFileOr(OUT_PATH, '{"lines":[]}'));
    return;
  }

  const status = url.pathname === "/__snaily_update" ? 200 : 503;
  res.writeHead(status, { ...noStore, "Content-Type": "text/html; charset=utf-8", "Retry-After": "30" });
  res.end(readFileOr(PAGE_PATH, "<h1>The CAD is updating</h1><p>Please try again in a few minutes.</p>"));
});

let listening = false;
server.on("error", (error) => {
  // the CAD (or something else) is using the port: keep publishing the log only
  if (error.code !== "EADDRINUSE") console.error(error);
});
server.listen(PORT, () => {
  listening = true;
});

function releasePort() {
  if (!listening) return;
  listening = false;
  server.close();
  server.closeAllConnections?.();
}

process.on("SIGUSR1", releasePort);

function shutdown() {
  releasePort();
  readNewLines();
  writeLog();
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// --- main loop ------------------------------------------------------------------

const startedAt = Date.now();
let isStopping = false;
setInterval(() => {
  readNewLines();

  const phase = readPhase();
  const isDone = phase === "running" || phase === "failed";
  if (!isStopping && (isDone || Date.now() - startedAt > MAX_RUNTIME_MS)) {
    isStopping = true;
    // short grace period to pick up the last lines
    setTimeout(shutdown, 2000);
  }
}, 500);
