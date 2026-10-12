/**
 * /sn-call911, /sn-calltow and /sn-calltaxi: the command asks the caller's client for its
 * position, the client answers, and the server files the call with the CAD API token.
 *
 * The answer is matched to a request the server made (one pending request per player, 30 s), so a
 * client can't file calls without using the command or file them as someone else.
 */
import { cadRequest } from "./cad.server";
import { postalFor } from "./postal.server";
import { throttled } from "./player.server";

export interface ServiceCallOptions {
  command: string;
  toClient: string;
  toServer: string;
  response: string;
  path: "/911-calls" | "/tow" | "/taxi";
  /** extra fields for the CAD, as 0.14.3 sent them (911 calls: the map position) */
  extraData(position: CallerPosition | null): Record<string, unknown>;
}

export interface CallerPosition {
  x: number;
  y: number;
  z: number;
  heading?: number;
}

interface Pending {
  name: string;
  description: string;
  expiresAt: number;
}

const PENDING_FOR_MS = 30_000;

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function toPosition(value: unknown): CallerPosition | null {
  if (!value || typeof value !== "object") return null;
  const { x, y, z, heading } = value as Record<string, unknown>;
  if (![x, y, z].every((n) => typeof n === "number" && Number.isFinite(n))) return null;
  return {
    x: x as number,
    y: y as number,
    z: z as number,
    heading: typeof heading === "number" && Number.isFinite(heading) ? heading : undefined,
  };
}

export function registerServiceCall(options: ServiceCallOptions) {
  const pending = new Map<number, Pending>();

  RegisterCommand(
    options.command,
    (source: number, args: string[]) => {
      const player = Number(source);
      if (player <= 0) {
        console.log(`[${GetCurrentResourceName()}] /${options.command} is for players only`);
        return;
      }

      const description = cleanText(args.join(" "), 2000);
      pending.set(player, {
        name: GetPlayerName(player),
        description,
        expiresAt: Date.now() + PENDING_FOR_MS,
      });

      // 0.14.3 sent { source, name, description } with the description as an array of words
      emitNet(options.toClient, player, {
        source: player,
        name: GetPlayerName(player),
        description: args,
      });
    },
    false,
  );

  onNet(options.toServer, async (data: unknown) => {
    const player = Number(globalThis.source);
    const request = pending.get(player);
    pending.delete(player);
    if (!request || request.expiresAt < Date.now()) return;
    if (throttled(options.command, player, 5_000)) return;

    const body = (data && typeof data === "object" ? data : {}) as Record<string, unknown>;
    const position = toPosition(body.position);
    const street = cleanText(body.street, 255);

    const { ok, data: call } = await cadRequest<{ id?: string }>({
      path: options.path,
      method: "POST",
      data: {
        name: request.name,
        location: street,
        description: request.description,
        postal: position ? postalFor(position) : null,
        ...options.extraData(position),
      },
    });

    emitNet(options.response, player, ok && call?.id ? "success" : "failed");
  });

  on("playerDropped", () => {
    pending.delete(Number(globalThis.source));
  });
}
