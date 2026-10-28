import { prisma } from "lib/data/prisma";
import { findFirstSmallestInArray } from "utils/findFirstSmallestInArray";

interface Options {
  type: "leo" | "ems-fd" | "dot" | "combined-leo" | "combined-ems-fd" | "combined-dot";
}

export async function findNextAvailableIncremental(options: Options) {
  const prismaNames = {
    leo: "officer",
    "ems-fd": "emsFdDeputy",
    dot: "dotWorker",
    "combined-leo": "combinedLeoUnit",
    "combined-ems-fd": "combinedEmsFdUnit",
    "combined-dot": "combinedDotUnit",
  };
  const t = prismaNames[options.type];

  // @ts-expect-error properties for this function are the same.
  const units = (await prisma[t].findMany({
    where: { incremental: { not: null } },
  })) as { incremental: number }[];

  const incrementalNumbers = units.map((v) => v.incremental);
  return findFirstSmallestInArray(incrementalNumbers);
}
