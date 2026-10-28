import { Controller } from "@tsed/di";
import { BodyParams, Context, PathParams, UseBeforeEach } from "@tsed/common";
import { ContentType, Description, Post, Tags } from "@tsed/schema";
import { prisma } from "lib/data/prisma";
import { BadRequest, NotFound } from "@tsed/exceptions";
import {
  type CombinedEmsFdUnit,
  type CombinedLeoUnit,
  type CombinedDotUnit,
  Feature,
  ShouldDoType,
  WhatPages,
} from "@prisma/client";
import { Socket } from "services/socket-service";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findNextAvailableIncremental } from "lib/leo/findNextAvailableIncremental";
import type * as APITypes from "@snailycad/types/api";
import { getNextActive911CallId } from "lib/dispatch/911-calls/get-next-active-911-call";
import { getNextIncidentId } from "lib/incidents/get-next-incident-id";
import { validateSchema } from "lib/data/validate-schema";
import { MERGE_UNIT_SCHEMA } from "@snailycad/schemas";
import { isFeatureEnabled } from "lib/upsert-cad";
import {
  combinedUnitProperties,
  combinedEmsFdUnitProperties,
  combinedDotUnitProperties,
} from "utils/leo/includes";

@Tags("Dispatch")
@Controller("/dispatch/status")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class CombinedUnitsController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  @Post("/merge/leo")
  @Description(
    "Merge officers into a combined/merged unit via their ids. `entry: true` means it that officer will be the main unit.",
  )
  @UsePermissions({
    permissions: [Permissions.Dispatch, Permissions.Leo],
  })
  async mergeOfficers(
    @BodyParams() body: unknown,
    @Context("cad") cad: { features?: Record<Feature, boolean> },
  ): Promise<APITypes.PostDispatchStatusMergeOfficers> {
    const data = validateSchema(MERGE_UNIT_SCHEMA, body);

    const officers = await prisma.$transaction(
      data.ids.map((officer) => {
        return prisma.officer.findFirst({
          where: {
            id: officer.id,
          },
        });
      }),
    );

    if (officers.includes(null)) {
      throw new BadRequest("officerNotFoundInArray");
    }

    const existing = officers.some((v) => v?.combinedLeoUnitId);
    if (existing) {
      throw new BadRequest("officerAlreadyMerged");
    }

    const entryOfficerId = data.ids.find((v) => v.entry)?.id;
    if (!entryOfficerId) {
      throw new BadRequest("noEntryOfficer");
    }

    const entryOfficer = await prisma.officer.findUnique({
      where: { id: entryOfficerId },
      include: { divisions: { take: 1, where: { pairedUnitTemplate: { not: null } } } },
    });

    if (!entryOfficer) {
      throw new BadRequest("noEntryOfficer");
    }

    const status = await prisma.statusValue.findFirst({
      where: {
        shouldDo: ShouldDoType.SET_ON_DUTY,
        OR: [{ whatPages: { isEmpty: true } }, { whatPages: { has: WhatPages.LEO } }],
      },
      select: { id: true },
    });

    const [division] = entryOfficer.divisions;

    const emergencyVehicle = data.vehicleId
      ? await prisma.emergencyVehicleValue.findUnique({ where: { id: data.vehicleId } })
      : null;

    const isUserDefinedCallsignEnabled = isFeatureEnabled({
      defaultReturn: false,
      feature: Feature.USER_DEFINED_CALLSIGN_COMBINED_UNIT,
      features: cad.features,
    });

    if (isUserDefinedCallsignEnabled) {
      const existing = await prisma.combinedLeoUnit.findFirst({
        where: { userDefinedCallsign: { equals: data.userDefinedCallsign, mode: "insensitive" } },
      });

      if (existing) {
        throw new BadRequest("userDefinedCallsignAlreadyExists");
      }
    }

    const nextInt = await findNextAvailableIncremental({ type: "combined-leo" });
    const combinedUnit = await prisma.combinedLeoUnit.create({
      data: {
        statusId: status?.id ?? null,
        callsign: entryOfficer.callsign,
        callsign2: entryOfficer.callsign2,
        departmentId: entryOfficer.departmentId,
        incremental: nextInt,
        pairedUnitTemplate: division?.pairedUnitTemplate ?? null,
        activeVehicleId: emergencyVehicle?.id ?? null,
        userDefinedCallsign: isUserDefinedCallsignEnabled ? data.userDefinedCallsign || null : null,
      },
    });

    const combinedUnits = await Promise.all(
      data.ids.map(async ({ id: officerId }, idx) => {
        await prisma.officer.update({
          where: { id: officerId },
          data: { statusId: null },
        });

        return prisma.combinedLeoUnit.update({
          where: {
            id: combinedUnit.id,
          },
          data: {
            officers: { connect: { id: officerId } },
          },
          include: idx === data.ids.length - 1 ? combinedUnitProperties : undefined,
        });
      }),
    );

    const last = combinedUnits[combinedUnits.length - 1];
    await this.socket.emitUpdateOfficerStatus();

    return last as APITypes.PostDispatchStatusMergeOfficers;
  }

  @Post("/merge/ems-fd")
  @Description(
    "Merge ems-fd deputies into a combined/merged unit via their ids. `entry: true` means it that deputy will be the main unit.",
  )
  @UsePermissions({
    permissions: [Permissions.Dispatch, Permissions.Leo],
  })
  async mergeDeputies(
    @BodyParams() body: unknown,
    @Context("cad") cad: { features?: Record<Feature, boolean> },
  ): Promise<APITypes.PostDispatchStatusMergeDeputies> {
    const data = validateSchema(MERGE_UNIT_SCHEMA, body);

    const deputies = await prisma.$transaction(
      data.ids.map((deputy) => {
        return prisma.emsFdDeputy.findFirst({
          where: {
            id: deputy.id,
          },
        });
      }),
    );

    if (deputies.includes(null)) {
      throw new BadRequest("deputyNotFoundInArray");
    }

    const existing = deputies.some((v) => v?.combinedEmsFdUnitId);
    if (existing) {
      throw new BadRequest("deputyAlreadyMerged");
    }

    const entryDeputyId = data.ids.find((v) => v.entry)?.id;
    if (!entryDeputyId) {
      throw new BadRequest("noEntryDeputy");
    }

    const entryDeputy = await prisma.emsFdDeputy.findUnique({
      where: { id: entryDeputyId },
      include: { division: true },
    });

    if (!entryDeputy) {
      throw new BadRequest("noEntryDeputy");
    }

    const status = await prisma.statusValue.findFirst({
      where: {
        shouldDo: ShouldDoType.SET_ON_DUTY,
        OR: [{ whatPages: { isEmpty: true } }, { whatPages: { has: WhatPages.EMS_FD } }],
      },
      select: { id: true },
    });

    const emergencyVehicle = data.vehicleId
      ? await prisma.emergencyVehicleValue.findUnique({ where: { id: data.vehicleId } })
      : null;

    const isUserDefinedCallsignEnabled = isFeatureEnabled({
      defaultReturn: false,
      feature: Feature.USER_DEFINED_CALLSIGN_COMBINED_UNIT,
      features: cad.features,
    });

    if (isUserDefinedCallsignEnabled) {
      const existing = await prisma.combinedEmsFdUnit.findFirst({
        where: { userDefinedCallsign: { equals: data.userDefinedCallsign, mode: "insensitive" } },
      });

      if (existing) {
        throw new BadRequest("userDefinedCallsignAlreadyExists");
      }
    }

    const nextInt = await findNextAvailableIncremental({ type: "combined-ems-fd" });
    const combinedUnit = await prisma.combinedEmsFdUnit.create({
      data: {
        statusId: status?.id ?? null,
        callsign: entryDeputy.callsign,
        callsign2: entryDeputy.callsign2,
        departmentId: entryDeputy.departmentId,
        incremental: nextInt,
        pairedUnitTemplate: entryDeputy.division?.pairedUnitTemplate ?? null,
        activeVehicleId: emergencyVehicle?.id ?? null,
        userDefinedCallsign: isUserDefinedCallsignEnabled ? data.userDefinedCallsign || null : null,
      },
    });

    const combinedUnits = await Promise.all(
      data.ids.map(async ({ id: deputyId }, idx) => {
        await prisma.emsFdDeputy.update({
          where: { id: deputyId },
          data: { statusId: null },
        });

        return prisma.combinedEmsFdUnit.update({
          where: {
            id: combinedUnit.id,
          },
          data: {
            deputies: { connect: { id: deputyId } },
          },
          include: idx === data.ids.length - 1 ? combinedEmsFdUnitProperties : undefined,
        });
      }),
    );

    const last = combinedUnits[combinedUnits.length - 1];
    await this.socket.emitUpdateDeputyStatus();

    return last as APITypes.PostDispatchStatusMergeDeputies;
  }

  @Post("/merge/dot")
  @Description(
    "Merge DOT workers into a combined/merged unit via their ids. `entry: true` means it that worker will be the main unit.",
  )
  @UsePermissions({
    permissions: [Permissions.Dispatch, Permissions.Dot],
  })
  async mergeDotWorkers(
    @BodyParams() body: unknown,
    @Context("cad") cad: { features?: Record<Feature, boolean> },
  ): Promise<APITypes.PostDispatchStatusMergeDotWorkers> {
    const data = validateSchema(MERGE_UNIT_SCHEMA, body);

    const workers = await prisma.$transaction(
      data.ids.map((worker) => {
        return prisma.dotWorker.findFirst({
          where: {
            id: worker.id,
          },
        });
      }),
    );

    if (workers.includes(null)) {
      throw new BadRequest("dotWorkerNotFoundInArray");
    }

    const existing = workers.some((v) => v?.combinedDotUnitId);
    if (existing) {
      throw new BadRequest("dotWorkerAlreadyMerged");
    }

    const entryWorkerId = data.ids.find((v) => v.entry)?.id;
    if (!entryWorkerId) {
      throw new BadRequest("noEntryDotWorker");
    }

    const entryWorker = await prisma.dotWorker.findUnique({
      where: { id: entryWorkerId },
      include: { division: true },
    });

    if (!entryWorker) {
      throw new BadRequest("noEntryDotWorker");
    }

    const status = await prisma.statusValue.findFirst({
      where: {
        shouldDo: ShouldDoType.SET_ON_DUTY,
        whatPages: { isEmpty: true },
      },
      select: { id: true },
    });

    const emergencyVehicle = data.vehicleId
      ? await prisma.emergencyVehicleValue.findUnique({ where: { id: data.vehicleId } })
      : null;

    const isUserDefinedCallsignEnabled = isFeatureEnabled({
      defaultReturn: false,
      feature: Feature.USER_DEFINED_CALLSIGN_COMBINED_UNIT,
      features: cad.features,
    });

    if (isUserDefinedCallsignEnabled) {
      const existing = await prisma.combinedDotUnit.findFirst({
        where: { userDefinedCallsign: { equals: data.userDefinedCallsign, mode: "insensitive" } },
      });

      if (existing) {
        throw new BadRequest("userDefinedCallsignAlreadyExists");
      }
    }

    const nextInt = await findNextAvailableIncremental({ type: "combined-dot" });
    const combinedUnit = await prisma.combinedDotUnit.create({
      data: {
        statusId: status?.id ?? null,
        callsign: entryWorker.callsign,
        callsign2: entryWorker.callsign2,
        departmentId: entryWorker.departmentId,
        incremental: nextInt,
        pairedUnitTemplate: entryWorker.division?.pairedUnitTemplate ?? null,
        activeVehicleId: emergencyVehicle?.id ?? null,
        userDefinedCallsign: isUserDefinedCallsignEnabled ? data.userDefinedCallsign || null : null,
      },
    });

    const combinedUnits = await Promise.all(
      data.ids.map(async ({ id: workerId }, idx) => {
        await prisma.dotWorker.update({
          where: { id: workerId },
          data: { statusId: null },
        });

        return prisma.combinedDotUnit.update({
          where: {
            id: combinedUnit.id,
          },
          data: {
            workers: { connect: { id: workerId } },
          },
          include: idx === data.ids.length - 1 ? combinedDotUnitProperties : undefined,
        });
      }),
    );

    const last = combinedUnits[combinedUnits.length - 1];
    await this.socket.emitUpdateDotStatus();

    return last as APITypes.PostDispatchStatusMergeDotWorkers;
  }

  @Post("/unmerge/:id")
  @Description("Unmerge officers by the combinedUnitId")
  @UsePermissions({
    permissions: [Permissions.Dispatch, Permissions.Leo],
  })
  async unmergeOfficers(
    @PathParams("id") unitId: string,
  ): Promise<APITypes.PostDispatchStatusUnmergeUnitById> {
    let unit:
      | (CombinedLeoUnit & { officers: any[] })
      | (CombinedEmsFdUnit & { deputies: any[] })
      | (CombinedDotUnit & { workers: any[] })
      | null = await prisma.combinedLeoUnit.findFirst({
      where: { id: unitId },
      include: { officers: { select: { id: true } } },
    });

    if (!unit) {
      unit = await prisma.combinedEmsFdUnit.findFirst({
        where: { id: unitId },
        include: { deputies: { select: { id: true } } },
      });
    }

    if (!unit) {
      unit = await prisma.combinedDotUnit.findFirst({
        where: { id: unitId },
        include: { workers: { select: { id: true } } },
      });
    }

    if (!unit) {
      throw new NotFound("notFound");
    }

    const pageType =
      "officers" in unit ? WhatPages.LEO : "deputies" in unit ? WhatPages.EMS_FD : undefined;
    const onDutyStatusCode = await prisma.statusValue.findFirst({
      where: {
        shouldDo: ShouldDoType.SET_ON_DUTY,
        OR: pageType
          ? [{ whatPages: { isEmpty: true } }, { whatPages: { has: pageType } }]
          : [{ whatPages: { isEmpty: true } }],
      },
    });

    const statusId = onDutyStatusCode?.id ?? unit.statusId ?? undefined;

    const [nextCallId, nextIncidentId] = await Promise.all([
      getNextActive911CallId({
        callId: "null",
        type: "unassign",
        unit,
      }),
      getNextIncidentId({
        incidentId: "null",
        type: "unassign",
        unit,
      }),
    ]);

    const units = "officers" in unit ? unit.officers : "deputies" in unit ? unit.deputies : unit.workers;
    const prismaModelName =
      "officers" in unit ? "officer" : "deputies" in unit ? "emsFdDeputy" : "dotWorker";
    const combinedPrismaModelName =
      "officers" in unit
        ? "combinedLeoUnit"
        : "deputies" in unit
          ? "combinedEmsFdUnit"
          : "combinedDotUnit";
    const prismaKey =
      "officers" in unit ? "combinedLeoId" : "deputies" in unit ? "combinedEmsFdId" : "combinedDotId";

    await prisma.$transaction(
      units.map(({ id }) => {
        // @ts-expect-error model name is dynamic
        return prisma[prismaModelName].update({
          where: { id },
          data: { statusId, activeCallId: nextCallId, activeIncidentId: nextIncidentId },
        });
      }),
    );

    await prisma.$transaction([
      prisma.assignedUnit.deleteMany({
        where: { [prismaKey]: unitId },
      }),
      prisma.incidentInvolvedUnit.deleteMany({
        where: { [prismaKey]: unitId },
      }),
      // @ts-expect-error model name is dynamic
      prisma[combinedPrismaModelName].delete({
        where: { id: unitId },
      }),
    ]);

    await this.socket.emitUpdateOfficerStatus();
    await this.socket.emitUpdateDeputyStatus();
    await this.socket.emitUpdateDotStatus();

    return true;
  }
}
