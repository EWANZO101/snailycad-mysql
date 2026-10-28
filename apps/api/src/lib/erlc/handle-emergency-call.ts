import { CallSource, DepartmentType, Feature, type ErlcSettings, Prisma } from "@prisma/client";
import { CALL_911_SCHEMA } from "@snailycad/schemas";
import { prisma } from "~/lib/data/prisma";
import { createTowCall } from "~/lib/calls/create-tow-taxi-call";
import { create911Call } from "~/lib/dispatch/911-calls/create-911-call";
import { setCADFeatures } from "~/middlewares/auth/is-auth";
import type { Socket } from "~/services/socket-service";
import { parsePlayer, type ErlcEmergencyCallData, type ErlcPlayer } from "./client";
import { getTargetForTeam } from "./settings";

/** calls older than this are left alone (e.g. the ones already in the server when it's turned on) */
const MAX_CALL_AGE_SECONDS = 15 * 60;

export type HandleEmergencyCallResult =
  | { created: false; reason: "duplicate" | "ignoredTeam" | "tooOld" | "featureDisabled" | "noCad" }
  | { created: true; target: "CALL_911_LEO" | "CALL_911_EMS_FD" | "TOW"; callId: string };

function describeLocation(call: ErlcEmergencyCallData, caller: ErlcPlayer | null) {
  const location = caller?.Location;
  const street = [location?.BuildingNumber, location?.StreetName].filter(Boolean).join(" ");
  const postal = location?.PostalCode || null;
  if (street) return { location: postal ? `${street} (postal ${postal})` : street, postal };
  if (call.PositionDescriptor?.trim()) return { location: call.PositionDescriptor.trim(), postal };
  return { location: "Unknown location (ER:LC)", postal };
}

/**
 * turns an ER:LC emergency call into a CAD call, through the same helpers the CAD uses for its
 * own calls (so dispatch updates live, Discord webhooks fire and call approval applies).
 * `players` is the player list from the same poll, used for the caller's name and street.
 */
export async function handleErlcEmergencyCall(options: {
  settings: ErlcSettings;
  call: ErlcEmergencyCallData;
  players: ErlcPlayer[];
  socket: Socket;
}): Promise<HandleEmergencyCallResult> {
  const { call, socket } = options;
  const team = call.Team?.trim() || "Police";
  const target = getTargetForTeam(options.settings, team);
  if (target === "IGNORE") return { created: false, reason: "ignoredTeam" };
  if (Date.now() / 1000 - call.StartedAt > MAX_CALL_AGE_SECONDS) {
    return { created: false, reason: "tooOld" };
  }

  // every poll sees the same calls again; skip known ones without a (logged) unique error
  const known = await prisma.erlcEmergencyCall.findUnique({
    where: { callNumber_startedAt: { callNumber: call.CallNumber, startedAt: call.StartedAt } },
    select: { id: true },
  });
  if (known) return { created: false, reason: "duplicate" };

  const rawCad = await prisma.cad.findFirst({ include: { features: true, miscCadSettings: true } });
  if (!rawCad) return { created: false, reason: "noCad" };
  const cad = setCADFeatures(rawCad);
  const feature = target === "TOW" ? Feature.TOW : Feature.CALLS_911;
  if (cad.features[feature] === false) return { created: false, reason: "featureDisabled" };

  // claim the call first: the unique index makes the webhook and the poll racing a no-op
  let link;
  try {
    link = await prisma.erlcEmergencyCall.create({
      data: {
        callNumber: call.CallNumber,
        startedAt: call.StartedAt,
        team: team.slice(0, 64),
        callerId: call.Caller?.slice(0, 32) || null,
        target,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { created: false, reason: "duplicate" };
    }
    throw error;
  }

  const callerPlayer =
    options.players.find((player) => parsePlayer(player.Player)?.id === call.Caller) ?? null;
  const callerName = parsePlayer(callerPlayer?.Player)?.name || `Roblox user ${call.Caller ?? "?"}`;
  const { location, postal } = describeLocation(call, callerPlayer);
  const description = `${call.Description?.trim() || "Assistance requested"}\n\nER:LC call #${
    call.CallNumber
  } · ${team}`;

  try {
    if (target === "TOW") {
      const towCall = await createTowCall({
        socket,
        data: { location, postal, name: callerName.slice(0, 255), description },
      });
      await prisma.erlcEmergencyCall.update({
        where: { id: link.id },
        data: { towCallId: towCall.id },
      });
      return { created: true, target, callId: towCall.id };
    }

    const departments = await prisma.departmentValue.findMany({
      where: { type: target === "CALL_911_LEO" ? DepartmentType.LEO : DepartmentType.EMS_FD },
      select: { id: true },
    });

    const data = CALL_911_SCHEMA.parse({
      name: callerName.padEnd(2, "?").slice(0, 255),
      location,
      postal,
      description,
      departments: departments.map((department) => department.id),
    });

    const created = await create911Call({
      data,
      cad,
      user: null,
      isFromDispatch: false,
      source: CallSource.ERLC,
      socket,
      async onCreated(call911) {
        await prisma.call911Event.create({
          data: {
            call911Id: call911.id,
            description: `Created from ER:LC (call #${call.CallNumber}, team ${team})`,
          },
        });
      },
    });

    await prisma.erlcEmergencyCall.update({
      where: { id: link.id },
      data: { call911Id: created.id },
    });
    return { created: true, target, callId: created.id };
  } catch (error) {
    // try again on the next poll instead of keeping a link to nothing
    await prisma.erlcEmergencyCall.delete({ where: { id: link.id } }).catch(() => null);
    throw error;
  }
}
