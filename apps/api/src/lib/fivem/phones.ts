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
  /** how to set it up, shown under "Set up" in CAD Settings > Phones */
  setup: string[];
}

export const FIVEM_PHONES: FivemPhone[] = [
  {
    id: "framework",
    name: "Framework phone number",
    features: ["phoneNumber"],
    description:
      "ESX's users.phone_number or QBCore / Qbox's charinfo.phone. Phones that keep their number there, like qb-phone and Renewed's qb-phone, work through this.",
    setup: [
      "Nothing to install: ESX keeps the number in users.phone_number, QBCore / Qbox in charinfo.phone.",
      "qb-phone and Renewed's qb-phone store their number there, so they work through this.",
      "Turn it off to prefer a phone script's number over the framework's.",
    ],
  },
  {
    id: "opslabs-phone",
    name: "OPS Phone",
    features: ["phoneNumber", "calls"],
    description:
      "Full integration: 911, tow and taxi calls from the phone become CAD calls, with status texts back. Set it up in the OPS Phone tab.",
    setup: [],
  },
  {
    id: "lb-phone",
    name: "LB Phone",
    features: ["phoneNumber"],
    description: "The number of the phone the player has equipped.",
    setup: [
      "Install LB Phone (resource name lb-phone) and start it before snailycad-framework.",
      "The number of the phone the player has equipped is used.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "qs-smartphone",
    name: "Quasar Smartphone",
    features: ["phoneNumber"],
    description: "The number of the player's active phone / SIM.",
    setup: [
      "Install Quasar Smartphone (resource name qs-smartphone) and start it before snailycad-framework.",
      "The number of the player's active phone / SIM is used.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "gksphone",
    name: "GKSPhone",
    features: ["phoneNumber"],
    description: "GKSPhone v2: the player's phone number.",
    setup: [
      "Install GKSPhone v2 (resource name gksphone) and start it before snailycad-framework.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "npwd",
    name: "NPWD",
    features: ["phoneNumber"],
    description: "New Phone Who Dis (Project Error): the player's phone number.",
    setup: [
      "Install NPWD (resource name npwd) and start it before snailycad-framework.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "yseries",
    name: "YSeries (YPhone / YFlip)",
    features: ["phoneNumber"],
    description: "The player's number from YPhone or YFlip.",
    setup: [
      "Install YSeries (resource name yseries; YPhone and YFlip) and start it before snailycad-framework.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "roadphone",
    name: "RoadPhone",
    features: ["phoneNumber"],
    description: "RoadPhone Pro, or the older RoadPhone (looked up by the character's identifier).",
    setup: [
      "Install RoadPhone (resource name roadphone) and start it before snailycad-framework.",
      "RoadPhone Pro and the older RoadPhone both work.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "okokPhone",
    name: "okokPhone",
    features: ["phoneNumber"],
    description: "The player's phone number.",
    setup: [
      "Install okokPhone (resource name okokPhone, capital P) and start it before snailycad-framework.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "high-phone",
    name: "High Phone",
    features: ["phoneNumber"],
    description: "High Scripts' phone (the current high-phone, not the old high_phone).",
    setup: [
      "Install High Phone (resource name high-phone, with a hyphen) and start it before snailycad-framework. The old high_phone isn't supported.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "17mov_Phone",
    name: "17mov Phone",
    features: ["phoneNumber"],
    description: "The player's active number.",
    setup: [
      "Install 17mov Phone (resource name 17mov_Phone) and start it before snailycad-framework.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "codem-phone",
    name: "CodeM mPhone",
    features: ["phoneNumber"],
    description: "mPhone 2.5: the player's phone number.",
    setup: [
      "Install CodeM mPhone 2.5 (resource name codem-phone) and start it before snailycad-framework.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
  },
  {
    id: "z-phone",
    name: "Z-Phone",
    features: ["phoneNumber"],
    description: "Read from its zp_users table (it has no exports).",
    setup: [
      "Install Z-Phone (resource name z-phone) and start it before snailycad-framework.",
      "It has no exports: the number is read from its zp_users table, so oxmysql must be running.",
      "The snailycad-framework resource must be installed and set up (see the FiveM framework tab).",
      "The number reaches the citizen when the character loads and on every resync. Run snailyframework_check in the server console: the phone must be listed under “phone numbers from”.",
    ],
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
