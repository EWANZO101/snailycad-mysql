/**
 * Wraith ARS 2X: when an officer locks a plate, search it in the CAD (vehicle + BOLOs) and send
 * the results to that officer only.
 */
import { cadRequest } from "../lib/cad.server";
import { Events } from "../lib/events";
import { throttled } from "../lib/player.server";
import "../lib/startup.server";

onNet(Events.WraithPlateLocked, async (_cam: unknown, rawPlate: unknown) => {
  const player = Number(globalThis.source);
  if (!(player > 0) || typeof rawPlate !== "string") return;

  const plate = rawPlate.trim().toUpperCase().slice(0, 16);
  if (!plate || throttled(`alpr:${plate}`, player, 3_000)) return;

  const [vehicles, bolos] = await Promise.all([
    cadRequest<unknown[]>({
      path: "/search/vehicle?includeMany=true",
      method: "POST",
      data: { plateOrVin: plate },
    }),
    cadRequest<{ bolos?: unknown[] }>({
      path: `/bolos?query=${encodeURIComponent(plate)}`,
      method: "GET",
    }),
  ]);

  emitNet(
    Events.ALPRCadPlateResults,
    player,
    plate,
    vehicles.ok ? (vehicles.data ?? []) : "failed",
  );
  emitNet(Events.ALPRCadBoloResults, player, plate, bolos.ok ? bolos.data : "failed");
});
