import {
  type CombinedEmsFdUnit,
  type CombinedLeoUnit,
  type CombinedDotUnit,
  type EmsFdDeputy,
  type Officer,
  type DotWorker,
  ShouldDoType,
} from "@snailycad/types";
import { isUnitCombined, isUnitCombinedEmsFd, isUnitCombinedDot } from "@snailycad/utils";
import type { MapPlayer, PlayerDataEventPayload } from "types/map";

interface ActiveUnitsOptions {
  players: (MapPlayer | PlayerDataEventPayload)[];
  activeUnits: (Officer | CombinedLeoUnit | EmsFdDeputy | CombinedEmsFdUnit)[];
}

export function createMapUnitsFromActiveUnits({ players, activeUnits }: ActiveUnitsOptions) {
  const transformedActiveUnits: MapPlayer[] = [];

  for (const activeUnit of activeUnits) {
    if (!activeUnit.status || activeUnit.status.shouldDo === ShouldDoType.SET_OFF_DUTY) continue;

    if (isUnitCombined(activeUnit) || isUnitCombinedEmsFd(activeUnit)) {
      const player = players.find((player) => findPlayerFromCombinedUnit(player, activeUnit));

      if (!player || !("steamId" in player) || !("discordId" in player)) continue;

      const existing = transformedActiveUnits.some((player) =>
        findPlayerFromCombinedUnit(player, activeUnit),
      );

      if (!existing) {
        transformedActiveUnits.push({ ...player, unit: activeUnit });
      }

      continue;
    }

    if (!activeUnit.user) continue;

    const player = players.find((player) => findPlayerFromSingleUnit(player, activeUnit));
    if (!player || !("steamId" in player) || !("discordId" in player)) continue;

    const existing = transformedActiveUnits.some((player) =>
      findPlayerFromSingleUnit(player, activeUnit),
    );
    if (!existing) {
      transformedActiveUnits.push({ ...player, unit: activeUnit });
    }
  }

  return transformedActiveUnits;
}

export function findPlayerFromUnit(
  player: MapPlayer | PlayerDataEventPayload,
  activeUnit: Officer | CombinedLeoUnit | EmsFdDeputy | CombinedEmsFdUnit | DotWorker | CombinedDotUnit,
) {
  if (isUnitCombined(activeUnit) || isUnitCombinedEmsFd(activeUnit) || isUnitCombinedDot(activeUnit)) {
    return findPlayerFromCombinedUnit(player, activeUnit);
  }

  return findPlayerFromSingleUnit(player, activeUnit);
}

export function findPlayerFromSingleUnit(
  player: MapPlayer | PlayerDataEventPayload,
  activeUnit: Officer | EmsFdDeputy | DotWorker,
) {
  return (
    activeUnit.user?.discordId === player.discordId ||
    activeUnit.user?.steamId === player.convertedSteamId
  );
}

export function findPlayerFromCombinedUnit(
  player: MapPlayer | PlayerDataEventPayload,
  activeUnit: CombinedLeoUnit | CombinedEmsFdUnit | CombinedDotUnit,
) {
  const steamIds = isUnitCombinedDot(activeUnit)
    ? activeUnit.workers.map((worker) => worker.user?.steamId)
    : isUnitCombinedEmsFd(activeUnit)
      ? activeUnit.deputies.map((deputy) => deputy.user?.steamId)
      : activeUnit.officers.map((officer) => officer.user?.steamId);

  const discordIds = isUnitCombinedDot(activeUnit)
    ? activeUnit.workers.map((worker) => worker.user?.discordId)
    : isUnitCombinedEmsFd(activeUnit)
      ? activeUnit.deputies.map((deputy) => deputy.user?.discordId)
      : activeUnit.officers.map((officer) => officer.user?.discordId);

  const filteredSteamIds = steamIds.filter(Boolean) as string[];
  const filteredDiscordIds = discordIds.filter(Boolean) as string[];

  return (
    (player.convertedSteamId && filteredSteamIds.includes(player.convertedSteamId)) ||
    (player.discordId && filteredDiscordIds.includes(player.discordId))
  );
}
