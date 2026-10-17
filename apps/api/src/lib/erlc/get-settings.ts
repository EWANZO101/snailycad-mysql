import { prisma } from "~/lib/data/prisma";

/** the one settings row, made on first use (kept apart from settings.ts so tests needn't load Prisma) */
export async function getErlcSettings() {
  const existing = await prisma.erlcSettings.findFirst();
  return existing ?? prisma.erlcSettings.create({ data: {} });
}
