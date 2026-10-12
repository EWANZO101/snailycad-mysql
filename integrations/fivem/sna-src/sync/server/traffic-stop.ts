/**
 * /sn-traffic-stop <description>: a 911 call at the player's position with their unit as primary.
 * The client only sends its position, and only for a stop the server asked about.
 */
import { cadRequest, type PlayerAuth } from "../../lib/cad.server";
import { ClientEvents, ServerEvents, SnCommands } from "../../lib/events";
import { postalFor } from "../../lib/postal.server";
import { chat, explainPlayerError, getPlayerUser } from "../../lib/player.server";
import { netSource } from "./common";

interface PendingStop {
  unitId: string;
  name: string;
  description: string;
  auth: PlayerAuth;
  expiresAt: number;
}

const pending = new Map<number, PendingStop>();

RegisterCommand(
  SnCommands.TrafficStop,
  async (source: number, args: string[]) => {
    const player = Number(source);
    if (player <= 0) return;

    const description = args.join(" ").trim().slice(0, 2000);
    if (!description) {
      chat(player, "Must provide a description for the traffic stop.");
      return;
    }

    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit) return;

    const name = GetPlayerName(player);
    pending.set(player, {
      unitId: result.user.unit.id,
      name,
      description,
      auth: result.auth,
      expiresAt: Date.now() + 30_000,
    });
    emitNet(ClientEvents.RequestTrafficStopFlow, player, {
      unitId: result.user.unit.id,
      source: player,
      name,
      description: args,
    });
  },
  false,
);

onNet(ServerEvents.OnTrafficStopClientPosition, async (data: unknown) => {
  const player = netSource();
  if (!player) return;
  const stop = pending.get(player);
  pending.delete(player);
  if (!stop || stop.expiresAt < Date.now()) return;

  const body = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
  const position = (body.position ?? {}) as Record<string, unknown>;
  const [x, y, z] = [position.x, position.y, position.z].map(Number) as [number, number, number];
  if (![x, y, z].every(Number.isFinite)) return;
  const heading = Number.isFinite(Number(position.heading)) ? Number(position.heading) : 0;
  const street = typeof body.streetName === "string" ? body.streetName.slice(0, 255) : "";

  const call = await cadRequest<{ id?: string; caseNumber?: number }>({
    method: "POST",
    path: "/911-calls",
    isFromDispatch: false,
    auth: stop.auth,
    quiet: true,
    data: {
      name: stop.name,
      location: street,
      description: stop.description,
      postal: postalFor({ x, y }),
      gtaMapPosition: { x, y, z, heading },
      assignedUnits: [{ id: stop.unitId, isPrimary: true }],
    },
  });

  if (!call.ok || !call.data?.id) {
    chat(
      player,
      call.ok ? "An error occurred while creating the traffic stop." : explainPlayerError(call),
    );
    return;
  }

  chat(
    player,
    `Successfully created a traffic stop call and assigned you to the call with the case number: ^5#${call.data.caseNumber}^7.`,
  );
});

on("playerDropped", () => {
  pending.delete(Number(globalThis.source));
});
