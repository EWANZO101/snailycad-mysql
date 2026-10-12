/**
 * Shows the ALPR results: in the sna-sync notification panel when sna-sync is running, otherwise
 * as a GTA feed notification.
 */
import { ClientEvents, Events, type NotificationData } from "../lib/events";
import { createNotification } from "../lib/notification.client";

interface VehicleResult {
  model?: { value?: { value?: string } } | null;
  color?: string | null;
  vinNumber?: string | null;
  citizen?: {
    name: string;
    surname: string;
    warrants?: { status?: string }[] | null;
  } | null;
}

interface BoloResult {
  type?: string;
  plate?: string | null;
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function notify(data: NotificationData & { lines?: [string, string][] }) {
  if (GetResourceState("sna-sync") === "started") {
    const message = data.lines
      ? data.lines.map(([k, v]) => `<li><b>${escapeHtml(k)}:</b> ${escapeHtml(v)}</li>`).join("")
      : escapeHtml(data.message);
    emit(ClientEvents.CreateNotification, { title: data.title, message, timeout: data.timeout });
    return;
  }

  createNotification({
    picture: "CHAR_CALL911",
    title: data.title,
    message: data.lines ? data.lines.map(([k, v]) => `${k}: ${v}`).join("~n~") : data.message,
  });
}

onNet(Events.ALPRCadBoloResults, (plate: string, body?: { bolos?: BoloResult[] } | "failed") => {
  if (!body || body === "failed") return;

  const hasBolo = (body.bolos ?? []).some(
    (bolo) => bolo.type === "VEHICLE" && bolo.plate?.trim().toUpperCase() === plate,
  );
  if (hasBolo) {
    notify({
      title: "Active Bolo Notice",
      message: `${plate} has an active BOLO. Open SnailyCAD for more details.`,
    });
  }
});

onNet(Events.ALPRCadPlateResults, (plate: string, body?: VehicleResult[] | "failed") => {
  if (!body || body === "failed") {
    notify({
      title: "Plate Search Results",
      message: "Unable to fetch plate search results: failed to fetch.",
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
    timeout: 17_000,
    lines: [
      ["Plate", plate],
      ["Model", vehicle.model?.value?.value ?? "Unknown"],
      ["Color", vehicle.color ?? "Unknown"],
      ["VIN Number", vehicle.vinNumber ?? "Unknown"],
      ["Owner", owner],
    ],
  });

  const hasWarrants = (vehicle.citizen?.warrants ?? []).some((w) => w.status === "ACTIVE");
  if (hasWarrants) {
    notify({
      title: "Active Warrants Notice",
      message: `This vehicle - ${owner} - owner has active warrants.`,
    });
  }
});
