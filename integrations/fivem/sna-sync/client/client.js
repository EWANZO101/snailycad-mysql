// Built from integrations/fivem/sna-src by build-sna.mjs. Edit the sources, not this file.
"use strict";
(() => {
  // sna-src/lib/notification.client.ts
  function getPlayerLocation() {
    const ped = PlayerPedId();
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, true);
    const [streetHash = 0] = GetStreetNameAtCoord(x, y, z);
    return {
      street: GetStreetNameFromHashKey(streetHash),
      position: { x, y, z, heading: GetEntityHeading(ped) }
    };
  }

  // sna-src/sync/client/main.ts
  var suggestions = [
    ["sn-auth" /* Auth */, "Sign in to SnailyCAD to use its commands in-game."],
    ["sn-whoami" /* WhoAmI */, "Shows the SnailyCAD account that is connected to the game."],
    ["sn-logout" /* Logout */, "Sign out of your SnailyCAD account in-game."],
    ["sn-active-unit" /* ActiveUnit */, "This will show your active unit's name and status."],
    [
      "sn-set-status" /* SetStatus */,
      "This will open a menu and will allow you to select a status for your active unit.",
      [{ name: "status-code", help: "The status code you want to set (Optional)." }]
    ],
    ["sn-panic-button" /* PanicButton */, "Toggle the panic button state for your active unit."],
    [
      "sn-attach" /* AttachTo911Call */,
      "Attach your active unit to a 911 call.",
      [{ name: "case-number", help: "The case number of the 911 call (Optional)." }]
    ],
    [
      "sn-traffic-stop" /* TrafficStop */,
      "Create a call with your current position and be assigned as primary unit.",
      [{ name: "description", help: "The description of your traffic stop" }]
    ]
  ];
  for (const [command, help, params] of suggestions) {
    emit("chat:addSuggestion", `/${command}`, help, params ?? []);
  }
  function sendNui(action, data) {
    SendNuiMessage(JSON.stringify({ action, data }));
  }
  function openScreen(action, data) {
    sendNui(action, data);
    SetNuiFocus(true, true);
  }
  function nuiCallback(name, handler) {
    RegisterNuiCallbackType(name);
    on(`__cfx_nui:${name}`, (data, cb) => {
      handler(data && typeof data === "object" ? data : {});
      cb({ ok: true });
    });
  }
  on("onClientResourceStart", (resource) => {
    if (resource !== GetCurrentResourceName())
      return;
    sendNui("sn:initialize", {
      version: GetResourceMetadata(GetCurrentResourceName(), "version", 0)
    });
  });
  onNet("sna-sync:request-authentication-flow" /* RequestAuthFlow */, () => openScreen("sna-sync:request-authentication-flow" /* RequestAuthFlow */));
  onNet(
    "sna-sync:request-set-status-flow" /* RequestSetStatusFlow */,
    (data) => openScreen("sna-sync:request-set-status-flow" /* RequestSetStatusFlow */, data)
  );
  onNet(
    "sna-sync:request-call-911-attach-flow" /* RequestCall911AttachFlow */,
    (data) => openScreen("sna-sync:request-call-911-attach-flow" /* RequestCall911AttachFlow */, data)
  );
  onNet("sna-sync:flow-result" /* FlowResult */, (result) => sendNui("sna-sync:flow-result" /* FlowResult */, result));
  onNet("sna-sync:create-notification" /* CreateNotification */, (options) => {
    if (!options || typeof options.title !== "string" || typeof options.message !== "string") {
      return;
    }
    sendNui("sna-sync:create-notification" /* CreateNotification */, {
      title: options.title,
      message: options.message,
      timeout: typeof options.timeout === "number" ? options.timeout : void 0
    });
  });
  nuiCallback("sna-sync-nui:close-nui" /* CloseNui */, () => SetNuiFocus(false, false));
  nuiCallback("sna-sync-nui:authenticate" /* Authenticate */, (data) => {
    emitNet("sna-sync:on-user-save" /* OnUserSave */, { token: String(data.token ?? "") });
  });
  nuiCallback("sna-sync-nui:set-status" /* SetStatus */, (data) => {
    emitNet("sna-sync:on-set-unit-status" /* OnSetUnitStatus */, 0, "", String(data.statusId ?? ""));
  });
  nuiCallback("sna-sync-nui:attach-to-call" /* AttachToCall */, (data) => {
    emitNet("sna-sync:on-call-911-attach" /* OnCall911Attach */, 0, data.type, "", String(data.callId ?? ""));
  });
  onNet("sna-sync:request-traffic-stop-flow" /* RequestTrafficStopFlow */, () => {
    const { street, position } = getPlayerLocation();
    emitNet("sna-sync:on-traffic-stop-client-position" /* OnTrafficStopClientPosition */, { streetName: street, position });
  });
  onNet("sna-sync:attach-postal" /* AutoPostalOnAttach */, (postal) => {
    const command = GetConvar("snailycad_postal_command", "").trim();
    if (!command || command === "null")
      return;
    const code = parseInt(postal, 10);
    if (code > 0) {
      ExecuteCommand(`${command} ${code}`);
    } else {
      emit("chat:addMessage", {
        color: [255, 0, 0],
        multiline: true,
        args: ["SnailyCAD", "An error occured while making route to call postal"]
      });
    }
  });
})();
