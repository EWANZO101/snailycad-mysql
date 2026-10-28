import {
  type User,
  ShouldDoType,
  type MiscCadSettings,
  type cad,
  WhitelistStatus,
  Feature,
  type DivisionValue,
} from "@prisma/client";
import { UPDATE_OFFICER_STATUS_SCHEMA } from "@snailycad/schemas";
import { Req, UseBeforeEach } from "@tsed/common";
import { Controller } from "@tsed/di";
import { BadRequest, NotFound } from "@tsed/exceptions";
import { BodyParams, Context, PathParams } from "@tsed/platform-params";
import { ContentType, Description, Put, Tags } from "@tsed/schema";
import { prisma } from "lib/data/prisma";
import { Socket } from "services/socket-service";
import { IsAuth } from "middlewares/auth/is-auth";
import { validateSchema } from "lib/data/validate-schema";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findUnit } from "lib/leo/findUnit";
import { defaultPermissions, hasPermission } from "@snailycad/permissions";
import type * as APITypes from "@snailycad/types/api";
import { applyUnitStatus } from "lib/dispatch/apply-unit-status";
import { ExtendedNotFound } from "~/exceptions/extended-not-found";
import { isFeatureEnabled } from "lib/upsert-cad";
import { handlePanicButtonPressed } from "lib/leo/send-panic-button-webhook";
import { leoProperties, unitProperties, dotWorkerProperties } from "utils/leo/includes";

