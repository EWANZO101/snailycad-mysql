import type { Prisma } from "@prisma/client";
import { prisma } from "~/lib/data/prisma";
import { sendTowTaxiCallWebhook } from "~/lib/discord/extra-webhooks";
import type { Socket } from "~/services/socket-service";

const CITIZEN_SELECTS = {
  name: true,
  surname: true,
  id: true,
};

export const towIncludes = {
  assignedUnit: { select: CITIZEN_SELECTS },
  creator: { select: CITIZEN_SELECTS },
};

/**
 * creates a tow call, tells the connected clients and fires the Discord webhook.
 * used by the tow controller and by integrations (ops-phone).
 */
export async function createTowCall(options: {
  data: Prisma.TowCallUncheckedCreateInput;
  socket: Socket;
}) {
  const call = await prisma.towCall.create({
    data: options.data,
    include: towIncludes,
  });

  if (call.ended) {
    options.socket.emitTowCallEnd(call);
  } else {
    options.socket.emitTowCall(call);
    sendTowTaxiCallWebhook({ type: "tow", call });
  }

  return call;
}

/** creates a taxi call, tells the connected clients and fires the Discord webhook. */
export async function createTaxiCall(options: {
  data: Prisma.TaxiCallUncheckedCreateInput;
  socket: Socket;
}) {
  const call = await prisma.taxiCall.create({
    data: options.data,
    include: towIncludes,
  });

  options.socket.emitCreateTaxiCall(call);
  sendTowTaxiCallWebhook({ type: "taxi", call });

  return call;
}
