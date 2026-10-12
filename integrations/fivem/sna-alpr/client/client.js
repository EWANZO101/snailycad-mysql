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

  // sna-src/alpr/client.ts
  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  }
  function notify(data) {
    if (GetResourceState("sna-sync") === "started") {
      const message = data.lines ? data.lines.map(([k, v]) => `<li><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</li>`).join("") : escapeHtml(data.message);
      emit("sna-sync:create-notification" /* CreateNotification */, { title: data.title, message, timeout: data.timeout });
      return;
    }
    createNotification({
      picture: "CHAR_CALL911",
      title: data.title,
      message: data.lines ? data.lines.map(([k, v]) => `${k}: ${v}`).join("~n~") : data.message
    });
  }
  onNet("sn:cadBoloResults" /* ALPRCadBoloResults */, (plate, body) => {
    if (!body || body === "failed")
      return;
    const hasBolo = (body.bolos ?? []).some(
      (bolo) => bolo.type === "VEHICLE" && bolo.plate?.trim().toUpperCase() === plate
    );
    if (hasBolo) {
      notify({
        title: "Active Bolo Notice",
        message: `${plate} has an active BOLO. Open SnailyCAD for more details.`
      });
    }
  });
  onNet("sn:cadPlateResults" /* ALPRCadPlateResults */, (plate, body) => {
    if (!body || body === "failed") {
      notify({
        title: "Plate Search Results",
        message: "Unable to fetch plate search results: failed to fetch."
      });
      return;
    }
    const [vehicle] = body;
    if (!vehicle) {
      notify({ title: "Plate Search Results", message: `Plate is not registered: ${plate}` });
      return;
    }
    const owner = vehicle.citizen ? `${vehicle.citizen.name} ${vehicle.citizen.surname}` : "Unknown";
    notify({
      title: "Plate Search Results",
      message: "",
      timeout: 17e3,
      lines: [
        ["Plate", plate],
        ["Model", vehicle.model?.value?.value ?? "Unknown"],
        ["Color", vehicle.color ?? "Unknown"],
        ["VIN Number", vehicle.vinNumber ?? "Unknown"],
        ["Owner", owner]
      ]
    });
    const hasWarrants = (vehicle.citizen?.warrants ?? []).some((w) => w.status === "ACTIVE");
    if (hasWarrants) {
      notify({
        title: "Active Warrants Notice",
        message: `This vehicle - ${owner} - owner has active warrants.`
      });
    }
  });
})();
