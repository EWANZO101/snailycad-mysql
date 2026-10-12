/**
 * On start: log the edition in use, check the CAD answers, and look for a newer version of the
 * sna-* resources in the snailycad-mysql repo (one console line if that fails).
 */
import { cadRequest } from "./cad.server";
import { describeEdition, getConnection, getEdition, log, warn } from "./config.server";

const VERSION_URL =
  "https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/integrations/fivem/sna-src/version.json";
const RELEASES_URL = "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem";

on("onResourceStart", (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  void startupChecks();
});

async function startupChecks() {
  log(`SnailyCAD edition: ${await describeEdition()}`);
  await verifyCad();
  await checkForUpdate();
}

async function verifyCad() {
  const { url } = getConnection(await getEdition());
  if (!url) return; // cadRequest already explained what is missing

  const { ok, data } = await cadRequest<string>({
    path: "/",
    method: "GET",
    responseType: "text",
  });

  if (!ok || typeof data !== "string" || !data.includes("200 Success")) {
    warn(`Failed to verify SnailyCAD at ${url}. Check that:
  - snailycad_url is the CAD API address ending in /v1
  - snailycad_api_key is the CAD API token (CAD Settings > API Token, turned on)
  - this server can reach the CAD API`);
  }
}

function compareVersions(a: string, b: string) {
  const pa = a.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function checkForUpdate() {
  if (GetConvar("snailycad_version_check", "true") === "false") return;
  const current = GetResourceMetadata(GetCurrentResourceName(), "version", 0) || "0.0.0";

  try {
    const response = await fetch(VERSION_URL, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const { version } = (await response.json()) as { version?: string };
    if (typeof version !== "string") throw new Error("no version in version.json");

    if (compareVersions(version, current) > 0) {
      log(`version ${version} is available (running ${current}): ${RELEASES_URL}`);
    }
  } catch (error) {
    log(`update check skipped (${error instanceof Error ? error.message : String(error)})`);
  }
}
