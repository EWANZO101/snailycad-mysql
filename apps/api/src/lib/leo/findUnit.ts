import {
  combinedEmsFdUnitProperties,
  combinedUnitProperties,
  combinedDotUnitProperties,
} from "utils/leo/includes";
import type {
  CombinedLeoUnit,
  CombinedEmsFdUnit,
  CombinedDotUnit,
  Officer,
  EmsFdDeputy,
  DotWorker,
  StatusValue,
  DivisionValue,
} from "@prisma/client";
import { prisma } from "lib/data/prisma";

interface Includes {
  officer?: any;
  emsFdDeputy?: any;
  dotWorker?: any;
}

export async function findUnit(
  id: string,
  extraFind?: any,
  includes?: Includes,
): Promise<
  | OfficerReturn
  | EmsFdReturn
  | DotReturn
  | CombinedLeoUnitReturn
  | CombinedEmsFdUnitReturn
  | CombinedDotUnitReturn
> {
  let type: "leo" | "ems-fd" | "dot" | "combined-leo" | "combined-ems-fd" | "combined-dot" = "leo";
  let unit: any = await prisma.officer.findFirst({
    where: { id, ...extraFind },
    include: includes?.officer,
  });

  if (!unit) {
    type = "ems-fd";
    unit = await prisma.emsFdDeputy.findFirst({
      where: { id, ...extraFind },
      include: includes?.emsFdDeputy,
    });
  }

  if (!unit) {
    type = "dot";
    unit = await prisma.dotWorker.findFirst({
      where: { id, ...extraFind },
      include: includes?.dotWorker,
    });
  }

  if (!unit) {
    type = "combined-leo";
    unit = await prisma.combinedLeoUnit.findFirst({
      where: { id },
      include: combinedUnitProperties,
    });
  }

  if (!unit) {
    type = "combined-ems-fd";
    unit = await prisma.combinedEmsFdUnit.findFirst({
      where: { id },
      include: combinedEmsFdUnitProperties,
    });
  }

  if (!unit) {
    type = "combined-dot";
    unit = await prisma.combinedDotUnit.findFirst({
      where: { id },
      include: combinedDotUnitProperties,
    });
  }

  return { type, unit: unit ?? null } as any;
}

interface OfficerReturn {
  type: "leo";
  unit: (Officer & { divisions: DivisionValue[] }) | null;
}

interface EmsFdReturn {
  type: "ems-fd";
  unit: EmsFdDeputy | null;
}

interface DotReturn {
  type: "dot";
  unit: DotWorker | null;
}

interface CombinedLeoUnitReturn {
  type: "combined-leo";
  unit: (CombinedLeoUnit & { status: StatusValue }) | null;
}

interface CombinedEmsFdUnitReturn {
  type: "combined-ems-fd";
  unit: (CombinedEmsFdUnit & { status: StatusValue }) | null;
}

interface CombinedDotUnitReturn {
  type: "combined-dot";
  unit: (CombinedDotUnit & { status: StatusValue }) | null;
}
