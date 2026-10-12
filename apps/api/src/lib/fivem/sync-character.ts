import { Feature, type Prisma, ValueType } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "lib/data/prisma";
import { citizenObjectFromData } from "lib/citizen/citizen-create-data-obj";
import { sendCitizenChangeWebhook } from "lib/discord/extra-webhooks";
import { isFeatureEnabled } from "lib/upsert-cad";
import type { CadWithFeatures } from "./cad";
import type { FIVEM_CHARACTER_SYNC_SCHEMA } from "./schemas";

type CharacterSyncInput = z.infer<typeof FIVEM_CHARACTER_SYNC_SCHEMA>;

export type CharacterSyncResult =
  | {
      result: "created" | "updated" | "unchanged" | "linked";
      citizenId: string;
      userId: string | null;
    }
  | { result: "skipped"; reason: string; citizenId?: string | null };

interface Options {
  data: CharacterSyncInput;
  cad: CadWithFeatures;
  /** the CAD user the player's Discord / Steam account belongs to */
  userId: string | null;
  /** CAD Settings > FiveM framework: create / update citizens */
  syncCitizens: boolean;
}

/** the CAD's gender value with this name (case-insensitive), or undefined */
async function findGenderId(gender: string | null | undefined) {
  if (!gender) return undefined;
  const value = await prisma.value.findFirst({
    where: { type: ValueType.GENDER, value: gender, isDisabled: false },
    select: { id: true },
  });
  return value?.id;
}

/**
 * The CAD needs these to save a citizen (its citizen form requires them), but games rarely know
 * them: what the game server doesn't send is "Unknown", so the citizen can still be edited and
 * saved in the CAD.
 */
const UNKNOWN = "Unknown";

