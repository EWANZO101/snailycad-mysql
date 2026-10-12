// Built from integrations/fivem/sna-src by build-sna.mjs. Edit the sources, not this file.
"use strict";

// sna-src/lib/config.server.ts
var RESOURCE = GetCurrentResourceName();
function log(message) {
  console.log(`[${RESOURCE}] ${message}`);
}
function warn(message) {
  console.warn(`[${RESOURCE}] ${message}`);
}
function convar(name) {
  const value = GetConvar(name, "").trim();
  return value === "null" ? "" : value;
}
function normaliseUrl(raw) {
  const url = raw.trim().replace(/\/+$/, "");
  if (!url)
    return "";
  return url.endsWith("/v1") ? url : `${url}/v1`;
}
function getConnection() {
  let url = normaliseUrl(convar("snailycad_url"));
  let token = convar("snailycad_api_key");
  url ||= normaliseUrl(convar("snailycad_framework_api_url"));
  token ||= convar("snailycad_framework_api_token");
  return { url, token };
}
function parseEdition(value) {
  const v = value.toLowerCase();
  if (v === "auto" || v === "original")
    return v;
  if (v === "snailycad-mysql" || v === "mysql")
    return "snailycad-mysql";
  return null;
}
function getEditionSetting() {
  const resourceKey = RESOURCE.replace(/[^\w]/g, "_");
  for (const name of [`${resourceKey}_edition`, `${RESOURCE}_edition`, "snailycad_edition"]) {
    const value = convar(name);
    if (!value)
      continue;
    const parsed = parseEdition(value);
    if (parsed)
      return parsed;
    warn(`ignoring ${name} "${value}": use auto, original or snailycad-mysql`);
  }
  return "auto";
}
var detected = null;
var detecting = null;
var lastFailedAt = 0;
var RETRY_AFTER_MS = 6e4;
async function detectEdition() {
  const { url, token } = getConnection();
  if (!url)
    return "original";
  if (Date.now() - lastFailedAt < RETRY_AFTER_MS)
    return "original";
  try {
    const response = await fetch(`${url}/integrations/fivem/check`, {
      method: "POST",
      headers: { "content-type": "application/json", "snaily-cad-api-token": token },
      body: "{}",
      signal: AbortSignal.timeout(1e4)
    });
    await response.body?.cancel().catch(() => null);
    if (response.status === 200)
      return detected = await probePlayerHeader(url, token);
    if (response.status === 404)
      return detected = "original";
    lastFailedAt = Date.now();
    warn(
      `could not detect the SnailyCAD edition (HTTP ${response.status}${response.status === 401 ? ": check snailycad_api_key" : ""}); using "original" for now. Set snailycad_edition to skip detection.`
    );
  } catch (error) {
    lastFailedAt = Date.now();
    warn(
      `could not detect the SnailyCAD edition (${error instanceof Error ? error.message : String(error)}); using "original" for now.`
    );
  }
  return "original";
}
async function probePlayerHeader(url, token) {
  try {
    const response = await fetch(`${url}/user`, {
      method: "POST",
      headers: { "snaily-cad-api-token": token, "snaily-cad-player": "discord:0" },
      signal: AbortSignal.timeout(1e4)
    });
    const body = await response.json().catch(() => null);
    if (response.status === 401 && body?.message === "playerNotLinked")
      return "snailycad-mysql";
  } catch {
  }
  log(
    "this CAD can't sign players in by Discord / Steam yet (update the CAD for that), so the original edition is used: players sign in with /sn-auth and a personal API token."
  );
  return "original";
}
async function getEdition() {
  const setting = getEditionSetting();
  if (setting !== "auto")
    return setting;
  if (detected)
    return detected;
  detecting ??= detectEdition().finally(() => {
    detecting = null;
  });
  return detecting;
}
async function describeEdition() {
  const setting = getEditionSetting();
  const edition = await getEdition();
  if (setting !== "auto")
    return `${edition} (set by convar)`;
  return detected ? `${edition} (auto-detected)` : `${edition} (detection failed, will retry)`;
}

