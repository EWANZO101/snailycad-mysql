import { Feature, ValueLicenseType, ValueType, WhitelistStatus } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "lib/data/prisma";
import { insensitive } from "lib/data/db-provider";
import { isFeatureEnabled } from "lib/upsert-cad";
import { generateString } from "utils/generate-string";
import type { CadWithFeatures } from "./cad";
import type { FIVEM_VEHICLE_SCHEMA } from "./schemas";

type GameVehicle = z.infer<typeof FIVEM_VEHICLE_SCHEMA>;

export interface VehicleSyncResult {
  created: string[];
  updated: string[];
  unchanged: string[];
  skipped: { plate: string; reason: string }[];
}

interface Options {
  vehicles: GameVehicle[];
  framework: string;
  characterId: string;
  citizenId: string;
  userId: string | null;
  cad: CadWithFeatures;
  /** create vehicle models the CAD doesn't know yet */
  createVehicleModels: boolean;
}

const VIN_NUMBER_LENGTH = 17;

const INT32_MAX = 2_147_483_647;
const UINT32_RANGE = 4_294_967_296;

/** the game reports model hashes signed; admins may have typed either form into the CAD */
function hashForms(hash: GameVehicle["hash"]) {
  if (hash === null || hash === undefined || hash === "") return [];
  const number = Number(hash);
  if (!Number.isInteger(number)) return [String(hash)];
  const signed = number > INT32_MAX ? number - UINT32_RANGE : number;
  const unsigned = signed < 0 ? signed + UINT32_RANGE : signed;
  const hex = `0x${unsigned.toString(16).toUpperCase().padStart(8, "0")}`;
  return Array.from(new Set([String(signed), String(unsigned), hex, hex.toLowerCase()]));
}

/** the CAD vehicle model for a game vehicle: by hash, then by display name, then by spawn name */
async function findVehicleModel(vehicle: GameVehicle) {
  const hashes = hashForms(vehicle.hash);
  if (hashes.length) {
    const byHash = await prisma.vehicleValue.findFirst({
      where: { hash: { in: hashes } },
      orderBy: { value: { isDisabled: "asc" } },
      select: { id: true },
    });
    if (byHash) return byHash.id;
  }
  const names = [vehicle.label, vehicle.model].filter((name): name is string => !!name);
  for (const name of names) {
    // any case: MySQL's collation ignores it, PostgreSQL needs mode "insensitive"
    const byName = await prisma.vehicleValue.findFirst({
      where: { value: { value: { equals: name, ...insensitive() }, type: ValueType.VEHICLE } },
      orderBy: { value: { isDisabled: "asc" } },
      select: { id: true },
    });
    if (byName) return byName.id;
  }
  return null;
}

async function createVehicleModel(vehicle: GameVehicle) {
  const name = vehicle.label || vehicle.model;
  if (!name) return null;
  const [hash] = hashForms(vehicle.hash);
  const created = await prisma.vehicleValue.create({
    data: {
      hash: hash ?? null,
      value: { create: { isDefault: false, type: ValueType.VEHICLE, value: name } },
    },
    select: { id: true },
  });
  return created.id;
}

/** the registration status new vehicles get: the default one, else a "Valid" one, else any */
async function findRegistrationStatusId() {
  const where = {
    type: ValueType.LICENSE,
    isDisabled: false,
    OR: [{ licenseType: ValueLicenseType.REGISTRATION_STATUS }, { licenseType: null }],
  };
  const value =
    (await prisma.value.findFirst({
      where: { ...where, isDefault: true },
      select: { id: true },
    })) ??
    (await prisma.value.findFirst({ where: { ...where, value: "Valid" }, select: { id: true } })) ??
    (await prisma.value.findFirst({
      where,
      orderBy: [{ licenseType: "desc" }, { position: "asc" }],
      select: { id: true },
    }));
  return value?.id ?? null;
}

async function generateVinNumber(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const vinNumber = generateString(VIN_NUMBER_LENGTH);
    const existing = await prisma.registeredVehicle.findFirst({
      where: { vinNumber },
      select: { id: true },
    });
    if (!existing) return vinNumber;
  }
  throw new Error("could not generate a free VIN number");
}

/**
 * Registers a character's game vehicles in the CAD, matched by plate. Vehicles that came from the
 * game and changed owner in game move to the new owner; plates the CAD already has for someone
 * else (registered by hand) are left alone. Vehicles that are gone from the garage are kept.
 */
