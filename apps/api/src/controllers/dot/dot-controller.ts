import { Controller, UseBeforeEach, Use, UseAfter, Req } from "@tsed/common";
import { ContentType, Delete, Description, Get, Post, Put, Tags } from "@tsed/schema";
import { QueryParams, BodyParams, Context, PathParams } from "@tsed/platform-params";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { prisma } from "lib/data/prisma";
import {
  type cad as DBCad,
  type MiscCadSettings,
  ShouldDoType,
  type User,
  Feature,
} from "@prisma/client";
import { DotWorker } from "@snailycad/types";
import { UPDATE_OFFICER_STATUS_SCHEMA } from "@snailycad/schemas";
import { IsAuth } from "middlewares/auth/is-auth";
import { ActiveDotWorker } from "middlewares/active-dot-worker";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { getInactivityFilter } from "lib/leo/utils";
import { findNextAvailableIncremental } from "lib/leo/findNextAvailableIncremental";
import { handleStartEndOfficerLog } from "lib/leo/handleStartEndOfficerLog";
import type * as APITypes from "@snailycad/types/api";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { HandleInactivity } from "middlewares/handle-inactivity";
import { upsertDotWorker } from "lib/dot/upsert-dot-worker";
import { defaultPermissions, hasPermission } from "@snailycad/permissions";
import { dotWorkerProperties, combinedDotUnitProperties } from "utils/leo/includes";
import { createWhere } from "../leo/create-where-obj";
import { insensitive } from "lib/data/db-provider";
import { validateSchema } from "lib/data/validate-schema";
import { ExtendedNotFound } from "~/exceptions/extended-not-found";
import { Socket } from "services/socket-service";

