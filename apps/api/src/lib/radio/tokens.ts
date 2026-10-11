import { createHash } from "node:crypto";
import process from "node:process";
import jwt from "jsonwebtoken";
import type { RadioIdentityKind } from "@snailycad/radio";
import type { LiveKitConfig } from "./config";

const AUDIENCE = "snaily-radio";
export const RADIO_TOKEN_TTL_SECONDS = 12 * 60 * 60;

/**
 * What a radio token carries. Short claim names, and a key derived from JWT_SECRET instead of
 * JWT_SECRET itself, so a radio token can never be used as a CAD session cookie.
 */
export interface RadioTokenClaims {
  /** radio identity id */
  sub: string;
  /** display name */
  nm: string;
  kind: RadioIdentityKind;
  /** linked CAD user */
  uid?: string;
  /** department ids granted by the game server / integration */
  dep?: string[];
  /** may listen to nearby radios (positional audio in games) */
  prox?: boolean;
  /** no radio of their own: can only overhear nearby radios (prox), never join as a member */
  lo?: boolean;
}

function radioKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return createHash("sha256").update(`${secret}:snailycad-radio`).digest();
}

export function signRadioToken(claims: RadioTokenClaims) {
  return jwt.sign(claims, radioKey(), {
    algorithm: "HS256",
    audience: AUDIENCE,
    expiresIn: RADIO_TOKEN_TTL_SECONDS,
  });
}

export function verifyRadioToken(token: string): RadioTokenClaims | null {
  try {
    const payload = jwt.verify(token, radioKey(), {
      algorithms: ["HS256"],
      audience: AUDIENCE,
    }) as jwt.JwtPayload & Partial<RadioTokenClaims>;
    if (typeof payload.sub !== "string" || typeof payload.nm !== "string" || !payload.kind) {
      return null;
    }
    return {
      sub: payload.sub,
      nm: payload.nm,
      kind: payload.kind,
      uid: payload.uid,
      dep: Array.isArray(payload.dep) ? payload.dep : undefined,
      prox: payload.prox === true,
      lo: payload.lo === true,
    };
  } catch {
    return null;
  }
}

interface LiveKitGrantOptions {
  identity: string;
  name: string;
  room: string;
  canPublish: boolean;
}

/** a LiveKit access token (https://docs.livekit.io/home/get-started/authentication/) */
export function signLiveKitToken(config: LiveKitConfig, options: LiveKitGrantOptions) {
  return jwt.sign(
    {
      name: options.name,
      video: {
        room: options.room,
        roomJoin: true,
        canPublish: options.canPublish,
        canSubscribe: true,
        canPublishData: false,
        canPublishSources: options.canPublish ? ["microphone"] : [],
      },
    },
    config.apiSecret,
    {
      algorithm: "HS256",
      issuer: config.apiKey,
      subject: options.identity,
      jwtid: options.identity,
      notBefore: 0,
      expiresIn: RADIO_TOKEN_TTL_SECONDS,
    },
  );
}
