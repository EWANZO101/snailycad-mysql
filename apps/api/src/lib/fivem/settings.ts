import { prisma } from "lib/data/prisma";

/** the single FiveM framework settings row (created with the defaults on first use) */
export async function getFivemFrameworkSettings() {
  const existing = await prisma.fivemFrameworkSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;
  // a fixed id, so two first requests at once can't create two rows
  return prisma.fivemFrameworkSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID },
    update: {},
  });
}

const SETTINGS_ID = "fivem-framework";

export interface FivemServerInfo {
  framework?: string | null;
  serverName?: string | null;
  version?: string | null;
}

/** remembers when a game server last synced (shown in CAD Settings) */
export async function recordFivemSync(settingsId: string, info: FivemServerInfo) {
  await prisma.fivemFrameworkSettings
    .update({
      where: { id: settingsId },
      data: {
        lastSyncAt: new Date(),
        lastFramework: info.framework ?? undefined,
        lastServerName: info.serverName ? info.serverName.slice(0, 255) : undefined,
        lastVersion: info.version ? info.version.slice(0, 32) : undefined,
      },
    })
    .catch(() => null);
}

/** counts and the last sync, for the CAD Settings card and the game server's check command */
export async function getFivemFrameworkStats() {
  const [characters, linkedCharacters, vehicles] = await Promise.all([
    prisma.fivemCharacter.count(),
    prisma.fivemCharacter.count({ where: { citizen: { userId: { not: null } } } }),
    prisma.fivemVehicle.count(),
  ]);
  return {
    characters,
    linkedCharacters,
    unlinkedCharacters: characters - linkedCharacters,
    vehicles,
  };
}
