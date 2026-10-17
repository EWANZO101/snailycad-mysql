import { createPublicKey, verify, type KeyObject } from "node:crypto";

/**
 * ER:LC's Ed25519 public key for event webhooks (base64 SPKI), from
 * https://apidocs.erlc.gg/event-webhooks. ERLC_WEBHOOK_PUBLIC_KEY overrides it if PRC rotates it.
 */
const ERLC_WEBHOOK_PUBLIC_KEY = "MCowBQYDK2VwAyEAjSICb9pp0kHizGQtdG8ySWsDChfGqi+gyFCttigBNOA=";

/** timestamps further than this from now are refused (replayed requests) */
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

let publicKey: KeyObject | null = null;

function getPublicKey() {
  publicKey ??= createPublicKey({
    key: Buffer.from(process.env.ERLC_WEBHOOK_PUBLIC_KEY || ERLC_WEBHOOK_PUBLIC_KEY, "base64"),
    format: "der",
    type: "spki",
  });
  return publicKey;
}

/** checks `X-Signature-Ed25519` (hex) over `timestamp + raw body`, as ER:LC signs it */
export function verifyErlcSignature(options: {
  timestamp: string | undefined;
  signatureHex: string | undefined;
  rawBody: Buffer | undefined;
  /** for tests */
  key?: KeyObject;
  now?: number;
}) {
  const { timestamp, signatureHex, rawBody } = options;
  if (!timestamp || !signatureHex || !rawBody) return false;
  if (!/^\d{1,13}$/.test(timestamp) || !/^[0-9a-f]{128}$/i.test(signatureHex)) return false;

  // the header is in seconds; accept milliseconds too
  const seconds = timestamp.length > 11 ? Number(timestamp) / 1000 : Number(timestamp);
  const nowSeconds = (options.now ?? Date.now()) / 1000;
  if (Math.abs(nowSeconds - seconds) > MAX_CLOCK_SKEW_SECONDS) return false;

  try {
    const message = Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]);
    return verify(null, message, options.key ?? getPublicKey(), Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}
