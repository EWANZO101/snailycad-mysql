import type { ErlcSettings } from "@prisma/client";
import { z } from "zod";

/** what an ER:LC team's emergency calls create in the CAD */
export const ERLC_TARGETS = ["CALL_911_LEO", "CALL_911_EMS_FD", "TOW", "IGNORE"] as const;
export type ErlcTarget = (typeof ERLC_TARGETS)[number];

export const ERLC_TEAM_MAP = z.record(
  z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[\w &/-]+$/),
  z.enum(ERLC_TARGETS),
);
export type ErlcTeamMap = z.infer<typeof ERLC_TEAM_MAP>;

/** the teams ER:LC has today; a team that isn't in the map creates a LEO 911 call */
export const DEFAULT_ERLC_TEAM_MAP: ErlcTeamMap = {
  Police: "CALL_911_LEO",
  Sheriff: "CALL_911_LEO",
  Fire: "CALL_911_EMS_FD",
  EMS: "CALL_911_EMS_FD",
  DOT: "TOW",
};

export const MIN_POLL_SECONDS = 10;
export const MAX_POLL_SECONDS = 300;
export const DEFAULT_POLL_SECONDS = 15;

/** the stored map merged over the defaults; broken JSON falls back to the defaults */
export function getTeamMap(settings: Pick<ErlcSettings, "teamMap">): ErlcTeamMap {
  const parsed = ERLC_TEAM_MAP.safeParse(settings.teamMap ?? {});
  return { ...DEFAULT_ERLC_TEAM_MAP, ...(parsed.success ? parsed.data : {}) };
}

/** case-insensitive lookup, so "police" and "Police" are the same team */
export function getTargetForTeam(settings: Pick<ErlcSettings, "teamMap">, team: string) {
  const map = getTeamMap(settings);
  const key = Object.keys(map).find((name) => name.toLowerCase() === team.trim().toLowerCase());
  return key ? map[key]! : "CALL_911_LEO";
}

export function clampPollSeconds(value: number | null | undefined) {
  if (!value || !Number.isFinite(value)) return DEFAULT_POLL_SECONDS;
  return Math.min(MAX_POLL_SECONDS, Math.max(MIN_POLL_SECONDS, Math.round(value)));
}

/** what the admin UI gets: never the keys themselves, only whether they're set */
export function toPublicErlcSettings(settings: ErlcSettings) {
  const { serverKey, apiKey, teamMap: _teamMap, ...rest } = settings;
  return {
    ...rest,
    pollSeconds: clampPollSeconds(settings.pollSeconds),
    serverKeySet: !!serverKey,
    apiKeySet: !!apiKey,
    teamMap: getTeamMap(settings),
  };
}
