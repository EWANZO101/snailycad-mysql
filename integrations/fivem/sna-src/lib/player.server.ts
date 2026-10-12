import { cadRequest, playerAuth, type CadResult, type PlayerAuth } from "./cad.server";
import type { Edition } from "./config.server";

export function prependSnailyCAD(text: string) {
  return `^8^*[SnailyCAD]:^7^r ${text}`;
}

export function chat(source: number, text: string) {
  if (source > 0) emitNet("chat:addMessage", source, { args: [prependSnailyCAD(text)] });
}

/**
 * The player behind an event. A net event always uses the real sender (`source`), never an id
 * sent by the client. A local event from another server script (source "" / 0) may name a player.
 */
export function resolvePlayer(claimed?: unknown): number | null {
  const real = Number(globalThis.source);
  if (Number.isInteger(real) && real > 0) return real;

  const fromServer = Number(claimed);
  return Number.isInteger(fromServer) && fromServer > 0 ? fromServer : null;
}

/** true if this net event came from a client (false for server-local events) */
export function isFromClient() {
  const real = Number(globalThis.source);
  return Number.isInteger(real) && real > 0;
}

const lastUse = new Map<string, number>();
/** simple per-player cooldown for net events a client could spam */
export function throttled(key: string, source: number, ms: number) {
  const id = `${key}:${source}`;
  const now = Date.now();
  if (now - (lastUse.get(id) ?? 0) < ms) return true;
  lastUse.set(id, now);
  return false;
}

on("playerDropped", () => {
  const src = Number(globalThis.source);
  for (const key of lastUse.keys()) {
    if (key.endsWith(`:${src}`)) lastUse.delete(key);
  }
});

export interface CadUnit {
  id: string;
  status?: { id?: string; shouldDo?: string; value?: { value?: string } } | null;
  citizen?: { name: string; surname: string } | null;
  divisions?: unknown[];
  deputies?: unknown;
  officers?: unknown;
  callsign?: string | null;
}

export interface CadUser {
  id: string;
  username: string;
  unit?: CadUnit | null;
}

/** a chat message explaining why the CAD refused a player's request */
export function explainPlayerError(result: CadResult<unknown>): string {
  return explainForEdition(result.edition, result.status, result.errorMessage);
}

function explainForEdition(edition: Edition, status: number, message?: string) {
  if (edition === "original") {
    if (status === 401 || status === 400 || message === "notAuthenticated") {
      return "Please make sure you're authenticated. Use: ^5/sn-auth^7.";
    }
  } else {
    if (message === "noIdentifiers") {
      return "This server signs you in to SnailyCAD with your Discord or Steam account, but FiveM didn't give either. Open Discord or Steam before starting FiveM.";
    }
    if (message === "playerNotLinked") {
      return "Your game account isn't linked to a SnailyCAD account. In the CAD, link Discord or Steam under ^5Account > Connections^7, then try again.";
    }
    if (status === 401 || status === 403) {
      return `SnailyCAD refused the request (${message ?? status}). Ask staff to check your CAD account.`;
    }
  }
  if (status === 0) return "SnailyCAD can't be reached right now. Please try again later.";
  return `SnailyCAD returned an error: ${message ?? `HTTP ${status}`}.`;
}

/**
 * The CAD user (and active unit) of a player, or null after telling the player why not.
 * Pass an auth captured earlier when the player may have left (playerDropped).
 */
export async function getPlayerUser(
  source: number,
  options: { requireUnit?: boolean; auth?: PlayerAuth; silent?: boolean } = {},
): Promise<{ user: CadUser; auth: PlayerAuth } | null> {
  const auth = options.auth ?? playerAuth(source);
  const result = await cadRequest<CadUser>({
    method: "POST",
    path: "/user?includeActiveUnit=true",
    auth,
    quiet: true,
  });

  if (!result.ok || !result.data?.id) {
    if (!options.silent) {
      chat(source, result.ok ? explainForEdition(result.edition, 401) : explainPlayerError(result));
    }
    return null;
  }

  if (options.requireUnit && !result.data.unit) {
    if (!options.silent) {
      chat(source, "No active unit found. Go on-duty first in the SnailyCAD web interface.");
    }
    return null;
  }

  return { user: result.data, auth };
}

export function isOnDuty(user: CadUser | null | undefined) {
  return Boolean(user?.unit && user.unit.status?.shouldDo !== "SET_OFF_DUTY");
}

export function getUnitName(unit: CadUnit) {
  if ("deputies" in unit || "officers" in unit) return unit.callsign ?? "";
  return unit.citizen ? `${unit.citizen.name} ${unit.citizen.surname}` : "";
}
