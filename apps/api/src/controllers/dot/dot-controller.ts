import {
  Controller,
  UseBeforeEach,
  Use,
  MultipartFile,
  type PlatformMulterFile,
  UseAfter,
} from "@tsed/common";
import { ContentType, Delete, Description, Get, Post, Put, Tags } from "@tsed/schema";
import { DOT_PANIC_BUTTON_SCHEMA } from "@snailycad/schemas";
import { QueryParams, BodyParams, Context, PathParams } from "@tsed/platform-params";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { prisma } from "lib/data/prisma";
import {
  type cad as DBCad,
  type MiscCadSettings,
  ShouldDoType,
  type User,
  Feature,
  type Prisma,
} from "@prisma/client";
import { DotWorker } from "@snailycad/types";
import { type AllowedFileExtension, allowedFileExtensions } from "@snailycad/config";
import { IsAuth } from "middlewares/auth/is-auth";
import { ActiveDotWorker } from "middlewares/active-dot-worker";
import fs from "node:fs/promises";
import { ExtendedBadRequest } from "~/exceptions/extended-bad-request";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { getInactivityFilter } from "lib/leo/utils";
import { Socket } from "services/socket-service";
import type * as APITypes from "@snailycad/types/api";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { handlePanicButtonPressed } from "lib/leo/send-panic-button-webhook";
import generateBlurPlaceholder from "lib/images/generate-image-blur-data";
import { getImageWebPPath } from "lib/images/get-image-webp-path";
import { HandleInactivity } from "middlewares/handle-inactivity";
import { upsertDotWorker } from "lib/dot/upsert-dot-worker";
import { hasPermission } from "@snailycad/permissions";
import { dotWorkerProperties, combinedDotUnitProperties } from "utils/leo/includes";
import { createWhere } from "../leo/create-where-obj";
import { validateSchema } from "lib/data/validate-schema";

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
    const hasManageUnitsPermissions = hasManageUnitsPermission(user);
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

  @Post("/panic-button")
  @IsFeatureEnabled({ feature: Feature.PANIC_BUTTON })
  @Description("Set the panic button for a DOT worker by their id")
  @UsePermissions({
    permissions: [Permissions.Dot],
  })
  async panicButton(
    @Context("user") user: User,
    @Context("cad") cad: DBCad & { miscCadSettings: MiscCadSettings },
    @BodyParams() body: unknown,
  ): Promise<APITypes.PostDotTogglePanicButtonData> {
    const data = validateSchema(DOT_PANIC_BUTTON_SCHEMA, body);
    let panicType: "ON" | "OFF" =
      typeof data.isEnabled === "boolean" ? (data.isEnabled ? "ON" : "OFF") : "ON";

    let worker = await prisma.dotWorker.findFirst({
      where: {
        id: data.dotWorkerId,
        // @ts-expect-error `API_TOKEN` is a rank that gets appended in `IsAuth`
        userId: user.rank === "API_TOKEN" ? undefined : user.id,
      },
      include: dotWorkerProperties,
    });

    if (!worker) {
      throw new NotFound("dotWorkerNotFound");
    }

    const code = await prisma.statusValue.findFirst({
      where: {
        shouldDo: ShouldDoType.PANIC_BUTTON,
      },
    });

    if (!code) {
      throw new BadRequest("panicButtonCodeNotFound");
    }

    if (data.isEnabled) {
      if (code?.id === worker.statusId) {
        return worker;
      }

      worker = await prisma.dotWorker.update({
        where: { id: worker.id },
        data: { statusId: code.id },
        include: dotWorkerProperties,
      });
    } else {
      if (code) {
        if (worker.statusId === code?.id) {
          const onDutyCode = await prisma.statusValue.findFirst({
            where: {
              shouldDo: ShouldDoType.SET_ON_DUTY,
              whatPages: { isEmpty: true },
            },
          });

          if (!onDutyCode) {
            throw new BadRequest("mustHaveOnDutyCode");
          }

          panicType = "OFF";
          worker = await prisma.dotWorker.update({
            where: { id: worker.id },
            data: { statusId: onDutyCode?.id },
            include: dotWorkerProperties,
          });
        } else {
          worker = await prisma.dotWorker.update({
            where: { id: worker.id },
            data: { statusId: code.id },
            include: dotWorkerProperties,
          });
        }
      }
    }

    if (!worker) {
      throw new NotFound("dotWorkerNotFound");
    }

    await this.socket.emitUpdateDotStatus();
    handlePanicButtonPressed({
      locale: user.locale,
      force: panicType === "ON",
      cad,
      socket: this.socket,
      status: worker.status,
      unit: worker,
    });

    return worker;
  }

  @Post("/image/:id")
  @UsePermissions({
    permissions: [Permissions.Dot],
  })
  async uploadImageToDotWorker(
    @Context("user") user: User,
    @PathParams("id") workerId: string,
    @MultipartFile("image") file?: PlatformMulterFile,
  ): Promise<APITypes.PostMyDotWorkerByIdData> {
    try {
      const worker = await prisma.dotWorker.findFirst({
        where: {
          userId: user.id,
          id: workerId,
        },
      });

      if (!worker) {
        throw new NotFound("Not Found");
      }

      if (!file) {
        throw new ExtendedBadRequest({ file: "No file provided." });
      }

      if (!allowedFileExtensions.includes(file.mimetype as AllowedFileExtension)) {
        throw new BadRequest("invalidImageType");
      }

      const image = await getImageWebPPath({
        buffer: file.buffer,
        pathType: "units",
        id: `${worker.id}-${file.originalname.split(".")[0]}`,
      });

      const previousImage = worker.imageId
        ? `${process.cwd()}/public/units/${worker.imageId}`
        : undefined;

      if (previousImage) {
        await fs.rm(previousImage, { force: true });
      }

      const [data] = await Promise.all([
        prisma.dotWorker.update({
          where: { id: worker.id },
          data: {
            imageId: image.fileName,
            imageBlurData: await generateBlurPlaceholder(image),
          },
          select: { imageId: true },
        }),
        fs.writeFile(image.path, image.buffer),
      ]);

      return data;
    } catch {
      throw new BadRequest("errorUploadingImage");
    }
  }
}

