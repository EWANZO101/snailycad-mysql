/**
 * Requests to the SnailyCAD API. Tokens stay on the server.
 *
 * auth "api"    the CAD API token (snaily-cad-api-token)
 * auth "player" a player acting in the CAD:
 *                 original edition        their personal API token (snaily-cad-user-api-token)
 *                 snailycad-mysql edition the CAD API token + snaily-cad-player: discord:..,steam:..
 * auth "none"   no token (e.g. validating a personal API token)
 */
import { getConnection, getEdition, warn, type Edition } from "./config.server";

export interface PlayerAuth {
  type: "player";
  source: number;
  /** read when the action started: a dropped player's identifiers are gone later */
  userApiToken: string | null;
  playerHeader: string | null;
}

export type CadAuth = { type: "api" } | { type: "none" } | PlayerAuth;

export interface CadRequestOptions {
  path: string;
  method: "GET" | "POST" | "PUT";
  data?: unknown;
  auth?: CadAuth;
  /** 0.14.3 sent is-from-dispatch: true unless told otherwise; never sent with a player header */
  isFromDispatch?: boolean;
  responseType?: "json" | "text";
  /** don't log 4xx answers (the caller explains them to the player); 5xx is always logged */
  quiet?: boolean;
}

export interface CadResult<T> {
  ok: boolean;
  /** HTTP status, 0 when the CAD could not be reached or isn't set up */
  status: number;
  data: T | null;
  /** the CAD's error message ("playerNotLinked", "invalidToken", ...) or a description */
  errorMessage?: string;
  edition: Edition;
}

function identifierList(source: number) {
  try {
    return getPlayerIdentifiers(source) ?? [];
  } catch {
    return [];
  }
}

/** "license:..." of a player (the key of the personal token in the original edition) */
export function getLicense(source: number) {
  return identifierList(source).find((id) => id.startsWith("license:")) ?? null;
}

export function tokenKvpKey(license: string) {
  return `snailycad:${license}:token`;
}

/** "discord:123,steam:110000100000000" or null without either */
export function buildPlayerHeader(source: number) {
  const parts: string[] = [];
  for (const identifier of identifierList(source)) {
    if (identifier.startsWith("discord:") || identifier.startsWith("steam:")) {
      parts.push(identifier);
    }
  }
  return parts.length ? parts.join(",") : null;
}

export function playerAuth(source: number): PlayerAuth {
  const license = getLicense(source);
  return {
    type: "player",
    source,
    userApiToken: license ? GetResourceKvpString(tokenKvpKey(license)) || null : null,
    playerHeader: buildPlayerHeader(source),
  };
}

const loggedOnce = new Set<string>();
function warnOnce(key: string, message: string) {
  if (loggedOnce.has(key)) return;
  loggedOnce.add(key);
  warn(message);
}

export async function cadRequest<T>(options: CadRequestOptions): Promise<CadResult<T>> {
  const edition = await getEdition();
  const { url, token } = getConnection(edition);
  const auth = options.auth ?? { type: "api" };
  const fail = (status: number, errorMessage: string): CadResult<T> => ({
    ok: false,
    status,
    data: null,
    errorMessage,
    edition,
  });

  if (!url) {
    warnOnce(
      "url",
      edition === "snailycad-mysql"
        ? "no CAD address: set snailycad_url (or snailycad_framework_api_url) in server.cfg, e.g. set snailycad_url https://cad-api.example.com/v1"
        : "no CAD address: set snailycad_url in server.cfg, e.g. set snailycad_url https://cad-api.example.com/v1",
    );
    return fail(0, "notConfigured");
  }

  const headers: Record<string, string> = {};
  if (options.data !== undefined && options.method !== "GET") {
    headers["content-type"] = "application/json";
  }

  let isFromDispatch = options.isFromDispatch ?? true;

  if (auth.type === "api" || (auth.type === "player" && edition === "snailycad-mysql")) {
    if (!token) {
      warnOnce("token", "no CAD API token: set snailycad_api_key in server.cfg");
      return fail(0, "notConfigured");
    }
    headers["snaily-cad-api-token"] = token;
  }

  if (auth.type === "player") {
    if (edition === "snailycad-mysql") {
      if (!auth.playerHeader) return fail(401, "noIdentifiers");
      headers["snaily-cad-player"] = auth.playerHeader;
      isFromDispatch = false;
    } else {
      if (!auth.userApiToken) return fail(401, "notAuthenticated");
      headers["snaily-cad-user-api-token"] = auth.userApiToken;
    }
  }

  if (isFromDispatch && auth.type !== "none") {
    headers["is-from-dispatch"] = "true";
  }

  let response: Response;
  try {
    response = await fetch(`${url}${options.path}`, {
      method: options.method,
      headers,
      body:
        options.data !== undefined && options.method !== "GET"
          ? JSON.stringify(options.data)
          : undefined,
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error) {
    const cause: unknown = error instanceof Error ? error.cause : undefined;
    const reason =
      cause instanceof Error
        ? cause.message
        : error instanceof Error
          ? error.message
          : String(error);
    warn(`could not reach SnailyCAD at ${url} (${options.method} ${options.path}): ${reason}`);
    return fail(0, "unreachable");
  }

  const text = await response.text().catch(() => "");
  let body: unknown = text;
  if ((options.responseType ?? "json") === "json" || !response.ok) {
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = options.responseType === "text" ? text : null;
    }
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body && typeof body.message === "string"
        ? body.message
        : `HTTP ${response.status}`;

    if (!options.quiet || response.status >= 500) {
      warn(
        `SnailyCAD API ${options.method} ${options.path.split("?")[0]} failed: HTTP ${
          response.status
        } ${message}${response.status === 401 && auth.type === "api" ? " (check snailycad_api_key)" : ""}`,
      );
    }
    return fail(response.status, message);
  }

  return { ok: true, status: response.status, data: body as T, edition };
}
