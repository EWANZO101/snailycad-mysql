// Built from integrations/fivem/sna-src by build-sna.mjs. Edit the sources, not this file.
"use strict";
(() => {
  // sna-src/lib/notification.client.ts
  function createNotification(options) {
    BeginTextCommandThefeedPost("CELL_EMAIL_BCON");
    for (let i = 0; i < options.message.length; i += 99) {
      AddTextComponentSubstringPlayerName(options.message.slice(i, i + 99));
    }
    EndTextCommandThefeedPostMessagetext(
      options.picture,
      options.picture,
      false,
      options.icon ?? 0 /* None */,
      options.title,
      options.subject ?? ""
    );
    EndTextCommandThefeedPostTicker(false, true);
  }
  function getPlayerLocation() {
    const ped = PlayerPedId();
    const [x = 0, y = 0, z = 0] = GetEntityCoords(ped, true);
    const [streetHash = 0] = GetStreetNameAtCoord(x, y, z);
    return {
      street: GetStreetNameFromHashKey(streetHash),
      position: { x, y, z, heading: GetEntityHeading(ped) }
    };
  }

  // sna-src/lib/service-call.client.ts
  function registerServiceCallClient(options) {
    emit("chat:addSuggestion", `/${options.command}`, options.suggestion, [
      { name: "description", help: "The description of the call" }
    ]);
    onNet(options.toClient, () => {
      const { street, position } = getPlayerLocation();
      emitNet(options.toServer, { street, position });
    });
    onNet(options.response, (state) => {
      const ok = state === "success";
      createNotification({
        picture: options.picture,
        icon: 1 /* ChatBox */,
        title: ok ? options.title : "Failed to report call",
        message: ok ? options.success : options.failure
      });
    });
  }

  // sna-src/calltow/client.ts
  registerServiceCallClient({
    command: "sn-calltow" /* CallTow */,
    suggestion: "Contact the tow services.",
    toClient: "sn:towCall" /* TowCallToClient */,
    toServer: "sn:towCallUpdate" /* TowCallToServer */,
    response: "sn:towCallResponse" /* TowCallToClientResponse */,
    picture: "CHAR_PROPERTY_TOWING_IMPOUND",
    title: "Tow Truck Service",
    success: "Your call has been reported to any available tow drivers!",
    failure: "We were unable to process your tow call at this time."
  });
})();
