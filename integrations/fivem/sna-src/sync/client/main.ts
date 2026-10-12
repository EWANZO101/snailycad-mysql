/**
 * sna-sync client: opens the NUI screens the server asks for and passes the player's choices
 * back to the server. The client never sees a CAD token or address.
 */
import {
  ClientEvents,
  NuiEvents,
  ServerEvents,
  SnCommands,
  type FlowResult,
  type NotificationData,
} from "../../lib/events";
import { getPlayerLocation } from "../../lib/notification.client";

const suggestions: [string, string, { name: string; help: string }[]?][] = [
  [SnCommands.Auth, "Sign in to SnailyCAD to use its commands in-game."],
  [SnCommands.WhoAmI, "Shows the SnailyCAD account that is connected to the game."],
  [SnCommands.Logout, "Sign out of your SnailyCAD account in-game."],
  [SnCommands.ActiveUnit, "This will show your active unit's name and status."],
  [
    SnCommands.SetStatus,
    "This will open a menu and will allow you to select a status for your active unit.",
    [{ name: "status-code", help: "The status code you want to set (Optional)." }],
  ],
  [SnCommands.PanicButton, "Toggle the panic button state for your active unit."],
  [
    SnCommands.AttachTo911Call,
    "Attach your active unit to a 911 call.",
    [{ name: "case-number", help: "The case number of the 911 call (Optional)." }],
  ],
  [
    SnCommands.TrafficStop,
    "Create a call with your current position and be assigned as primary unit.",
    [{ name: "description", help: "The description of your traffic stop" }],
  ],
];

for (const [command, help, params] of suggestions) {
  emit("chat:addSuggestion", `/${command}`, help, params ?? []);
}

function sendNui(action: string, data?: unknown) {
  SendNuiMessage(JSON.stringify({ action, data }));
}

function openScreen(action: string, data?: unknown) {
  sendNui(action, data);
  SetNuiFocus(true, true);
}

function nuiCallback(name: string, handler: (data: Record<string, unknown>) => void) {
  RegisterNuiCallbackType(name);
  on(`__cfx_nui:${name}`, (data: unknown, cb: (result: unknown) => void) => {
    handler(data && typeof data === "object" ? (data as Record<string, unknown>) : {});
    cb({ ok: true });
  });
}

on("onClientResourceStart", (resource: string) => {
  if (resource !== GetCurrentResourceName()) return;
  sendNui("sn:initialize", {
    version: GetResourceMetadata(GetCurrentResourceName(), "version", 0),
  });
});

// ---- screens the server opens
onNet(ClientEvents.RequestAuthFlow, () => openScreen(ClientEvents.RequestAuthFlow));
onNet(ClientEvents.RequestSetStatusFlow, (data: unknown) =>
  openScreen(ClientEvents.RequestSetStatusFlow, data),
);
onNet(ClientEvents.RequestCall911AttachFlow, (data: unknown) =>
  openScreen(ClientEvents.RequestCall911AttachFlow, data),
);
onNet(ClientEvents.FlowResult, (result: FlowResult) => sendNui(ClientEvents.FlowResult, result));

// ---- notifications: from the server, sna-alpr, or any other script (title, message, timeout?)
onNet(ClientEvents.CreateNotification, (options: NotificationData | null) => {
  if (!options || typeof options.title !== "string" || typeof options.message !== "string") {
    return;
  }
  sendNui(ClientEvents.CreateNotification, {
    title: options.title,
    message: options.message,
    timeout: typeof options.timeout === "number" ? options.timeout : undefined,
  });
});

// ---- the player's choices in the NUI, checked again by the server
nuiCallback(NuiEvents.CloseNui, () => SetNuiFocus(false, false));
nuiCallback(NuiEvents.Authenticate, (data) => {
  emitNet(ServerEvents.OnUserSave, { token: String(data.token ?? "") });
});
nuiCallback(NuiEvents.SetStatus, (data) => {
  emitNet(ServerEvents.OnSetUnitStatus, 0, "", String(data.statusId ?? ""));
});
nuiCallback(NuiEvents.AttachToCall, (data) => {
  emitNet(ServerEvents.OnCall911Attach, 0, data.type, "", String(data.callId ?? ""));
});

// ---- /sn-traffic-stop: the server asks for our position
onNet(ClientEvents.RequestTrafficStopFlow, () => {
  const { street, position } = getPlayerLocation();
  emitNet(ServerEvents.OnTrafficStopClientPosition, { streetName: street, position });
});

// ---- set a GPS route to the call's postal after attaching (snailycad_postal_command)
onNet(ClientEvents.AutoPostalOnAttach, (postal: string) => {
  const command = GetConvar("snailycad_postal_command", "").trim();
  if (!command || command === "null") return;

  const code = parseInt(postal, 10);
  if (code > 0) {
    ExecuteCommand(`${command} ${code}`);
  } else {
    emit("chat:addMessage", {
      color: [255, 0, 0],
      multiline: true,
      args: ["SnailyCAD", "An error occured while making route to call postal"],
    });
  }
});
