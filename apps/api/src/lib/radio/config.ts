import process from "node:process";
import { RADIO_WS_PATH } from "@snailycad/radio";
import { getAPIUrl } from "@snailycad/utils/api-url";

export interface LiveKitConfig {
  url: string;
  apiKey: string;
  apiSecret: string;
}

/** LiveKit credentials come only from the environment, never from the database */
export function getLiveKitConfig(): LiveKitConfig | null {
  const url = process.env.RADIO_LIVEKIT_URL?.trim();
  const apiKey = process.env.RADIO_LIVEKIT_API_KEY?.trim();
  const apiSecret = process.env.RADIO_LIVEKIT_API_SECRET?.trim();
  if (!url || !apiKey || !apiSecret) return null;
  return { url, apiKey, apiSecret };
}

/**
 * The radio WebSocket URL clients connect to. RADIO_WS_URL overrides it (e.g. behind a proxy);
 * otherwise it is derived from the public API URL (NEXT_PUBLIC_PROD_ORIGIN).
 */
export function getRadioWsUrl() {
  const override = process.env.RADIO_WS_URL?.trim();
  if (override) return override;

  const apiUrl = new URL(getAPIUrl());
  const protocol = apiUrl.protocol === "https:" ? "wss:" : "ws:";
  // keep a proxy path prefix, e.g. https://example.com/cad-api/v1 -> wss://example.com/cad-api/v1/radio/ws
  const path = apiUrl.pathname.replace(/\/+$/, "");
  return `${protocol}//${apiUrl.host}${path}${RADIO_WS_PATH.replace(/^\/v1/, "")}`;
}
