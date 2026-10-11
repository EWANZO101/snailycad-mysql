import { randomBytes } from "node:crypto";
import type { OpsPhoneSettings } from "@prisma/client";
import { z } from "zod";
import { prisma } from "~/lib/data/prisma";

/** where an ops-phone service request ends up in the CAD */
export const OPS_PHONE_TARGETS = [
  "CALL_911_LEO",
  "CALL_911_EMS_FD",
  "TOW",
  "TAXI",
  "IGNORE",
] as const;
export type OpsPhoneTarget = (typeof OPS_PHONE_TARGETS)[number];

export const OPS_PHONE_SERVICE_ENTRY = z.object({
  target: z.enum(OPS_PHONE_TARGETS),
  /** the phone number the service uses in ops-phone (911, 912...). SMS replies come from it. */
  number: z.string().trim().max(32).default(""),
});
export type OpsPhoneServiceEntry = z.infer<typeof OPS_PHONE_SERVICE_ENTRY>;

export const OPS_PHONE_SERVICE_MAP = z.record(
  z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[\w-]+$/),
  OPS_PHONE_SERVICE_ENTRY,
);
export type OpsPhoneServiceMap = z.infer<typeof OPS_PHONE_SERVICE_MAP>;

/** the services ops-phone ships with (Config.Services in config.lua) */
export const DEFAULT_OPS_PHONE_SERVICE_MAP: OpsPhoneServiceMap = {
  police: { target: "CALL_911_LEO", number: "911" },
  ambulance: { target: "CALL_911_EMS_FD", number: "912" },
  mechanic: { target: "TOW", number: "913" },
  taxi: { target: "TAXI", number: "914" },
};

export function generateOpsPhoneSecret() {
  return randomBytes(32).toString("hex");
}

export async function getOpsPhoneSettings() {
  const existing = await prisma.opsPhoneSettings.findFirst();
  return (
    existing ??
    prisma.opsPhoneSettings.create({ data: { webhookSecret: generateOpsPhoneSecret() } })
  );
}

/** the stored map merged over the defaults; broken JSON falls back to the defaults */
export function getServiceMap(settings: Pick<OpsPhoneSettings, "serviceMap">): OpsPhoneServiceMap {
  const parsed = OPS_PHONE_SERVICE_MAP.safeParse(settings.serviceMap ?? {});
  return { ...DEFAULT_OPS_PHONE_SERVICE_MAP, ...(parsed.success ? parsed.data : {}) };
}

/** what the admin UI gets: never the API key itself, only whether it's set */
export function toPublicOpsPhoneSettings(settings: OpsPhoneSettings) {
  const { apiKey, serviceMap: _serviceMap, ...rest } = settings;
  return {
    ...rest,
    apiKeySet: !!apiKey,
    serviceMap: getServiceMap(settings),
  };
}