/** the ethnicity with this name, else the CAD's default (or first) ethnicity */
async function findEthnicityId(name: string | null | undefined) {
  if (name) {
    const value = await prisma.value.findFirst({
      where: { type: ValueType.ETHNICITY, value: name, isDisabled: false },
      select: { id: true },
    });
    if (value) return value.id;
  }
  const fallback = await prisma.value.findFirst({
    where: { type: ValueType.ETHNICITY, isDisabled: false },
    orderBy: [{ isDefault: "desc" }, { position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  return fallback?.id;
}

/** a usable value for a field the CAD requires (2+ characters), else undefined */
function filled(value: string | null | undefined) {
  return value && value.length >= 2 ? value : undefined;
}

async function isBlacklisted(...words: string[]) {
  const found = await prisma.blacklistedWord.findFirst({
    where: { OR: words.map((word) => ({ word: { contains: word } })) },
    select: { id: true },
  });
  return !!found;
}

function toDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) return null;
  if (date.getUTCFullYear() < 1850) return null;
  return date;
}

function sameDay(a: Date, b: Date) {
  return a.toISOString().split("T")[0] === b.toISOString().split("T")[0];
}

/**
 * Upserts the CAD citizen of a game character. A character is matched by its framework id
 * (FivemCharacter), so renames in game update the same citizen. A new character is linked to an
 * existing citizen of the same CAD user with the same name, or gets a new citizen.
 */
export async function syncFivemCharacter(options: Options): Promise<CharacterSyncResult> {
  const { data, cad, userId } = options;
  const character = data.character;
  const dateOfBirth = toDate(character.dateOfBirth);

  const link = await prisma.fivemCharacter.findUnique({
    where: {
      framework_characterId: { framework: data.framework, characterId: data.characterId },
    },
    include: { citizen: true },
  });

  if (link) {
    if (!options.syncCitizens) {
      return { result: "unchanged", citizenId: link.citizenId, userId: link.citizen.userId };
    }

    const citizen = link.citizen;
    const update: Prisma.CitizenUncheckedUpdateInput = {};
    const renamed = citizen.name !== character.firstName || citizen.surname !== character.lastName;
    if (renamed) {
      if (await isBlacklisted(character.firstName, character.lastName)) {
        return { result: "skipped", reason: "blacklistedWordUsed", citizenId: citizen.id };
      }
      update.name = character.firstName;
      update.surname = character.lastName;
    }
    if (dateOfBirth && !sameDay(dateOfBirth, citizen.dateOfBirth)) update.dateOfBirth = dateOfBirth;
    const genderId = await findGenderId(character.gender);
    if (genderId && genderId !== citizen.genderId) update.genderId = genderId;
    if (character.height && character.height !== citizen.height) update.height = character.height;
    if (character.phoneNumber && character.phoneNumber !== citizen.phoneNumber) {
      update.phoneNumber = character.phoneNumber;
    }
    // the look comes from the game
    const hairColor = filled(character.hairColor);
    if (hairColor && hairColor !== citizen.hairColor) update.hairColor = hairColor;
    const eyeColor = filled(character.eyeColor);
    if (eyeColor && eyeColor !== citizen.eyeColor) update.eyeColor = eyeColor;
    // weight, address and ethnicity are only defaults: they never overwrite what was set in the CAD
    if (!filled(citizen.weight)) update.weight = filled(character.weight) ?? UNKNOWN;
    if (!filled(citizen.address)) update.address = filled(character.address) ?? UNKNOWN;
    if (!filled(citizen.hairColor) && !update.hairColor) update.hairColor = UNKNOWN;
    if (!filled(citizen.eyeColor) && !update.eyeColor) update.eyeColor = UNKNOWN;
    if (!filled(citizen.height) && !update.height) update.height = UNKNOWN;
    if (!citizen.ethnicityId) {
      const ethnicityId = await findEthnicityId(character.ethnicity);
      if (ethnicityId) update.ethnicityId = ethnicityId;
    }
    // the player linked their CAD account after the citizen was created without one
    const linksUser = !citizen.userId && !!userId;
    if (linksUser) update.userId = userId;

    await prisma.fivemCharacter.update({
      where: { id: link.id },
      data: { lastSyncedAt: new Date() },
    });

    if (Object.keys(update).length === 0) {
      return { result: "unchanged", citizenId: citizen.id, userId: citizen.userId };
    }

    const updated = await prisma.citizen.update({ where: { id: citizen.id }, data: update });
    if (linksUser) {
      // vehicles synced while unlinked: give them to the user too
      await prisma.registeredVehicle.updateMany({
        where: { citizenId: citizen.id, userId: null, fivemVehicle: { isNot: null } },
        data: { userId },
      });
    }
    return { result: "updated", citizenId: updated.id, userId: updated.userId };
  }

  if (!options.syncCitizens) return { result: "skipped", reason: "citizenSyncDisabled" };
  if (!userId && data.unlinked === "skip") return { result: "skipped", reason: "noCadAccount" };

  // a citizen the player already made in the CAD with the same name: link it, don't duplicate
  if (userId) {
    const existing = await prisma.citizen.findFirst({
      where: {
        userId,
        name: character.firstName,
        surname: character.lastName,
        fivemCharacters: { none: {} },
      },
      orderBy: { createdAt: "asc" },
    });
    if (existing) {
      await prisma.fivemCharacter.create({
        data: { framework: data.framework, characterId: data.characterId, citizenId: existing.id },
      });
      const update: Prisma.CitizenUncheckedUpdateInput = {};
      if (character.phoneNumber && !existing.phoneNumber) {
        update.phoneNumber = character.phoneNumber;
      }
      if (Object.keys(update).length > 0) {
        await prisma.citizen.update({ where: { id: existing.id }, data: update });
      }
      return { result: "linked", citizenId: existing.id, userId };
    }
  }

  if (!dateOfBirth) return { result: "skipped", reason: "invalidDateOfBirth" };

  const maxCitizensPerUser = cad.miscCadSettings.maxCitizensPerUser;
  if (userId && maxCitizensPerUser) {
    const count = await prisma.citizen.count({ where: { userId } });
    if (count >= maxCitizensPerUser) {
      return { result: "skipped", reason: "maxCitizensPerUserReached" };
    }
  }

  const allowDuplicateCitizenNames = isFeatureEnabled({
    features: cad.features,
    feature: Feature.ALLOW_DUPLICATE_CITIZEN_NAMES,
    defaultReturn: true,
  });
  if (!allowDuplicateCitizenNames) {
    const taken = await prisma.citizen.findFirst({
      where: { name: character.firstName, surname: character.lastName },
      select: { id: true },
    });
    if (taken) return { result: "skipped", reason: "nameAlreadyTaken" };
  }

  if (await isBlacklisted(character.firstName, character.lastName)) {
    return { result: "skipped", reason: "blacklistedWordUsed" };
  }

  const defaultLicenseValue = await prisma.value.findFirst({
    where: { isDefault: true, type: ValueType.LICENSE },
    select: { id: true },
  });

  const citizenData = await citizenObjectFromData({
    cad,
    defaultLicenseValueId: defaultLicenseValue?.id ?? null,
    data: {
      name: character.firstName,
      surname: character.lastName,
      dateOfBirth,
      gender: await findGenderId(character.gender),
      ethnicity: await findEthnicityId(character.ethnicity),
      height: filled(character.height) ?? UNKNOWN,
      weight: filled(character.weight) ?? UNKNOWN,
      hairColor: filled(character.hairColor) ?? UNKNOWN,
      eyeColor: filled(character.eyeColor) ?? UNKNOWN,
      address: filled(character.address) ?? UNKNOWN,
      phoneNumber: character.phoneNumber ?? null,
    },
  });

  const citizen = await prisma.citizen.create({
    data: {
      ...citizenData,
      userId,
      fivemCharacters: {
        create: { framework: data.framework, characterId: data.characterId },
      },
    },
  });

  sendCitizenChangeWebhook({ action: "created", citizen, executor: null });

  return { result: "created", citizenId: citizen.id, userId };
}
