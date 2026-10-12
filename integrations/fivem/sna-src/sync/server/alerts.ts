/**
 * Live alerts from the CAD: new 911 calls and panic buttons (on-duty units only), Signal 100 and
 * area of play changes (everyone).
 *
 * 0.14.3 opened this socket in every player's NUI and asked the server about each event. Now the
 * game server holds one connection and nothing about the CAD reaches the client.
 */
import { io, type Socket } from "socket.io-client";
import { getConnection, getEdition, log, warn } from "../../lib/config.server";
import { ClientEvents, SnCommands, type NotificationData } from "../../lib/events";
import { getPlayerUser, isOnDuty } from "../../lib/player.server";

const DUTY_CACHE_MS = 60_000;
const dutyCache = new Map<number, { onDuty: boolean; at: number }>();

export function forgetDuty(player: number) {
  dutyCache.delete(player);
}

async function playerIsOnDuty(player: number) {
  const cached = dutyCache.get(player);
  if (cached && Date.now() - cached.at < DUTY_CACHE_MS) return cached.onDuty;

  const result = await getPlayerUser(player, { silent: true });
  const onDuty = isOnDuty(result?.user);
  dutyCache.set(player, { onDuty, at: Date.now() });
  return onDuty;
}

function notify(player: number | -1, data: NotificationData) {
  emitNet(ClientEvents.CreateNotification, player, data);
}

async function notifyOnDuty(data: NotificationData) {
  const players = getPlayers().map(Number);
  // a few at a time, so a busy server doesn't fire every lookup at once
  for (let i = 0; i < players.length; i += 8) {
    await Promise.all(
      players.slice(i, i + 8).map(async (player) => {
        if (await playerIsOnDuty(player)) notify(player, data);
      }),
    );
  }
}

let socket: Socket | null = null;
let socketUrl = "";

async function connect() {
  const { url } = getConnection(await getEdition());
  const base = url.replace(/\/v1$/, "");
  if (!base || base === socketUrl) return;

  socket?.disconnect();
  socketUrl = base;
  let reportedError = false;

  socket = io(base, { transports: ["websocket"], reconnectionDelayMax: 30_000 });
  socket.on("connect", () => {
    reportedError = false;
    log(`connected to SnailyCAD live updates (${base})`);
  });
  socket.on("connect_error", (error: Error) => {
    if (reportedError) return;
    reportedError = true;
    warn(`could not connect to SnailyCAD live updates at ${base}: ${error.message} (retrying)`);
  });

  socket.on("Create911Call", (call: { caseNumber?: number } | null) => {
    if (!call?.caseNumber) return;
    void notifyOnDuty({
      title: "Incoming 911 Call",
      message: `A new 911 call has been created with case number: #${call.caseNumber}. To assign yourself to the call, use /${SnCommands.AttachTo911Call} ${call.caseNumber}`,
      timeout: 15_000,
    });
  });

  socket.on("PANIC_BUTTON_ON", (unit: { formattedUnitData?: string } | null) => {
    void notifyOnDuty({
      title: "Panic Button Enabled",
      message: `${unit?.formattedUnitData || "A unit"} has pressed their panic button.`,
    });
  });

  socket.on("Signal100", (enabled: boolean) => {
    notify(-1, {
      title: enabled ? "Signal 100 Enabled" : "Signal 100 Disabled",
      message: enabled ? "Signal 100 is now enabled." : "Signal 100 is now disabled.",
    });
  });

  socket.on("UpdateAreaOfPlay", (areaOfPlay: string | null) => {
    notify(-1, {
      title: "AOP Changed",
      message: `Area of play has been updated to: ${areaOfPlay ?? "None"}`,
    });
  });
}

on("onResourceStart", (resourceName: string) => {
  if (resourceName !== GetCurrentResourceName()) return;
  if (GetConvar("snailycad_live_alerts", "true") === "false") return;

  void connect();
  // convars can change at runtime; reconnect if the CAD address does
  setInterval(() => void connect(), 60_000);
});

on("onResourceStop", (resourceName: string) => {
  if (resourceName === GetCurrentResourceName()) socket?.disconnect();
});
