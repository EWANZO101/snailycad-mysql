import { timingSafeEqual } from "node:crypto";
import { Forbidden, Unauthorized } from "@tsed/exceptions";
import { AUDIO_FRAME_MS, AUDIO_SAMPLE_RATE, type RadioTokenResponse } from "@snailycad/radio";
import { prisma } from "lib/data/prisma";
import { resolveRadioAccess } from "./access";
import { getLiveKitConfig, getRadioWsUrl } from "./config";
import { radioServer } from "./radio-server";
import { type RadioTokenClaims, signRadioToken } from "./tokens";

export async function createRadioTokenResponse(
  claims: RadioTokenClaims,
): Promise<RadioTokenResponse> {
  const access = await resolveRadioAccess(claims);
  if (!access) throw new Forbidden("radioUserNotFound");

  const transport = await radioServer.transport();
  return {
    token: signRadioToken(claims),
    wsUrl: getRadioWsUrl(),
    transport,
    livekitUrl: transport === "livekit" ? (getLiveKitConfig()?.url ?? null) : null,
    identity: access.identity,
    channels: access.visible,
    audio: { codec: "mulaw", sampleRate: AUDIO_SAMPLE_RATE, frameMs: AUDIO_FRAME_MS },
  };
}

/** checks the CAD-wide API token (Admin > Manage > CAD Settings > API Token) */
export async function assertCADApiToken(header: string | string[] | undefined) {
  const value = Array.isArray(header) ? header[0] : header;
  const cad = await prisma.cad.findFirst({ select: { apiToken: true } });
  const expected = cad?.apiToken?.enabled ? cad.apiToken.token : null;
  if (!value || !expected) throw new Unauthorized("Unauthorized");

  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Unauthorized("Unauthorized");
}
