import type { OpsPhoneRequest, OpsPhoneSettings } from "@prisma/client";
import { prisma } from "~/lib/data/prisma";
import { callOpsPhone } from "./client";

/**
 * tells ops-phone (and the caller, by SMS) what happened to the CAD call their request created.
 *
 * everything here is fire-and-forget: it never throws, never blocks the CAD request that
 * triggered it, and only logs when ops-phone can't be reached.
 */

type BackChannelEvent = "accepted" | "closed";

const SENDERS = {
  CALL_911_LEO: "Dispatch",
  CALL_911_EMS_FD: "Dispatch",
  TOW: "Tow",
  TAXI: "Taxi",
} as Record<string, string | undefined>;

export function notifyOpsPhoneCall911(options: { callIds: string[]; event: BackChannelEvent }) {
  if (options.callIds.length <= 0) return;
  void run(async () => {
    const requests = await findRequests({ call911Id: { in: options.callIds } }, options.event);
    if (requests.length <= 0) return;

    const calls = await prisma.call911.findMany({
      where: { id: { in: requests.map((r) => r.call911Id!) } },
      select: { id: true, caseNumber: true },
    });
    const caseNumbers = new Map(calls.map((call) => [call.id, call.caseNumber]));

    await sendAll(requests, options.event, (request) => {
      const caseNumber = caseNumbers.get(request.call911Id!);
      const callText = caseNumber ? ` Call #${caseNumber}.` : "";
      return options.event === "accepted"
        ? `Dispatch: units are on the way.${callText}`
        : `Dispatch: your call has been closed.${callText}`;
    });
  });
}

export function notifyOpsPhoneTowTaxi(options: {
  kind: "tow" | "taxi";
  callId: string;
  event: BackChannelEvent;
}) {
  void run(async () => {
    const where =
      options.kind === "tow" ? { towCallId: options.callId } : { taxiCallId: options.callId };
    const requests = await findRequests(where, options.event);
    const label = options.kind === "tow" ? "Tow" : "Taxi";

    await sendAll(requests, options.event, () =>
      options.event === "accepted"
        ? `${label}: a driver accepted your request and is on the way.`
        : `${label}: your request has been closed.`,
    );
  });
}

/**
 * finds the linked requests that still need this update and marks them, so each request
 * gets "accepted" once (first assignment only) and "closed" once.
 */
async function findRequests(
  where: { call911Id?: { in: string[] }; towCallId?: string; taxiCallId?: string },
  event: BackChannelEvent,
) {
  const fromStatuses = event === "accepted" ? ["open"] : ["open", "accepted"];
  const candidates = await prisma.opsPhoneRequest.findMany({
    where: { ...where, status: { in: fromStatuses } },
  });

  const claimed: OpsPhoneRequest[] = [];
  for (const request of candidates) {
    // only the update that actually changes the row sends the message (no doubles on races)
    const result = await prisma.opsPhoneRequest.updateMany({
      where: { id: request.id, status: request.status },
      data: { status: event },
    });
    if (result.count > 0) claimed.push(request);
  }
  return claimed;
}

async function sendAll(
  requests: OpsPhoneRequest[],
  event: BackChannelEvent,
  message: (request: OpsPhoneRequest) => string,
) {
  if (requests.length <= 0) return;

  const settings = await prisma.opsPhoneSettings.findFirst();
  if (!settings?.enabled || !settings.apiUrl || !settings.apiKey) return;

  await Promise.all(
    requests.map(async (request) => {
      await patchStatus(settings, request, event);

      if (settings.sendSms && request.serviceNumber && request.callerNumber) {
        await send(settings, {
          method: "POST",
          path: "/messages",
          body: {
            from: request.serviceNumber,
            to: request.callerNumber,
            message: message(request),
            from_name: SENDERS[request.target] ?? "Dispatch",
          },
        });
      }
    }),
  );
}

async function patchStatus(settings: OpsPhoneSettings, request: OpsPhoneRequest, status: string) {
  await send(settings, {
    method: "PATCH",
    path: `/services/requests/${request.requestId}`,
    body: { status },
  });
}

async function send(settings: OpsPhoneSettings, options: Parameters<typeof callOpsPhone>[1]) {
  try {
    const response = await callOpsPhone(settings, options);
    if (response.status < 200 || response.status >= 300) {
      console.warn(
        `[ops-phone] ${options.method} ${options.path} returned ${response.status}: ${JSON.stringify(response.json)}`,
      );
    }
  } catch (error) {
    console.warn(
      `[ops-phone] ${options.method} ${options.path} failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

async function run(fn: () => Promise<void>) {
  try {
    await fn();
  } catch (error) {
    console.warn("[ops-phone] back-channel update failed", error);
  }
}