export async function syncFivemVehicles(options: Options): Promise<VehicleSyncResult> {
  const { cad } = options;
  const result: VehicleSyncResult = { created: [], updated: [], unchanged: [], skipped: [] };

  const isCustomTextfieldEnabled = isFeatureEnabled({
    features: cad.features,
    feature: Feature.CUSTOM_TEXTFIELD_VALUES,
    defaultReturn: false,
  });
  const isDmvEnabled = isFeatureEnabled({
    features: cad.features,
    feature: Feature.DMV,
    defaultReturn: false,
  });
  const maxPlateLength = cad.miscCadSettings.maxPlateLength ?? 8;
  let registrationStatusId: string | null | undefined;

  const seen = new Set<string>();
  for (const vehicle of options.vehicles) {
    const plate = vehicle.plate.trim().toUpperCase();
    if (!plate || seen.has(plate)) continue;
    seen.add(plate);

    try {
      const existing = await prisma.registeredVehicle.findUnique({
        where: { plate },
        include: { fivemVehicle: true },
      });

      if (existing) {
        if (existing.citizenId === options.citizenId) {
          if (!existing.fivemVehicle) {
            // registered by hand for this citizen: remember it, don't change it
            await prisma.fivemVehicle.create({
              data: {
                framework: options.framework,
                characterId: options.characterId,
                vehicleId: existing.id,
              },
            });
            result.updated.push(plate);
            continue;
          }

          const update: { color?: string; userId?: string } = {};
          if (vehicle.color && vehicle.color !== existing.color) update.color = vehicle.color;
          if (!existing.userId && options.userId) update.userId = options.userId;
          await prisma.fivemVehicle.update({
            where: { id: existing.fivemVehicle.id },
            data: { lastSyncedAt: new Date() },
          });
          if (Object.keys(update).length > 0) {
            await prisma.registeredVehicle.update({ where: { id: existing.id }, data: update });
            result.updated.push(plate);
          } else {
            result.unchanged.push(plate);
          }
          continue;
        }

        if (!existing.fivemVehicle) {
          result.skipped.push({ plate, reason: "plateAlreadyInUse" });
          continue;
        }

        // sold / given to another character in game
        await prisma.$transaction([
          prisma.registeredVehicle.update({
            where: { id: existing.id },
            data: {
              citizenId: options.citizenId,
              userId: options.userId,
              color: vehicle.color || undefined,
            },
          }),
          prisma.fivemVehicle.update({
            where: { id: existing.fivemVehicle.id },
            data: {
              framework: options.framework,
              characterId: options.characterId,
              lastSyncedAt: new Date(),
            },
          }),
        ]);
        result.updated.push(plate);
        continue;
      }

      if (plate.length > maxPlateLength) {
        result.skipped.push({ plate, reason: "plateToLong" });
        continue;
      }
      const isBlacklisted = await prisma.blacklistedWord.findFirst({
        where: { word: { contains: plate } },
        select: { id: true },
      });
      if (isBlacklisted) {
        result.skipped.push({ plate, reason: "blacklistedWordUsed" });
        continue;
      }

      let modelId = await findVehicleModel(vehicle);
      if (!modelId && (options.createVehicleModels || isCustomTextfieldEnabled)) {
        modelId = await createVehicleModel(vehicle);
      }
      if (!modelId) {
        result.skipped.push({ plate, reason: "unknownVehicleModel" });
        continue;
      }

      if (registrationStatusId === undefined) {
        registrationStatusId = await findRegistrationStatusId();
      }
      if (!registrationStatusId) {
        result.skipped.push({ plate, reason: "noRegistrationStatusValue" });
        continue;
      }

      await prisma.registeredVehicle.create({
        data: {
          plate,
          color: vehicle.color ?? "",
          citizenId: options.citizenId,
          userId: options.userId,
          modelId,
          registrationStatusId,
          vinNumber: await generateVinNumber(),
          dmvStatus: isDmvEnabled ? WhitelistStatus.PENDING : WhitelistStatus.ACCEPTED,
          fivemVehicle: {
            create: { framework: options.framework, characterId: options.characterId },
          },
        },
      });
      result.created.push(plate);
    } catch (error) {
      console.error(`[fivem] could not sync vehicle ${plate}`, error);
      result.skipped.push({ plate, reason: "error" });
    }
  }

  return result;
}