@Tags("DOT")
@Controller("/dot")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
@IsFeatureEnabled({ feature: Feature.DOT })
export class DotController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  @Get("/")
  @UsePermissions({
    permissions: [Permissions.Dot],
  })
  async getUserDotWorkers(
    @Context("user") user: User,
    @QueryParams("query") query: string,
  ): Promise<APITypes.GetMyDotWorkersData> {
    const where = createWhere({
      query,
      type: "DOT_WORKER",
      pendingOnly: false,
      extraWhere: {
        userId: user.id,
      },
    });

    const workers = await prisma.dotWorker.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        ...dotWorkerProperties,
        qualifications: { include: { qualification: { include: { value: true } } } },
      },
    });

    return { workers };
  }

  @Get("/logs")
  @UsePermissions({
    permissions: [Permissions.Dot, Permissions.ViewUnits, Permissions.ManageUnits],
  })
  async getDotWorkerLogs(
    @Context("user") user: User,
    @QueryParams("skip", Number) skip = 0,
    @QueryParams("includeAll", Boolean) includeAll = false,
    @QueryParams("dotWorkerId", String) dotWorkerId?: string,
    @QueryParams("currentUserOnly", Boolean) currentUserOnly?: boolean,
  ): Promise<APITypes.GetMyDotWorkersLogsData> {
    const hasManageUnitsPermissions = hasPermission({
      permissionsToCheck: [Permissions.ManageUnits, Permissions.ViewUnits, Permissions.DeleteUnits],
      userToCheck: user,
    });
    const userIdObj = hasManageUnitsPermissions && !currentUserOnly ? {} : { userId: user.id };

    const where = {
      ...userIdObj,
      officerId: null,
      emsFdDeputyId: null,
      dotWorkerId: dotWorkerId || undefined,
    };

    const [totalCount, logs] = await prisma.$transaction([
      prisma.officerLog.count({ where }),
      prisma.officerLog.findMany({
        take: includeAll ? undefined : 25,
        skip: includeAll ? undefined : skip,
        where,
        include: { dotWorker: { include: dotWorkerProperties } },
        orderBy: { startedAt: "desc" },
      }),
    ]);

    return { totalCount, logs };
  }

  @Post("/")
  @UsePermissions({
    permissions: [Permissions.Dot],
  })
  async createDotWorker(
    @BodyParams() body: unknown,
    @Context("user") user: User,
    @Context("cad")
    cad: DBCad & { features?: Record<Feature, boolean>; miscCadSettings: MiscCadSettings },
  ): Promise<APITypes.PostMyDotWorkersData> {
    const worker = await upsertDotWorker({
      body,
      user,
      cad,
      existingWorker: null,
    });

    return worker;
  }

  @Put("/:id")
  @UsePermissions({
    permissions: [Permissions.Dot],
  })
  async updateDotWorker(
    @PathParams("id") workerId: string,
    @BodyParams() body: unknown,
    @Context("user") user: User,
    @Context("cad")
    cad: DBCad & { features?: Record<Feature, boolean>; miscCadSettings: MiscCadSettings },
  ): Promise<APITypes.PutMyDotWorkerByIdData> {
    const existingWorker = await prisma.dotWorker.findFirst({
      where: { id: workerId, userId: user.id },
    });

    const updatedWorker = await upsertDotWorker({
      body,
      user,
      cad,
      existingWorker,
    });

    return updatedWorker;
  }

  @Delete("/:id")
  @UsePermissions({
    permissions: [Permissions.Dot],
  })
  async deleteDotWorker(
    @PathParams("id") id: string,
    @Context("user") user: User,
  ): Promise<APITypes.DeleteMyDotWorkerByIdData> {
    const worker = await prisma.dotWorker.findFirst({
      where: {
        userId: user.id,
        id,
      },
    });

    if (!worker) {
      throw new NotFound("dotWorkerNotFound");
    }

    await prisma.dotWorker.delete({
      where: {
        id: worker.id,
      },
    });

    return true;
  }

  /**
   * sets a DOT worker's duty status, vehicle and user-defined callsign. Deliberately standalone
   * (not routed through the shared `/dispatch/status/:unitId` + `findUnit`/`applyUnitStatus`
   * machinery): those are consumed by many unrelated features (911 calls, incidents, warrants,
   * combined units, panic button) that would all need a DOT branch to stay type-safe. This
   * covers what DOT needs today — on/off duty, a vehicle, an officer-log — without that blast
   * radius. Combined DOT units and panic button aren't supported yet.
   */
  @Put("/status/:id")
  @Description("Update a DOT worker's duty status, vehicle and user-defined callsign")
  @UsePermissions({
    permissions: [Permissions.Dot, Permissions.Dispatch],
  })
  async updateDotWorkerStatus(
    @PathParams("id") workerId: string,
    @Context("user") user: User,
    @Req() req: Req,
    @BodyParams() body: unknown,
  ): Promise<APITypes.PutDotWorkerStatusByIdData> {
    const data = validateSchema(UPDATE_OFFICER_STATUS_SCHEMA, body);

    const isFromDispatch = req.headers["is-from-dispatch"]?.toString() === "true";
    const isAdmin = hasPermission({
      userToCheck: user,
      permissionsToCheck: defaultPermissions.allDefaultAdminPermissions,
    });
    const isDispatch =
      isAdmin ||
      (isFromDispatch &&
        hasPermission({ userToCheck: user, permissionsToCheck: [Permissions.Dispatch] }));

    const worker = await prisma.dotWorker.findFirst({
      where: { id: workerId, userId: isDispatch ? undefined : user.id },
    });
    if (!worker) throw new NotFound("dotWorkerNotFound");
    if (worker.suspended) throw new BadRequest("unitSuspended");

    const code = await prisma.statusValue.findFirst({
      where: { id: data.status },
      include: { value: true },
    });
    if (!code) throw new NotFound("statusNotFound");

    let userDefinedCallsign: string | undefined;
    if (data.userDefinedCallsign && code.shouldDo === ShouldDoType.SET_ON_DUTY) {
      const canSetUserDefinedCallsign = hasPermission({
        permissionsToCheck: [Permissions.SetUserDefinedCallsignOnDot],
        userToCheck: user,
      });
      if (!canSetUserDefinedCallsign) throw new BadRequest("cannotSetUserDefinedCallsign");

      const existing = await prisma.dotWorker.findFirst({
        where: { userDefinedCallsign: { equals: data.userDefinedCallsign, ...insensitive() } },
      });
      if (existing) throw new BadRequest("callsignAlreadyTaken");

      userDefinedCallsign = data.userDefinedCallsign;
    }

    let activeVehicleId: string | undefined | null;
    if (data.vehicleId && code.shouldDo === ShouldDoType.SET_ON_DUTY) {
      const vehicle = await prisma.emergencyVehicleValue.findFirst({
        where: {
          id: data.vehicleId,
          OR: [
            ...(worker.divisionId ? [{ divisions: { some: { id: worker.divisionId } } }] : []),
            worker.departmentId ? { departments: { some: { id: worker.departmentId } } } : {},
          ],
        },
      });
      if (!vehicle) throw new ExtendedNotFound({ vehicleId: "vehicleNotPartOfYourDepartment" });
      activeVehicleId = vehicle.id;
    } else if (code.shouldDo === ShouldDoType.SET_OFF_DUTY) {
      activeVehicleId = null;
    }

    // reset the user's other DOT workers (never without a user filter: that would reset everyone)
    if (!isDispatch && worker.userId) {
      await prisma.dotWorker.updateMany({
        where: { userId: worker.userId },
        data: { statusId: null, activeCallId: null, activeIncidentId: null },
      });
    }

    const statusId = code.shouldDo === ShouldDoType.SET_OFF_DUTY ? null : code.id;
    const incremental =
      code.shouldDo === ShouldDoType.SET_ON_DUTY && !worker.incremental
        ? await findNextAvailableIncremental({ type: "dot" })
        : undefined;

    const updatedWorker = await prisma.dotWorker.update({
      where: { id: worker.id },
      data: { userDefinedCallsign, activeVehicleId, statusId, incremental },
      include: dotWorkerProperties,
    });

    await handleStartEndOfficerLog({
      unit: updatedWorker,
      shouldDo: code.shouldDo,
      socket: this.socket,
      userId: user.id,
      type: "dot",
    });

    if (code.shouldDo === ShouldDoType.SET_OFF_DUTY) {
      this.socket.emitSetUnitOffDuty(updatedWorker.id);
      await prisma.dispatchChat.deleteMany({ where: { unitId: updatedWorker.id } });
    }

    this.socket.emitUpdateUnitStatus(updatedWorker);

    return updatedWorker;
  }

  @Use(ActiveDotWorker)
  @Get("/active-dot-worker")
  @UsePermissions({
    permissions: [Permissions.Dot, Permissions.Leo, Permissions.EmsFd, Permissions.Dispatch],
  })
  async getActiveDotWorker(
    @Context("activeDotWorker") activeDotWorker: DotWorker,
  ): Promise<APITypes.GetDotActiveWorker> {
    return activeDotWorker;
  }

  @Get("/active-dot-workers")
  @Description("Get all the active DOT workers")
  @UsePermissions({
    permissions: [Permissions.Dot, Permissions.Leo, Permissions.EmsFd, Permissions.Dispatch],
  })
  @UseAfter(HandleInactivity)
  async getActiveDotWorkers(
    @Context("cad") cad: { miscCadSettings: MiscCadSettings },
    @Context("user") user: User,
    @QueryParams("includeAll", Boolean) includeAll = false,
    @QueryParams("skip", Number) skip = 0,
    @QueryParams("query", String) query?: string,
  ): Promise<APITypes.GetDotActiveWorkers> {
    const unitsInactivityFilter = getInactivityFilter(cad, "unitInactivityTimeout");

    const activeDispatcher = await prisma.activeDispatchers.findFirst({
      where: { userId: user.id },
      select: { departmentId: true },
    });

    const dotWhere = query ? activeDotWorkersWhereInput(query) : undefined;
    const [workers, combinedDotUnits] = await prisma.$transaction([
      prisma.dotWorker.findMany({
        orderBy: { updatedAt: "desc" },
        take: includeAll ? undefined : 12,
        skip: includeAll ? undefined : skip,
        where: {
          status: { NOT: { shouldDo: ShouldDoType.SET_OFF_DUTY } },
          departmentId: activeDispatcher?.departmentId || undefined,
          ...(unitsInactivityFilter?.filter ?? {}),
          ...(dotWhere ?? {}),
        },
        include: dotWorkerProperties,
      }),
      prisma.combinedDotUnit.findMany({
        include: combinedDotUnitProperties,
        orderBy: { updatedAt: "desc" },
        where: {
          ...unitsInactivityFilter?.filter,
          departmentId: activeDispatcher?.departmentId || undefined,
        },
      }),
    ]);

    return [...combinedDotUnits, ...workers];
  }
}

function activeDotWorkersWhereInput(query: string) {
  const [name, surname] = query.toString().toLowerCase().split(/ +/g);

  return {
    OR: [
      { callsign: { contains: query, ...insensitive() } },
      { callsign2: { contains: query, ...insensitive() } },
      { division: { value: { value: { contains: query, ...insensitive() } } } },
      { department: { value: { value: { contains: query, ...insensitive() } } } },
      { badgeNumberString: { contains: query, ...insensitive() } },
      { rank: { value: { contains: query, ...insensitive() } } },
      { activeVehicle: { value: { value: { contains: query, ...insensitive() } } } },
      { radioChannelId: { contains: query, ...insensitive() } },
      {
        status: {
          AND: [
            { value: { value: { contains: query, ...insensitive() } } },
            { NOT: { shouldDo: ShouldDoType.SET_OFF_DUTY } },
          ],
        },
      },
      {
        citizen: {
          OR: [
            {
              name: { contains: name, ...insensitive() },
              surname: { contains: surname, ...insensitive() },
            },
            {
              name: { contains: surname, ...insensitive() },
              surname: { contains: name, ...insensitive() },
            },
          ],
        },
      },
    ],
  };
}
