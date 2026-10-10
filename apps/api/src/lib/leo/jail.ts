import {
  type JailTimeScale,
  type Prisma,
  type Violation,
  PublishStatus,
  RecordType,
  ReleaseType,
} from "@prisma/client";
import { prisma } from "lib/data/prisma";
import { convertToJailTimeScale } from "lib/leo/utils";

/**
 * an arrest report that is published and has not been released yet.
 * The `Citizen.arrested` flag is derived from these records.
 */
export const ACTIVE_ARREST_RECORD_WHERE = {
  type: RecordType.ARREST_REPORT,
  publishStatus: PublishStatus.PUBLISHED,
  releaseId: null,
} satisfies Prisma.RecordWhereInput;

export function getTotalJailTime(violations: Pick<Violation, "jailTime" | "counts">[]) {
  return violations.reduce((ac, cv) => ac + (cv.jailTime || 0) * (cv.counts || 1), 0);
}

/**
 * release all active arrest reports whose jail time has expired.
 * Arrest reports without any jail time are never released automatically.
 *
 * @returns the ids of the citizens who had (at least) one record released
 */
export async function releaseExpiredArrestRecords(options: {
  jailTimeScale: JailTimeScale | null | undefined;
  citizenIds?: string[];
}) {
  if (!options.jailTimeScale) return [];

  const records = await prisma.record.findMany({
    where: {
      ...ACTIVE_ARREST_RECORD_WHERE,
      citizenId: options.citizenIds ? { in: options.citizenIds } : { not: null },
    },
    select: {
      id: true,
      citizenId: true,
      createdAt: true,
      violations: { select: { jailTime: true, counts: true } },
    },
  });

  const now = Date.now();
  const expiredRecords = records.filter((record) => {
    const totalJailTime = getTotalJailTime(record.violations);
    if (totalJailTime <= 0) return false;

    const time = convertToJailTimeScale(totalJailTime, options.jailTimeScale!);
    return now >= new Date(record.createdAt).getTime() + time;
  });

  const releasedCitizenIds = new Set<string>();
  for (const record of expiredRecords) {
    // only release the record if it hasn't been released in the meantime
    const release = await prisma.recordRelease.create({
      data: { type: ReleaseType.TIME_OUT },
    });
    const updated = await prisma.record.updateMany({
      where: { id: record.id, releaseId: null },
      data: { releaseId: release.id },
    });

    if (updated.count <= 0) {
      await prisma.recordRelease.delete({ where: { id: release.id } });
      continue;
    }

    if (record.citizenId) {
      releasedCitizenIds.add(record.citizenId);
    }
  }

  return Array.from(releasedCitizenIds);
}

/**
 * re-calculate the `arrested` flag for citizens based on their active (published, unreleased) arrest reports.
 *
 * @param citizenIds the citizens to sync. When omitted, every citizen currently flagged as arrested,
 * or with an active arrest report, is synced.
 * @returns the ids of the citizens (out of the synced ones) that are currently arrested.
 */
export async function syncCitizensArrestedStatus(citizenIds?: string[]) {
  const citizenIdFilter = citizenIds ? { in: citizenIds } : undefined;
  if (citizenIds && citizenIds.length <= 0) return new Set<string>();

  const activeRecords = await prisma.record.findMany({
    where: {
      ...ACTIVE_ARREST_RECORD_WHERE,
      citizenId: citizenIdFilter ?? { not: null },
    },
    select: { citizenId: true },
    distinct: ["citizenId"],
  });

  const arrestedCitizenIds = new Set(
    activeRecords.map((record) => record.citizenId).filter(Boolean) as string[],
  );

  await prisma.$transaction([
    prisma.citizen.updateMany({
      where: { id: { in: Array.from(arrestedCitizenIds) }, arrested: { not: true } },
      data: { arrested: true },
    }),
    prisma.citizen.updateMany({
      where: {
        AND: [
          citizenIdFilter ? { id: citizenIdFilter } : {},
          { id: { notIn: Array.from(arrestedCitizenIds) } },
          { arrested: true },
        ],
      },
      data: { arrested: false },
    }),
  ]);

  return arrestedCitizenIds;
}

/**
 * release expired arrest reports and re-sync the `arrested` flag for the given citizens
 * (or all arrested citizens when `citizenIds` is omitted).
 */
export async function updateCitizensJailStatus(options: {
  jailTimeScale: JailTimeScale | null | undefined;
  citizenIds?: string[];
}) {
  await releaseExpiredArrestRecords(options);
  return syncCitizensArrestedStatus(options.citizenIds);
}
