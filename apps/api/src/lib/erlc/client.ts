import type { ErlcSettings } from "@prisma/client";
import { z } from "zod";

/** ER:LC private server API v2 (https://apidocs.erlc.gg) */
// ERLC_API_URL is only for testing against a fake server
export const ERLC_API_URL = (process.env.ERLC_API_URL || "https://api.erlc.gg").replace(/\/+$/, "");
const DEFAULT_TIMEOUT_MS = 10_000;

/** "Username:123456" -> { name, id } (the API sends players as one string) */
export function parsePlayer(value: string | null | undefined) {
  if (!value) return null;
  const index = value.lastIndexOf(":");
  if (index === -1) return { name: value, id: null };
  return { name: value.slice(0, index), id: value.slice(index + 1) || null };
}

// lenient on purpose: a field ER:LC adds or drops shouldn't take the whole integration down
const LOCATION = z
  .object({
    LocationX: z.number().nullish(),
    LocationZ: z.number().nullish(),
    PostalCode: z.coerce.string().nullish(),
    StreetName: z.string().nullish(),
    BuildingNumber: z.coerce.string().nullish(),
  })
  .passthrough();

const PLAYER = z
  .object({
    Player: z.string(),
    Team: z.string().nullish(),
    Callsign: z.string().nullish(),
    Permission: z.string().nullish(),
    WantedStars: z.number().nullish(),
    Location: LOCATION.nullish(),
  })
  .passthrough();

const EMERGENCY_CALL = z
  .object({
    Team: z.string().nullish(),
    Caller: z.coerce.string().nullish(),
    Players: z.array(z.coerce.string()).nullish(),
    Position: z.array(z.number()).nullish(),
    StartedAt: z.number(),
    CallNumber: z.number(),
    Description: z.string().nullish(),
    PositionDescriptor: z.string().nullish(),
  })
  .passthrough();

const VEHICLE = z
  .object({
    Name: z.string().nullish(),
    Owner: z.string().nullish(),
    Plate: z.string().nullish(),
    Texture: z.string().nullish(),
    ColorHex: z.string().nullish(),
    ColorName: z.string().nullish(),
  })
  .passthrough();

export const ERLC_SERVER = z
  .object({
    Name: z.string(),
    OwnerId: z.number().nullish(),
    CurrentPlayers: z.number().nullish(),
    MaxPlayers: z.number().nullish(),
    JoinKey: z.string().nullish(),
    AccVerifiedReq: z.string().nullish(),
    TeamBalance: z.boolean().nullish(),
    Players: z.array(PLAYER).nullish(),
    Queue: z.array(z.number()).nullish(),
    EmergencyCalls: z.array(EMERGENCY_CALL).nullish(),
    Vehicles: z.array(VEHICLE).nullish(),
  })
  .passthrough();

export type ErlcServer = z.infer<typeof ERLC_SERVER>;
export type ErlcPlayer = z.infer<typeof PLAYER>;
export type ErlcEmergencyCallData = z.infer<typeof EMERGENCY_CALL>;

export interface ErlcResponse {
  status: number;
  json: unknown;
  /** ER:LC's error code (`code` in the body), e.g. 2002 invalid key, 3002 server offline */
  code: number | null;
  message: string | null;
  /** epoch ms before which no request may be sent (429 Retry-After or an empty bucket) */
  retryAt: number | null;
  bucket: string | null;
}

function retryAtFrom(response: Response, json: unknown) {
  const now = Date.now();
  if (response.status === 429) {
    const header = Number(response.headers.get("retry-after"));
    const body = Number((json as { retry_after?: unknown } | null)?.retry_after);
    const seconds = Number.isFinite(header) && header > 0 ? header : body;
    // no usable value: back off a full minute rather than hammering
    return now + (Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 60_000);
  }

  // out of requests in this window: wait for the reset instead of earning a 429
  const remaining = Number(response.headers.get("x-ratelimit-remaining"));
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  if (response.headers.has("x-ratelimit-remaining") && remaining <= 0 && reset > 0) {
    // the header is in epoch seconds
    return Math.max(now, reset * 1000);
  }
  return null;
}

/**
 * calls the ER:LC API with the server key (and the public app key when set).
 * throws on network errors and timeouts; HTTP errors are returned as `status`.
 */
export async function callErlc(
  settings: Pick<ErlcSettings, "serverKey" | "apiKey">,
  options: { method: "GET" | "POST"; path: string; body?: unknown; timeoutMs?: number },
): Promise<ErlcResponse> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "server-key": settings.serverKey ?? "",
  };
  // only for registered public applications; a CAD for one server sends none
  if (settings.apiKey) headers.Authorization = settings.apiKey;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(`${ERLC_API_URL}${options.path}`, {
    method: options.method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS),
  });

  const text = await response.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = text;
  }

  const body = (typeof json === "object" && json ? json : {}) as {
    code?: unknown;
    message?: unknown;
    error?: unknown;
  };
  const code = Number(body.code);
  const message = body.message ?? body.error;

  return {
    status: response.status,
    json,
    code: Number.isFinite(code) && body.code !== undefined ? code : null,
    message: typeof message === "string" ? message.slice(0, 300) : null,
    retryAt: retryAtFrom(response, json),
    bucket: response.headers.get("x-ratelimit-bucket"),
  };
}

export const SERVER_QUERY = "?Players=true&Queue=true&EmergencyCalls=true&Vehicles=true";

/** codes that mean the key is wrong, expired or banned (stop using it) */
export function isKeyRejected(response: Pick<ErlcResponse, "status" | "code">) {
  if (response.code !== null && [2000, 2001, 2002, 2004].includes(response.code)) return true;
  return response.status === 403 && response.code === null;
}

/** ER:LC can't answer while the private server is empty */
export function isServerOffline(response: Pick<ErlcResponse, "status" | "code">) {
  return response.code === 3002 || response.status === 422;
}