function hasManageUnitsPermission(user: User) {
  return hasPermission({
    permissionsToCheck: [Permissions.ManageUnits, Permissions.ViewUnits, Permissions.DeleteUnits],
    userToCheck: user,
  });
}

function activeDotWorkersWhereInput(query: string) {
  const [name, surname] = query.toString().toLowerCase().split(/ +/g);

  return {
    OR: [
      { callsign: { contains: query, mode: "insensitive" } },
      { callsign2: { contains: query, mode: "insensitive" } },
      { division: { value: { value: { contains: query, mode: "insensitive" } } } },
      { department: { value: { value: { contains: query, mode: "insensitive" } } } },
      { badgeNumberString: { contains: query, mode: "insensitive" } },
      { rank: { value: { contains: query, mode: "insensitive" } } },
      { activeVehicle: { value: { value: { contains: query, mode: "insensitive" } } } },
      { radioChannelId: { contains: query, mode: "insensitive" } },
      {
        status: {
          AND: [
            { value: { value: { contains: query, mode: "insensitive" } } },
            { NOT: { shouldDo: ShouldDoType.SET_OFF_DUTY } },
          ],
        },
      },
      {
        citizen: {
          OR: [
            {
              name: { contains: name, mode: "insensitive" },
              surname: { contains: surname, mode: "insensitive" },
            },
            {
              name: { contains: surname, mode: "insensitive" },
              surname: { contains: name, mode: "insensitive" },
            },
          ],
        },
      },
    ],
  } satisfies Prisma.DotWorkerWhereInput;
}
