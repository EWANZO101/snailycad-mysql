/**
 * Where the CAD is, with which token, and which SnailyCAD edition it runs.
 *
 *   snailycad_url / snailycad_api_key                    every edition
 *   snailycad_framework_api_url / _api_token             fallback, snailycad-mysql edition only
 *   snailycad_edition "auto" | "original" | "snailycad-mysql"
 *   <resource>_edition (e.g. sna_sync_edition)           overrides snailycad_edition per resource
 *
 * Convars are read live, so a `set` in the console applies without a restart.
 */

export type Edition = "original" | "snailycad-mysql";
type EditionSetting = Edition | "auto";

const RESOURCE = GetCurrentResourceName();

export function log(message: string) {
  console.log(`[${RESOURCE}] ${message}`);
}

export function warn(message: string) {
  console.warn(`[${RESOURCE}] ${message}`);
}

function convar(name: string) {
  const value = GetConvar(name, "").trim();
  return value === "null" ? "" : value;
}

/** "https://cad-api.example.com/" -> "https://cad-api.example.com/v1" */
export function normaliseUrl(raw: string) {
  const url = raw.trim().replace(/\/+$/, "");
  if (!url) return "";
  return url.endsWith("/v1") ? url : `${url}/v1`;
}

export function getConnection(edition: Edition) {
  let url = normaliseUrl(convar("snailycad_url"));
  let token = convar("snailycad_api_key");

  if (edition === "snailycad-mysql") {
    url ||= normaliseUrl(convar("snailycad_framework_api_url"));
    token ||= convar("snailycad_framework_api_token");
  }

  return { url, token };
}

function parseEdition(value: string): EditionSetting | null {
  const v = value.toLowerCase();
  if (v === "auto" || v === "original") return v;
  if (v === "snailycad-mysql" || v === "mysql") return "snailycad-mysql";
  return null;
}

export function getEditionSetting(): EditionSetting {
  const resourceKey = RESOURCE.replace(/[^\w]/g, "_");
  for (const name of [`${resourceKey}_edition`, `${RESOURCE}_edition`, "snailycad_edition"]) {
    const value = convar(name);
    if (!value) continue;

    const parsed = parseEdition(value);
    if (parsed) return parsed;
    warn(`ignoring ${name} "${value}": use auto, original or snailycad-mysql`);
  }
  return "auto";
}

let detected: Edition | null = null;
let detecting: Promise<Edition> | null = null;
let lastFailedAt = 0;
const RETRY_AFTER_MS = 60_000;

/**
 * "auto": POST {url}/integrations/fivem/check with the CAD API token. 200 => snailycad-mysql,
 * 404 => original. Anything else (wrong token, CAD down) => original for now, retried after a minute.
 */
async function detectEdition(): Promise<Edition> {
  const { url, token } = getConnection("snailycad-mysql");
  if (!url) return "original";
  if (Date.now() - lastFailedAt < RETRY_AFTER_MS) return "original";

  try {
    const response = await fetch(`${url}/integrations/fivem/check`, {
      method: "POST",
      headers: { "content-type": "application/json", "snaily-cad-api-token": token },
      body: "{}",
      signal: AbortSignal.timeout(10_000),
    });
    await response.body?.cancel().catch(() => null);

    if (response.status === 200) return (detected = "snailycad-mysql");
    if (response.status === 404) return (detected = "original");

    lastFailedAt = Date.now();
    warn(
      `could not detect the SnailyCAD edition (HTTP ${response.status}${
        response.status === 401 ? ": check snailycad_api_key" : ""
      }); using "original" for now. Set snailycad_edition to skip detection.`,
    );
  } catch (error) {
    lastFailedAt = Date.now();
    warn(
      `could not detect the SnailyCAD edition (${
        error instanceof Error ? error.message : String(error)
      }); using "original" for now.`,
    );
  }
  return "original";
}

export async function getEdition(): Promise<Edition> {
  const setting = getEditionSetting();
  if (setting !== "auto") return setting;
  if (detected) return detected;

  detecting ??= detectEdition().finally(() => {
    detecting = null;
  });
  return detecting;
}

/** for the startup log: "snailycad-mysql (auto-detected)" */
export async function describeEdition() {
  const setting = getEditionSetting();
  const edition = await getEdition();
  if (setting !== "auto") return `${edition} (set by convar)`;
  return detected ? `${edition} (auto-detected)` : `${edition} (detection failed, will retry)`;
}
