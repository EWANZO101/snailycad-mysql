import { ShouldDoType, WhitelistStatus } from "@prisma/client";
import type { z } from "zod";
import { prisma } from "lib/data/prisma";
import { applyUnitStatus } from "lib/dispatch/apply-unit-status";
import { findUnit } from "lib/leo/findUnit";
import type { Socket } from "services/socket-service";
import type { CadWithFeatures } from "./cad";
import type { FIVEM_DUTY_SCHEMA } from "./schemas";

type DutyInput = z.infer<typeof FIVEM_DUTY_SCHEMA>;

export type DutySyncResult =
  | { result: "onDuty" | "offDuty"; units: string[] }
  | { result: "unchanged"; units: string[] }
  | { result: "skipped"; reason: string };

interface Options {
  data: DutyInput;
  userId: string;
  locale: string | null;
  cad: CadWithFeatures;
  socket: Socket;
}

const unitInclude = {
  department: { include: { value: true } },
  whitelistStatus: true,
  status: true,
} as const;

interface CandidateUnit {
  id: string;
  callsign: string;
  callsign2: string;
  userDefinedCallsign: string | null;
  badgeNumber: number | null;
  badgeNumberString: string | null;
  citizenId: string;
  departmentId: string | null;
  suspended: boolean;
  updatedAt: Date;
  department: { id: string; isDefaultDepartment: boolean; value: { value: string } } | null;
  whitelistStatus: { status: WhitelistStatus } | null;
  status: { shouldDo: ShouldDoType } | null;
}

/** "LSPD 1A-12" style label for the game server's console */
function unitLabel(unit: CandidateUnit) {
  const callsign = unit.userDefinedCallsign || `${unit.callsign}-${unit.callsign2}`;
  return unit.department ? `${unit.department.value.value} ${callsign}` : callsign;
}

function isOnDuty(unit: Pick<CandidateUnit, "status">) {
  return !!unit.status && unit.status.shouldDo !== ShouldDoType.SET_OFF_DUTY;
}

function matchesCallsign(unit: CandidateUnit, callsign: string) {
  const wanted = callsign.replace(/\s+/g, "").toLowerCase();
  const forms = [
    unit.userDefinedCallsign,
    `${unit.callsign}${unit.callsign2}`,
    `${unit.callsign}-${unit.callsign2}`,
    unit.callsign2,
    unit.badgeNumberString,
    unit.badgeNumber !== null ? String(unit.badgeNumber) : null,
  ];
  return forms.some((form) => !!form && form.replace(/\s+/g, "").toLowerCase() === wanted);
}

/**
 * Picks the unit a player goes on duty with: the callsign the server sent, then the unit of the
 * character's own citizen, then one in a mapped department, then the most recently used one.
 */
function pickUnit(units: CandidateUnit[], data: DutyInput, citizenId: string | null) {
  const departments = (data.departments ?? []).map((d) => d.toLowerCase());
  const score = (unit: CandidateUnit) => {
    let points = 0;
    if (data.callsign && matchesCallsign(unit, data.callsign)) points += 8;
    if (citizenId && unit.citizenId === citizenId) points += 4;
    if (
      unit.department &&
      (departments.includes(unit.department.id.toLowerCase()) ||
        departments.includes(unit.department.value.value.toLowerCase()))
    ) {
      points += 2;
    }
    return points;
  };
  return [...units].sort(
    (a, b) => score(b) - score(a) || b.updatedAt.getTime() - a.updatedAt.getTime(),
  )[0];
}

/** the CAD's on-duty / off-duty status code for this kind of unit and department */
async function findStatus(
  shouldDo: ShouldDoType,
  unitType: DutyInput["unitType"],
  departmentId: string | null,
) {
  const statuses = await prisma.statusValue.findMany({
    where: { shouldDo, value: { isDisabled: false } },
    include: { value: true, departments: { select: { id: true } } },
    orderBy: { value: { position: "asc" } },
  });
  const page = unitType === "leo" ? "LEO" : unitType === "ems-fd" ? "EMS_FD" : "DOT";
  const forPage = (status: (typeof statuses)[number]) => {
    const pages = Array.isArray(status.whatPages) ? (status.whatPages as string[]) : [];
    return pages.length === 0 || pages.includes(page);
  };
  const forDepartment = (status: (typeof statuses)[number]) =>
    status.departments.length === 0 ||
    (!!departmentId && status.departments.some((d) => d.id === departmentId));

  return (
    statuses.find((s) => forPage(s) && forDepartment(s)) ??
    statuses.find((s) => forDepartment(s)) ??
    statuses[0] ??
    null
  );
}

