/**
 * Phones the snailycad-framework resource can read a character's phone number from. `id` is the
 * key the resource sends in `phones` (the resource folder name, or "framework"); keep it in sync
 * with PHONE_EXPORTS in integrations/fivem/snailycad-framework/server/framework.lua.
 *
 * The resource sends every number it finds; the CAD keeps the first one, in this order, whose
 * phone isn't switched off in CAD Settings > Phones.
 */
export interface FivemPhone {
  id: string;
  name: string;
  /** what the CAD does with it */
  features: ("phoneNumber" | "calls")[];
  description: string;
}

export const FIVEM_PHONES: FivemPhone[] = [
  {
    id: "framework",
    name: "Framework phone number",
    features: ["phoneNumber"],
    description:
      "ESX's users.phone_number or QBCore / Qbox's charinfo.phone. Phones that keep their number there, like qb-phone and Renewed's qb-phone, work through this.",
  },
  {
    id: "opslabs-phone",
    name: "OPS Phone",
    features: ["phoneNumber", "calls"],
    description:
      "Full integration: 911, tow and taxi calls from the phone become CAD calls, with status texts back. Set it up in the OPS Phone tab.",
  },
  {
    id: "lb-phone",
    name: "LB Phone",
    features: ["phoneNumber"],
    description: "The number of the phone the player has equipped.",
  },
  {
    id: "qs-smartphone",
    name: "Quasar Smartphone",
    features: ["phoneNumber"],
    description: "The number of the player's active phone / SIM.",
  },
  {
    id: "gksphone",
    name: "GKSPhone",
    features: ["phoneNumber"],
    description: "GKSPhone v2: the player's phone number.",
  },
  {
    id: "npwd",
    name: "NPWD",
    features: ["phoneNumber"],
    description: "New Phone Who Dis (Project Error): the player's phone number.",
  },
  {
    id: "yseries",
    name: "YSeries (YPhone / YFlip)",
    features: ["phoneNumber"],
    description: "The player's number from YPhone or YFlip.",
  },
  {
    id: "roadphone",
    name: "RoadPhone",
    features: ["phoneNumber"],
    description: "RoadPhone Pro, or the older RoadPhone (looked up by the character's identifier).",
  },
  {
    id: "okokPhone",
    name: "okokPhone",
    features: ["phoneNumber"],
    description: "The player's phone number.",
  },
  {
    id: "high-phone",
    name: "High Phone",
    features: ["phoneNumber"],
    description: "High Scripts' phone (the current high-phone, not the old high_phone).",
  },
  {
    id: "17mov_Phone",
    name: "17mov Phone",
    features: ["phoneNumber"],
    description: "The player's active number.",
  },
  {
    id: "codem-phone",
    name: "CodeM mPhone",
    features: ["phoneNumber"],
    description: "mPhone 2.5: the player's phone number.",
  },
  {
    id: "z-phone",
    name: "Z-Phone",
    features: ["phoneNumber"],
    description: "Read from its zp_users table (it has no exports).",
  },
];

const PHONE_IDS = new Set(FIVEM_PHONES.map((phone) => phone.id));

export function isFivemPhoneId(id: string) {
  return PHONE_IDS.has(id);
}

/** a JSON column holding a list of phone ids */
export function phoneIdList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((id): id is string => typeof id === "string" && isFivemPhoneId(id))
    : [];
}

/**
 * The number to save on the citizen. `phones` is what the resource found per phone; an older
 * resource doesn't send it, then its own pick (`fallback`) is used.
 */
export function pickPhoneNumber(options: {
  phones: Record<string, string> | null | undefined;
  fallback: string | null | undefined;
  disabled: string[];
}) {
  if (!options.phones) return options.fallback ?? null;
  for (const phone of FIVEM_PHONES) {
    if (options.disabled.includes(phone.id)) continue;
    const number = options.phones[phone.id]?.trim();
    if (number) return number;
  }
  return null;
}

/** the catalog with this server's switches and what the game server last reported running */
export function describeFivemPhones(settings: {
  disabledPhones: unknown;
  detectedPhones: unknown;
}) {
  const disabled = phoneIdList(settings.disabledPhones);
  const detected = Array.isArray(settings.detectedPhones)
    ? settings.detectedPhones.filter((id): id is string => typeof id === "string")
    : null;
  return FIVEM_PHONES.map((phone) => ({
    ...phone,
    enabled: !disabled.includes(phone.id),
    // null: the game server hasn't reported (an older resource, or it never synced)
    detected: detected ? detected.includes(phone.id) : null,
  }));
}
