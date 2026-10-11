import type { OpsPhoneSettings } from "@prisma/client";

const DEFAULT_TIMEOUT_MS = 5000;

export interface OpsPhoneResponse {
  status: number;
  json: unknown;
}

/** `http://host:30120/opslabs-phone/api/v1/` + `health` -> full URL. `null` when no URL is set. */
export function buildOpsPhoneUrl(apiUrl: string | null | undefined, path: string) {
  if (!apiUrl?.trim()) return null;
  const base = apiUrl.trim().replace(/\/+$/, "");
  return `${base}/${path.replace(/^\/+/, "")}`;
}

/**
 * calls the ops-phone REST API (served by the FiveM server) with the API key.
 * throws on network errors and timeouts; HTTP errors are returned as `status`.
 */
export async function callOpsPhone(
  settings: Pick<OpsPhoneSettings, "apiUrl" | "apiKey">,
  options: { method: "GET" | "POST" | "PATCH"; path: string; body?: unknown; timeoutMs?: number },
): Promise<OpsPhoneResponse> {
  const url = buildOpsPhoneUrl(settings.apiUrl, options.path);
  if (!url) throw new Error("ops-phone API URL is not set");

  const response = await fetch(url, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": settings.apiKey ?? "",
    },
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

  return { status: response.status, json };
}