async function setStatus(options: Options, unitId: string, shouldDo: ShouldDoType) {
  const unit = await findUnit(unitId, { userId: options.userId }, { officer: { divisions: true } });
  if (!unit.unit) return "unitNotFound";

  const departmentId = "departmentId" in unit.unit ? (unit.unit.departmentId ?? null) : null;
  const code = await findStatus(shouldDo, options.data.unitType, departmentId);
  if (!code) {
    return shouldDo === ShouldDoType.SET_ON_DUTY ? "noOnDutyStatus" : "noOffDutyStatus";
  }

  await applyUnitStatus({
    unit,
    code,
    isDispatch: false,
    userId: options.userId,
    locale: options.locale,
    activeEmergencyVehicleId: shouldDo === ShouldDoType.SET_OFF_DUTY ? null : undefined,
    socket: options.socket,
    cad: options.cad,
  });
  return null;
}

/** sets the player's CAD unit on or off duty when their duty changes in game */
export async function syncFivemDuty(options: Options): Promise<DutySyncResult> {
  const { data, userId } = options;

  const units: CandidateUnit[] =
    data.unitType === "leo"
      ? await prisma.officer.findMany({ where: { userId }, include: unitInclude })
      : data.unitType === "ems-fd"
        ? await prisma.emsFdDeputy.findMany({ where: { userId }, include: unitInclude })
        : await prisma.dotWorker.findMany({ where: { userId }, include: unitInclude });

  if (!units.length) return { result: "skipped", reason: "noUnit" };

  if (!data.onDuty) {
    const onDuty = units.filter(isOnDuty);
    if (!onDuty.length) return { result: "unchanged", units: [] };
    const changed: string[] = [];
    for (const unit of onDuty) {
      if (await isCombined(data.unitType, unit.id)) continue;
      const error = await setStatus(options, unit.id, ShouldDoType.SET_OFF_DUTY);
      if (error) return { result: "skipped", reason: error };
      changed.push(unitLabel(unit));
    }
    if (!changed.length) return { result: "skipped", reason: "unitIsCombined" };
    return { result: "offDuty", units: changed };
  }

  const alreadyOnDuty = units.find(isOnDuty);
  if (alreadyOnDuty) return { result: "unchanged", units: [unitLabel(alreadyOnDuty)] };

  const usable = units.filter((unit) => {
    if (unit.suspended) return false;
    const notAccepted =
      unit.whitelistStatus &&
      unit.whitelistStatus.status !== WhitelistStatus.ACCEPTED &&
      !unit.department?.isDefaultDepartment;
    return !notAccepted;
  });
  if (!usable.length) return { result: "skipped", reason: "noUsableUnit" };

  let citizenId: string | null = null;
  if (data.characterId) {
    const link = await prisma.fivemCharacter.findUnique({
      where: {
        framework_characterId: { framework: data.framework, characterId: data.characterId },
      },
      select: { citizenId: true },
    });
    citizenId = link?.citizenId ?? null;
  }

  const unit = pickUnit(usable, data, citizenId);
  if (!unit) return { result: "skipped", reason: "noUsableUnit" };
  if (await isCombined(data.unitType, unit.id)) {
    return { result: "skipped", reason: "unitIsCombined" };
  }

  const error = await setStatus(options, unit.id, ShouldDoType.SET_ON_DUTY);
  if (error) return { result: "skipped", reason: error };
  return { result: "onDuty", units: [unitLabel(unit)] };
}

async function isCombined(unitType: DutyInput["unitType"], unitId: string) {
  const combined =
    unitType === "leo"
      ? await prisma.combinedLeoUnit.findFirst({
          where: { officers: { some: { id: unitId } } },
          select: { id: true },
        })
      : unitType === "ems-fd"
        ? await prisma.combinedEmsFdUnit.findFirst({
            where: { deputies: { some: { id: unitId } } },
            select: { id: true },
          })
        : await prisma.combinedDotUnit.findFirst({
            where: { workers: { some: { id: unitId } } },
            select: { id: true },
          });
  return !!combined;
}