// sna-src/lib/cad.server.ts
var loggedOnce = /* @__PURE__ */ new Set();
function warnOnce(key, message) {
  if (loggedOnce.has(key))
    return;
  loggedOnce.add(key);
  warn(message);
}
async function cadRequest(options) {
  const edition = await getEdition();
  const { url, token } = getConnection();
  const auth = options.auth ?? { type: "api" };
  const fail = (status, errorMessage) => ({
    ok: false,
    status,
    data: null,
    errorMessage,
    edition
  });
  if (!url) {
    warnOnce(
      "url",
      "no CAD address: set snailycad_url in server.cfg, e.g. set snailycad_url https://cad-api.example.com/v1"
    );
    return fail(0, "notConfigured");
  }
  const headers = {};
  if (options.data !== void 0 && options.method !== "GET") {
    headers["content-type"] = "application/json";
  }
  let isFromDispatch = options.isFromDispatch ?? true;
  if (auth.type === "api" || auth.type === "player" && edition === "snailycad-mysql") {
    if (!token) {
      warnOnce("token", "no CAD API token: set snailycad_api_key in server.cfg");
      return fail(0, "notConfigured");
    }
    headers["snaily-cad-api-token"] = token;
  }
  if (auth.type === "player") {
    if (edition === "snailycad-mysql") {
      if (!auth.playerHeader)
        return fail(401, "noIdentifiers");
      headers["snaily-cad-player"] = auth.playerHeader;
      isFromDispatch = false;
    } else {
      if (!auth.userApiToken)
        return fail(401, "notAuthenticated");
      headers["snaily-cad-user-api-token"] = auth.userApiToken;
    }
  }
  if (isFromDispatch && auth.type !== "none") {
    headers["is-from-dispatch"] = "true";
  }
  let response;
  try {
    response = await fetch(`${url}${options.path}`, {
      method: options.method,
      headers,
      body: options.data !== void 0 && options.method !== "GET" ? JSON.stringify(options.data) : void 0,
      signal: AbortSignal.timeout(15e3)
    });
  } catch (error) {
    const cause = error instanceof Error ? error.cause : void 0;
    const reason = cause instanceof Error ? cause.message : error instanceof Error ? error.message : String(error);
    warn(`could not reach SnailyCAD at ${url} (${options.method} ${options.path}): ${reason}`);
    return fail(0, "unreachable");
  }
  const text = await response.text().catch(() => "");
  let body = text;
  if ((options.responseType ?? "json") === "json" || !response.ok) {
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = options.responseType === "text" ? text : null;
    }
  }
  if (!response.ok) {
    const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : `HTTP ${response.status}`;
    if (!options.quiet || response.status >= 500) {
      warn(
        `SnailyCAD API ${options.method} ${options.path.split("?")[0]} failed: HTTP ${response.status} ${message}${response.status === 401 && auth.type === "api" ? " (check snailycad_api_key)" : ""}`
      );
    }
    return fail(response.status, message);
  }
  return { ok: true, status: response.status, data: body, edition };
}

// sna-src/lib/player.server.ts
var lastUse = /* @__PURE__ */ new Map();
function throttled(key, source, ms) {
  const id = `${key}:${source}`;
  const now = Date.now();
  if (now - (lastUse.get(id) ?? 0) < ms)
    return true;
  lastUse.set(id, now);
  return false;
}
on("playerDropped", () => {
  const src = Number(globalThis.source);
  for (const key of lastUse.keys()) {
    if (key.endsWith(`:${src}`))
      lastUse.delete(key);
  }
});

// sna-src/lib/startup.server.ts
var VERSION_URL = "https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/integrations/fivem/sna-src/version.json";
var RELEASES_URL = "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem";
on("onResourceStart", (resourceName) => {
  if (resourceName !== GetCurrentResourceName())
    return;
  void startupChecks();
});
async function startupChecks() {
  log(`SnailyCAD edition: ${await describeEdition()}`);
  await verifyCad();
  await checkForUpdate();
}
async function verifyCad() {
  const { url } = getConnection();
  if (!url)
    return;
  const { ok, data } = await cadRequest({
    path: "/",
    method: "GET",
    responseType: "text"
  });
  if (!ok || typeof data !== "string" || !data.includes("200 Success")) {
    warn(`Failed to verify SnailyCAD at ${url}. Check that:
  - snailycad_url is the CAD API address ending in /v1
  - snailycad_api_key is the CAD API token (CAD Settings > API Token, turned on)
  - this server can reach the CAD API`);
  }
}
function compareVersions(a, b) {
  const pa = a.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0)
      return diff;
  }
  return 0;
}
async function checkForUpdate() {
  if (GetConvar("snailycad_version_check", "true") === "false")
    return;
  const current = GetResourceMetadata(GetCurrentResourceName(), "version", 0) || "0.0.0";
  try {
    const response = await fetch(VERSION_URL, { signal: AbortSignal.timeout(1e4) });
    if (!response.ok)
      throw new Error(`HTTP ${response.status}`);
    const { version } = await response.json();
    if (typeof version !== "string")
      throw new Error("no version in version.json");
    if (compareVersions(version, current) > 0) {
      log(`version ${version} is available (running ${current}): ${RELEASES_URL}`);
    }
  } catch (error) {
    log(`update check skipped (${error instanceof Error ? error.message : String(error)})`);
  }
}

// sna-src/alpr/server.ts
onNet("wk:onPlateLocked" /* WraithPlateLocked */, async (_cam, rawPlate) => {
  const player = Number(globalThis.source);
  if (!(player > 0) || typeof rawPlate !== "string")
    return;
  const plate = rawPlate.trim().toUpperCase().slice(0, 16);
  if (!plate || throttled(`alpr:${plate}`, player, 3e3))
    return;
  const [vehicles, bolos] = await Promise.all([
    cadRequest({
      path: "/search/vehicle?includeMany=true",
      method: "POST",
      data: { plateOrVin: plate }
    }),
    cadRequest({
      path: `/bolos?query=${encodeURIComponent(plate)}`,
      method: "GET"
    })
  ]);
  emitNet(
    "sn:cadPlateResults" /* ALPRCadPlateResults */,
    player,
    plate,
    vehicles.ok ? vehicles.data ?? [] : "failed"
  );
  emitNet("sn:cadBoloResults" /* ALPRCadBoloResults */, player, plate, bolos.ok ? bolos.data : "failed");
});
