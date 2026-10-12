import { prisma } from "lib/data/prisma";

/**
 * What happens to a synced vehicle that is gone from a character's garage in game (sold to the
 * dealer, deleted, ...): CAD Settings > FiveM framework > "Vehicles gone from the game".
 * - delete: removed from the CAD (when records still point at it, it's unlinked instead)
 * - unlink: kept without an owner, so its history (records, impounds) stays; if the plate shows up
 *   in a garage again it moves to that character
 * - keep: stays with its owner (the old behaviour)
 */
export const REMOVED_VEHICLES_MODES = ["delete", "unlink", "keep"] as const;
export type RemovedVehiclesMode = (typeof REMOVED_VEHICLES_MODES)[number];

/** FivemVehicle.characterId of an unlinked vehicle: no character has this id */
export const NO_CHARACTER = "-removed-";

export function toRemovedVehiclesMode(value: unknown): RemovedVehiclesMode {
  return REMOVED_VEHICLES_MODES.includes(value as RemovedVehiclesMode)
    ? (value as RemovedVehiclesMode)
    : "delete";
}

export interface RemovedVehiclesResult {
  deleted: string[];
  unlinked: string[];
}

/**
 * Removes (or unlinks) the vehicles synced for this character whose plate is no longer in its
 * garage. `presentPlates` must be every plate the character owns in game, including vehicles the
 * sync skips (job vehicles, unknown models): only plates missing from it count as gone. Vehicles
 * that only the CAD knows (registered by hand) are never touched.
 */
export async function removeGoneFivemVehicles(options: {
  framework: string;
  characterId: string;
  presentPlates: string[];
  mode: RemovedVehiclesMode;
}): Promise<RemovedVehiclesResult> {
  const result: RemovedVehiclesResult = { deleted: [], unlinked: [] };
  if (options.mode === "keep") return result;

  const present = new Set(options.presentPlates.map((plate) => plate.trim().toUpperCase()));
  const synced = await prisma.fivemVehicle.findMany({
    where: { framework: options.framework, characterId: options.characterId },
    select: { id: true, vehicle: { select: { id: true, plate: true } } },
  });

  for (const link of synced) {
    const plate = link.vehicle.plate;
    if (present.has(plate.trim().toUpperCase())) continue;

    if (options.mode === "delete") {
      try {
        await prisma.registeredVehicle.delete({ where: { id: link.vehicle.id } });
        result.deleted.push(plate);
        continue;
      } catch {
        // something still references it: keep it, without an owner
      }
    }

    await prisma.$transaction([
      prisma.registeredVehicle.update({
        where: { id: link.vehicle.id },
        data: { citizenId: null, userId: null },
      }),
      prisma.fivemVehicle.update({
        where: { id: link.id },
        data: { characterId: NO_CHARACTER, lastSyncedAt: new Date() },
      }),
    ]);
    result.unlinked.push(plate);
  }

  return result;
}
