import {
  type CombinedLeoUnit,
  DiscordWebhookType,
  type EmsFdDeputy,
  type Feature,
  type MiscCadSettings,
  type Officer,
  ShouldDoType,
  type StatusValue,
  type Value,
  type cad,
} from "@prisma/client";
import { prisma } from "lib/data/prisma";
import { sendDiscordWebhook, sendRawWebhook } from "lib/discord/webhooks";
import { createWebhookData } from "lib/dispatch/webhooks";
import { createCallEventOnStatusChange } from "lib/dispatch/createCallEventOnStatusChange";
import { handleStartEndOfficerLog } from "lib/leo/handleStartEndOfficerLog";
import { findNextAvailableIncremental } from "lib/leo/findNextAvailableIncremental";
import type { findUnit } from "lib/leo/findUnit";
import type { Socket } from "services/socket-service";
import {
  leoProperties,
  unitProperties,
  combinedUnitProperties,
  combinedEmsFdUnitProperties,
} from "utils/leo/includes";

type FoundUnit = Awaited<ReturnType<typeof findUnit>>;

export interface ApplyUnitStatusOptions {
  /** a unit from `findUnit` (unit.unit must not be null) */
  unit: FoundUnit;
  code: StatusValue & { value?: Value | null };
  /** dispatch / admins: the user's other units are left alone */
  isDispatch: boolean;
  /** the user the change is made for (resets their other units, officer logs) */
  userId: string | null;
  locale?: string | null;
  userDefinedCallsign?: string;
  activeEmergencyVehicleId?: string | null;
  socket: Socket;
  cad: cad & { features?: Record<Feature, boolean>; miscCadSettings: MiscCadSettings };
}

/**
 * Sets a unit's status and does everything that comes with it: officer logs, combined units,
 * live updates for dispatch (sockets) and the unit status webhooks. Used by the status
 * controller and by integrations (e.g. FiveM duty sync).
 */
export async function applyUnitStatus(options: ApplyUnitStatusOptions) {
  const { unit, code, isDispatch, userDefinedCallsign, activeEmergencyVehicleId, socket, cad } =
    options;
  if (!unit.unit) return null;

  // reset all units for user (never without a user: that would reset everyone's units)
  if (!isDispatch && options.userId) {
    if (unit.type === "leo") {
      await prisma.officer.updateMany({
        where: { userId: options.userId },
        data: { activeCallId: null, activeIncidentId: null, statusId: null },
      });
    } else if (unit.type === "ems-fd") {
      await prisma.emsFdDeputy.updateMany({
        where: { userId: options.userId },
        data: { statusId: null, activeCallId: null, activeIncidentId: null },
      });
    }
  }

  let updatedUnit: EmsFdDeputy | Officer | CombinedLeoUnit | null = null;
  const shouldFindIncremental =
    code.shouldDo === ShouldDoType.SET_ON_DUTY && !unit.unit.incremental;
  const statusId = code.shouldDo === ShouldDoType.SET_OFF_DUTY ? null : code.id;

  const incremental = shouldFindIncremental
    ? await findNextAvailableIncremental({ type: unit.type })
    : undefined;

  if (unit.type === "leo") {
    updatedUnit = await prisma.officer.update({
      where: { id: unit.unit.id },
      data: {
        userDefinedCallsign,
        activeVehicleId: activeEmergencyVehicleId,
        statusId,
        incremental,
      },
      include: leoProperties,
    });
  } else if (unit.type === "ems-fd") {
    updatedUnit = await prisma.emsFdDeputy.update({
      where: { id: unit.unit.id },
      data: {
        userDefinedCallsign,
        activeVehicleId: activeEmergencyVehicleId,
        statusId,
        incremental,
      },
      include: unitProperties,
    });
  } else if (unit.type === "combined-leo") {
    updatedUnit = await prisma.combinedLeoUnit.update({
      where: { id: unit.unit.id },
      data: {
        userDefinedCallsign,
        activeVehicleId: activeEmergencyVehicleId,
        statusId,
      },
      include: combinedUnitProperties,
    });
  } else {
    updatedUnit = await prisma.combinedEmsFdUnit.update({
      where: { id: unit.unit.id },
      data: {
        userDefinedCallsign,
        activeVehicleId: activeEmergencyVehicleId,
        statusId,
      },
      include: combinedEmsFdUnitProperties,
    });
  }

  if (updatedUnit?.activeCallId) {
    createCallEventOnStatusChange({
      unit: updatedUnit,
      status: code,
      socket,
    });
  }

  if (unit.type === "leo") {
    await handleStartEndOfficerLog({
      unit: unit.unit as Officer,
      shouldDo: code.shouldDo,
      socket,
      userId: options.userId,
      type: "leo",
    });
  } else if (unit.type === "ems-fd") {
    await handleStartEndOfficerLog({
      unit: unit.unit,
      shouldDo: code.shouldDo,
      socket,
      userId: options.userId,
      type: "ems-fd",
    });
  } else {
    if (code.shouldDo === ShouldDoType.SET_OFF_DUTY) {
      if (unit.type === "combined-ems-fd") {
        await prisma.combinedEmsFdUnit
          .delete({
            where: { id: unit.unit.id },
          })
          .catch(() => null);
      } else {
        await prisma.combinedLeoUnit
          .delete({
            where: { id: unit.unit.id },
          })
          .catch(() => null);
      }
    }
  }

  if (code.shouldDo === ShouldDoType.SET_OFF_DUTY) {
    socket.emitSetUnitOffDuty(unit.unit.id);

    await prisma.dispatchChat.deleteMany({
      where: { unitId: unit.unit.id },
    });
  }

  if (unit.type === "leo" || unit.type === "combined-leo") {
    await socket.emitUpdateOfficerStatus();
  } else {
    await socket.emitUpdateDeputyStatus();
  }

  socket.emitUpdateUnitStatus(updatedUnit);

  try {
    const data = await createWebhookData({
      cad,
      // @ts-expect-error unit.type mismatch. the types are correct.
      unit: updatedUnit,
      locale: options.locale,
    });
    await sendDiscordWebhook({ type: DiscordWebhookType.UNIT_STATUS, data });
    await sendRawWebhook({ type: DiscordWebhookType.UNIT_STATUS, data: updatedUnit });
  } catch (error) {
    console.error("Could not send Discord webhook.", error);
  }

  return updatedUnit;
}
