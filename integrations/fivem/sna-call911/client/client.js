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

  // sna-src/call911/client.ts
  registerServiceCallClient({
    command: "sn-call911" /* Call911 */,
    suggestion: "Contact the emergency services.",
    toClient: "sn:911Call" /* Call911ToClient */,
    toServer: "sn:911CallUpdate" /* Call911ToServer */,
    response: "sn:911CallResponse" /* Call911ToClientResponse */,
    picture: "CHAR_CALL911",
    title: "Emergency Services",
    success: "Your call has been reported to the emergency services",
    failure: "We were unable to process your 911 call at this time."
  });
})();
