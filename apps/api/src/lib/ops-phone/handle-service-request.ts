import { CallSource, DepartmentType, Feature, type OpsPhoneSettings, Prisma } from "@prisma/client";
import { CALL_911_SCHEMA } from "@snailycad/schemas";
import { z } from "zod";
import { prisma } from "~/lib/data/prisma";
import { createTaxiCall, createTowCall } from "~/lib/calls/create-tow-taxi-call";
import { create911Call } from "~/lib/dispatch/911-calls/create-911-call";
import { setCADFeatures } from "~/middlewares/auth/is-auth";
import type { Socket } from "~/services/socket-service";
import { getServiceMap, type OpsPhoneTarget } from "./settings";

/** `data` of the ops-phone `service.request` event (server/apps.lua -> CreateServiceRequest) */
export const OPS_PHONE_SERVICE_REQUEST = z.object({
  id: z.coerce.number().int().positive(),
  service: z.string().trim().min(1).max(64),
  number: z.coerce.string().trim().max(64).default(""),
  name: z.string().trim().max(255).nullish(),
  message: z.string().trim().max(2000).nullish(),
  x: z.coerce.number().finite().nullish(),
  y: z.coerce.number().finite().nullish(),
  z: z.coerce.number().finite().nullish(),
});
export type OpsPhoneServiceRequest = z.infer<typeof OPS_PHONE_SERVICE_REQUEST>;

export type HandleServiceRequestResult =
  | { ignored: true; reason: "duplicate" | "unmappedService" | "featureDisabled" | "noCad" }
  | {
      ignored: false;
      requestId: number;
      target: OpsPhoneTarget;
      callId: string;
      caseNumber?: number;
    };

const FEATURE_FOR_TARGET: Partial<Record<OpsPhoneTarget, Feature>> = {
  CALL_911_LEO: Feature.CALLS_911,
  CALL_911_EMS_FD: Feature.CALLS_911,
  TOW: Feature.TOW,
  TAXI: Feature.TAXI,
};

/**
 * turns an ops-phone service request into the matching CAD call, through the same helpers the
 * CAD uses for calls made in the CAD (so dispatch updates live and Discord webhooks fire).
 */
export async function handleOpsPhoneServiceRequest(options: {
  settings: OpsPhoneSettings;
  request: OpsPhoneServiceRequest;
  socket: Socket;
}): Promise<HandleServiceRequestResult> {
  const { request, socket } = options;
  const entry = getServiceMap(options.settings)[request.service];
  const target = entry?.target ?? "IGNORE";
  if (target === "IGNORE") return { ignored: true, reason: "unmappedService" };

  const rawCad = await prisma.cad.findFirst({ include: { features: true, miscCadSettings: true } });
  if (!rawCad) return { ignored: true, reason: "noCad" };
  const cad = setCADFeatures(rawCad);

  const feature = FEATURE_FOR_TARGET[target];
  if (feature && cad.features[feature] === false) {
    return { ignored: true, reason: "featureDisabled" };
  }

  // claim the request id first: the unique index makes duplicates (webhook retries) a no-op
  let link;
  try {
    link = await prisma.opsPhoneRequest.create({
      data: {
        requestId: request.id,
        service: request.service,
        serviceNumber: entry?.number || null,
        target,
        callerNumber: request.number,
        callerName: request.name || null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ignored: true, reason: "duplicate" };
    }
    throw error;
  }

  const callerName = request.name && request.name.length >= 2 ? request.name : "Unknown caller";
  const message = request.message || "Assistance requested";
  const description = `${message}\n\nCaller: ${callerName} (${request.number || "unknown number"}) · via ops-phone`;
  const hasPosition = typeof request.x === "number" && typeof request.y === "number";
  const location = hasPosition
    ? `GPS ${request.x!.toFixed(1)}, ${request.y!.toFixed(1)} (ops-phone)`
    : "Unknown location (ops-phone)";

  try {
    if (target === "CALL_911_LEO" || target === "CALL_911_EMS_FD") {
      const departments = await prisma.departmentValue.findMany({
        where: { type: target === "CALL_911_LEO" ? DepartmentType.LEO : DepartmentType.EMS_FD },
        select: { id: true },
      });

      const data = CALL_911_SCHEMA.parse({
        name: callerName.slice(0, 255),
        location,
        description,
        departments: departments.map((department) => department.id),
        gtaMapPosition: hasPosition
          ? { x: request.x, y: request.y, z: request.z ?? 0, heading: 0 }
          : undefined,
      });

      const call = await create911Call({
        data,
        cad,
        user: null,
        isFromDispatch: false,
        source: CallSource.OPS_PHONE,
        socket,
        async onCreated(call) {
          await prisma.call911Event.create({
            data: {
              call911Id: call.id,
              description: `Created from ops-phone (${request.service} request #${request.id}, caller ${callerName} ${request.number})`,
            },
          });
        },
      });

      await prisma.opsPhoneRequest.update({ where: { id: link.id }, data: { call911Id: call.id } });
      return {
        ignored: false,
        requestId: request.id,
        target,
        callId: call.id,
        caseNumber: call.caseNumber,
      };
    }

    if (target === "TOW") {
      const call = await createTowCall({
        socket,
        data: { location, name: callerName, description },
      });
      await prisma.opsPhoneRequest.update({ where: { id: link.id }, data: { towCallId: call.id } });
      return { ignored: false, requestId: request.id, target, callId: call.id };
    }

    const call = await createTaxiCall({
      socket,
      data: { location, name: callerName, description },
    });
    await prisma.opsPhoneRequest.update({ where: { id: link.id }, data: { taxiCallId: call.id } });
    return { ignored: false, requestId: request.id, target, callId: call.id };
  } catch (error) {
    // let ops-phone retry later instead of keeping a link to nothing
    await prisma.opsPhoneRequest.delete({ where: { id: link.id } }).catch(() => null);
    throw error;
  }
}