@Tags("Dispatch")
@Controller("/dispatch/status")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class StatusController {
  private socket: Socket;
  constructor(socket: Socket) {
    this.socket = socket;
  }

  @Put("/:unitId")
  @Description("Update the status of a unit by its id.")
  @UsePermissions({
    permissions: [Permissions.Dispatch, Permissions.Leo, Permissions.EmsFd, Permissions.Dot],
  })
  async updateUnitStatus(
    @PathParams("unitId") unitId: string,
    @Context("user") user: User,
    @BodyParams() body: unknown,
    @Req() req: Req,
    @Context("cad")
    cad: cad & { features?: Record<Feature, boolean>; miscCadSettings: MiscCadSettings },
  ): Promise<APITypes.PutDispatchStatusByUnitId> {
    const data = validateSchema(UPDATE_OFFICER_STATUS_SCHEMA, body);
    const bodyStatusId = data.status;

    const isFromDispatch = req.headers["is-from-dispatch"]?.toString() === "true";
    const isAdmin = hasPermission({
      userToCheck: user,
      permissionsToCheck: defaultPermissions.allDefaultAdminPermissions,
    });
    const isDispatch =
      isAdmin ||
      (isFromDispatch &&
        hasPermission({
          userToCheck: user,
          permissionsToCheck: [Permissions.Dispatch],
        }));

    const isDivisionsEnabled = isFeatureEnabled({
      defaultReturn: true,
      feature: Feature.DIVISIONS,
      features: cad.features,
    });

    const unit = await findUnit(
      unitId,
      { userId: isDispatch ? undefined : user.id },
      { officer: { divisions: true } },
    );

    if (!unit.unit) {
      throw new NotFound("unitNotFound");
    }

    if ("suspended" in unit && unit.suspended) {
      throw new BadRequest("unitSuspended");
    }

    const code = await prisma.statusValue.findFirst({
      where: { id: bodyStatusId },
      include: { value: true },
    });

    let userDefinedCallsign: string | undefined;
    if (data.userDefinedCallsign && code?.shouldDo === ShouldDoType.SET_ON_DUTY) {
      const canSetUserDefinedCallsign = hasPermission({
        permissionsToCheck: [
          Permissions.SetUserDefinedCallsignOnEmsFd,
          Permissions.SetUserDefinedCallsignOnOfficer,
          Permissions.SetUserDefinedCallsignOnDot,
        ],
        userToCheck: user,
      });

      if (!canSetUserDefinedCallsign) {
        throw new BadRequest("cannotSetUserDefinedCallsign");
      }

      const [existingOfficer, existingDeputy, existingDotWorker] = await prisma.$transaction([
        prisma.officer.findFirst({
          where: { userDefinedCallsign: { equals: data.userDefinedCallsign, mode: "insensitive" } },
        }),
        prisma.emsFdDeputy.findFirst({
          where: { userDefinedCallsign: { equals: data.userDefinedCallsign, mode: "insensitive" } },
        }),
        prisma.dotWorker.findFirst({
          where: { userDefinedCallsign: { equals: data.userDefinedCallsign, mode: "insensitive" } },
        }),
      ]);

      if (existingOfficer || existingDeputy || existingDotWorker) {
        throw new BadRequest("callsignAlreadyTaken");
      }

      userDefinedCallsign = data.userDefinedCallsign;
    }

    let activeEmergencyVehicleId: string | undefined | null;
    if (data.vehicleId && code?.shouldDo === ShouldDoType.SET_ON_DUTY) {
      const divisionIds = getDivisionsFromUnit(unit, isDivisionsEnabled);

      const _emergencyVehicle = await prisma.emergencyVehicleValue.findFirst({
        where: {
          id: data.vehicleId,
          OR: [
            ...divisionIds.map((id: string) => ({ divisions: { some: { id } } })),
            unit.unit.departmentId ? { departments: { some: { id: unit.unit.departmentId } } } : {},
          ],
        },
      });

      if (!_emergencyVehicle) {
        throw new ExtendedNotFound({ vehicleId: "vehicleNotPartOfYourDepartment" });
      }

      activeEmergencyVehicleId = _emergencyVehicle.id;
    } else if (code?.shouldDo === ShouldDoType.SET_OFF_DUTY) {
      activeEmergencyVehicleId = null;
    }

    /**
     * officer's status cannot be changed when in a combined unit
     * -> the combined unit's status must be updated.
     */
    if (unit.type === "leo" && !isDispatch) {
      const hasCombinedUnit = await prisma.combinedLeoUnit.findFirst({
        where: {
          officers: { some: { id: unit.unit.id } },
        },
      });

      if (hasCombinedUnit) {
        throw new BadRequest("officerIsCombined");
      }
    }

    if (unit.type === "ems-fd" && !isDispatch) {
      const hasCombinedUnit = await prisma.combinedEmsFdUnit.findFirst({
        where: {
          deputies: { some: { id: unit.unit.id } },
        },
      });

      if (hasCombinedUnit) {
        throw new BadRequest("emsFdDeputyIsCombined");
      }
    }

    if (unit.type === "dot" && !isDispatch) {
      const hasCombinedUnit = await prisma.combinedDotUnit.findFirst({
        where: {
          workers: { some: { id: unit.unit.id } },
        },
      });

      if (hasCombinedUnit) {
        throw new BadRequest("dotWorkerIsCombined");
      }
    }

    if (!code) {
      throw new NotFound("statusNotFound");
    }

    if (unit.type === "leo") {
      const officer = await prisma.officer.findUnique({
        where: { id: unit.unit.id },
        include: leoProperties,
      });

      const isOfficerDisabled = officer?.whitelistStatus
        ? officer.whitelistStatus.status !== WhitelistStatus.ACCEPTED &&
          !officer.department?.isDefaultDepartment
        : false;

      if (isOfficerDisabled) {
        throw new BadRequest("cannotUseThisOfficer");
      }

      await handlePanicButtonPressed({
        locale: user.locale,
        socket: this.socket,
        cad,
        status: code,
        unit: officer!,
      });
    }

    if (
      unit.type === "combined-leo" ||
      unit.type === "combined-ems-fd" ||
      unit.type === "combined-dot"
    ) {
      await handlePanicButtonPressed({
        locale: user.locale,
        socket: this.socket,
        cad,
        status: code,
        unit: unit.unit,
      });
    } else if (unit.type === "ems-fd") {
      const fullDeputy = await prisma.emsFdDeputy.findUnique({
        where: { id: unit.unit.id },
        include: unitProperties,
      });

      await handlePanicButtonPressed({
        locale: user.locale,
        socket: this.socket,
        cad,
        status: code,
        unit: fullDeputy!,
      });
    } else if (unit.type === "dot") {
      const fullDotWorker = await prisma.dotWorker.findUnique({
        where: { id: unit.unit.id },
        include: dotWorkerProperties,
      });

      await handlePanicButtonPressed({
        locale: user.locale,
        socket: this.socket,
        cad,
        status: code,
        unit: fullDotWorker!,
      });
    }

    const updatedUnit = await applyUnitStatus({
      unit,
      code,
      isDispatch,
      userId: user.id,
      locale: user.locale,
      userDefinedCallsign,
      activeEmergencyVehicleId,
      socket: this.socket,
      cad,
    });

    // @ts-expect-error unit.type mismatch. the types are correct.
    return updatedUnit;
  }
}

function getDivisionsFromUnit(
  unit: Awaited<ReturnType<typeof findUnit>>,
  isDivisionsFeatureEnabled: boolean,
) {
  if (!isDivisionsFeatureEnabled || !unit.unit) {
    return [];
  }

  if (unit.type === "leo") {
    return unit.unit.divisions.map((v: DivisionValue) => v.id);
  }

  if (unit.type === "ems-fd" && unit.unit.divisionId) {
    return [unit.unit.divisionId];
  }

  if (unit.type === "dot" && unit.unit.divisionId) {
    return [unit.unit.divisionId];
  }

  return [];
}
