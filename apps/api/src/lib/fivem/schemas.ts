import { z } from "zod";

export const FIVEM_FRAMEWORKS = ["esx", "qbcore", "qbox"] as const;

/** FiveM's json.encode turns an empty Lua table into [] : read that as an empty object */
function emptyArrayAsObject<Schema extends z.ZodTypeAny>(schema: Schema) {
  return z.preprocess((value) => (Array.isArray(value) && value.length === 0 ? {} : value), schema);
}

const IDENTIFIERS = emptyArrayAsObject(
  z
    .object({
      discordId: z.string().trim().max(64).nullish(),
      steamId: z.string().trim().max(64).nullish(),
    })
    .nullish(),
);

const SERVER = {
  framework: z.enum(FIVEM_FRAMEWORKS),
  /** the game server's name (sv_projectName / sv_hostname), shown in CAD Settings */
  serverName: z.string().trim().max(255).nullish(),
  /** the resource version */
  version: z.string().trim().max(32).nullish(),
  /** the phones running on the game server (lib/fivem/phones.ts ids), "framework" included */
  phoneResources: z.array(z.string().trim().max(64)).max(50).nullish(),
};

/** ESX: the users.identifier (e.g. "char1:abc..."), QBCore / Qbox: the citizenid */
const CHARACTER_ID = z.string().trim().min(1).max(191);

const PLATE_LIST = z.array(z.string().trim().max(32)).max(500);

export const FIVEM_VEHICLE_SCHEMA = z.object({
  plate: z.string().trim().min(1).max(16),
  /** spawn name, e.g. "adder" (QBCore / Qbox, or resolved from the hash) */
  model: z.string().trim().max(255).nullish(),
  /** display name, e.g. "Truffade Adder" */
  label: z.string().trim().max(255).nullish(),
  /** the model hash as the game reports it (signed or unsigned 32 bit) */
  hash: z.union([z.number().int(), z.string().trim().max(20)]).nullish(),
  color: z.string().trim().max(255).nullish(),
});

export const FIVEM_CHARACTER_SYNC_SCHEMA = z.object({
  ...SERVER,
  characterId: CHARACTER_ID,
  identifiers: IDENTIFIERS,
  /** what to do with a character whose player has no CAD account: skip it, or create a citizen
   * without a user (CAD users can claim it later) */
  unlinked: z.enum(["skip", "create"]).default("skip"),
  /** the character's phone number from each phone that has one ({ "lb-phone": "5551234" }); the
   * CAD picks one (lib/fivem/phones.ts). Older resources only send character.phoneNumber. */
  phones: emptyArrayAsObject(
    z
      .record(
        z.string().trim().max(64),
        z.union([z.string(), z.number()]).transform((value) => String(value).trim().slice(0, 64)),
      )
      .nullish(),
  ),
  character: z.object({
    firstName: z.string().trim().min(1).max(255),
    lastName: z.string().trim().min(1).max(255),
    /** YYYY-MM-DD */
    dateOfBirth: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullish(),
    /** the gender's name in the CAD (Admin > Values > Gender), e.g. "Male" */
    gender: z.string().trim().max(255).nullish(),
    height: z.string().trim().max(255).nullish(),
    weight: z.string().trim().max(255).nullish(),
    phoneNumber: z.string().trim().max(64).nullish(),
    /** from the saved skin, e.g. "Dark Brown" */
    hairColor: z.string().trim().max(255).nullish(),
    eyeColor: z.string().trim().max(255).nullish(),
    /** Config.Character defaults on the game server */
    address: z.string().trim().max(255).nullish(),
    /** the ethnicity's name in the CAD (Admin > Values > Ethnicity) */
    ethnicity: z.string().trim().max(255).nullish(),
    /** held (true) or not (false) per CAD licence; licences the server doesn't have are left out */
    licenses: emptyArrayAsObject(
      z
        .object({
          drivers: z.boolean(),
          weapon: z.boolean(),
          pilot: z.boolean(),
          water: z.boolean(),
          hunting: z.boolean(),
          fishing: z.boolean(),
        })
        .partial()
        .nullish(),
    ),
    /** driver's licence category names in the CAD to add */
    licenseCategories: z.array(z.string().trim().max(255)).max(20).nullish(),
    /** the CAD licence value names for "has the licence" and "doesn't" */
    licenseValues: z
      .object({
        valid: z.string().trim().max(255).nullish(),
        none: z.string().trim().max(255).nullish(),
      })
      .nullish(),
  }),
  /** the character's garage. Leave out to not touch vehicles. */
  vehicles: z.array(FIVEM_VEHICLE_SCHEMA).max(200).nullish(),
  /** every plate the character owns in game, skipped ones included: synced vehicles whose plate
   * isn't here are gone (sold, deleted). Leave out to never remove vehicles (older resources). */
  plates: PLATE_LIST.nullish(),
  /** create vehicle models the CAD doesn't know yet (Admin > Values > Vehicle) */
  createVehicleModels: z.boolean().default(false),
});

/**
 * Garages that changed in game (bought, sold, transferred, deleted), found by the resource's
 * vehicle watcher: each character's whole garage, so the CAD can add, move and remove vehicles.
 */
export const FIVEM_VEHICLES_SYNC_SCHEMA = z.object({
  ...SERVER,
  characters: z
    .array(
      z.object({
        characterId: CHARACTER_ID,
        vehicles: z.array(FIVEM_VEHICLE_SCHEMA).max(200),
        plates: PLATE_LIST,
      }),
    )
    .max(100),
  createVehicleModels: z.boolean().default(false),
});

/** asks which characters the CAD has synced (the vehicle watcher catches up on those at start) */
export const FIVEM_KNOWN_CHARACTERS_SCHEMA = z.object({
  framework: z.enum(FIVEM_FRAMEWORKS),
});

export const FIVEM_DUTY_SCHEMA = z.object({
  ...SERVER,
  characterId: CHARACTER_ID.nullish(),
  identifiers: IDENTIFIERS,
  onDuty: z.boolean(),
  unitType: z.enum(["leo", "ems-fd"]),
  /** prefer a unit in one of these departments (names or ids) */
  departments: z.array(z.string().trim().min(1).max(255)).max(20).nullish(),
  /** prefer the unit with this callsign ("1A-12", callsign + callsign2, or a badge number) */
  callsign: z.string().trim().max(64).nullish(),
});

export const FIVEM_CHECK_SCHEMA = emptyArrayAsObject(
  z.object({
    framework: z.enum(FIVEM_FRAMEWORKS).nullish(),
    phoneResources: SERVER.phoneResources,
    players: z
      .array(
        emptyArrayAsObject(
          z.object({
            characterId: CHARACTER_ID.nullish(),
            identifiers: IDENTIFIERS,
          }),
        ),
      )
      .max(256)
      .nullish(),
  }),
);
