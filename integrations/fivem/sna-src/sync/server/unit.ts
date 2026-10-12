/**
 * /sn-active-unit, /sn-set-status, /sn-panic-button and going off-duty when a player leaves.
 */
import { cadRequest, playerAuth, type PlayerAuth } from "../../lib/cad.server";
import { ClientEvents, ServerEvents, SnCommands, type StatusOption } from "../../lib/events";
import {
  chat,
  explainPlayerError,
  getPlayerUser,
  getUnitName,
  throttled,
} from "../../lib/player.server";
import { forgetDuty } from "./alerts";
import { flowResult, netSource, type StatusValue } from "./common";

async function getStatusCodes(auth: PlayerAuth) {
  const result = await cadRequest<{ type: string; values: StatusValue[] }[]>({
    method: "GET",
    path: "/admin/values/codes_10?includeAll=true",
    auth,
    quiet: true,
  });
  if (!result.ok || !Array.isArray(result.data)) return null;
  return result.data.find((v) => v.type === "CODES_10")?.values ?? [];
}

RegisterCommand(
  SnCommands.ActiveUnit,
  async (source: number) => {
    const player = Number(source);
    if (player <= 0) return;

    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit) return;

    const unit = result.user.unit;
    chat(
      player,
      `Your active unit is ^5${getUnitName(unit) || "Unknown"} ^7with status of ^5${
        unit.status?.value?.value ?? "None"
      }^7.`,
    );
  },
  false,
);

async function setStatus(player: number, statusId: string, viaNui: boolean) {
  const result = await getPlayerUser(player, { requireUnit: true, silent: viaNui });
  if (!result?.user.unit) {
    if (viaNui) flowResult(player, "set-status", false, "No active unit found. Go on-duty first.");
    return;
  }

  const updated = await cadRequest<{ id?: string; status?: { value?: { value?: string } } }>({
    method: "PUT",
    path: `/dispatch/status/${encodeURIComponent(result.user.unit.id)}`,
    auth: result.auth,
    data: { status: statusId },
    quiet: true,
  });
  forgetDuty(player);

  if (!updated.ok || !updated.data?.id) {
    const message = updated.ok
      ? "An error occurred while updating your status."
      : explainPlayerError(updated);
    if (viaNui) flowResult(player, "set-status", false, message);
    else chat(player, message);
    return;
  }

  const message = `Your status has been updated to ^5${updated.data.status?.value?.value ?? "?"}^7.`;
  if (viaNui) flowResult(player, "set-status", true, message);
  chat(player, message);
}

RegisterCommand(
  SnCommands.SetStatus,
  async (source: number, args: string[]) => {
    const player = Number(source);
    if (player <= 0) return;

    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit) return;

    const codes = await getStatusCodes(result.auth);
    if (!codes) {
      chat(player, "Could not load the status codes from SnailyCAD.");
      return;
    }
    const statusCodes = codes.filter((v) => v.type === "STATUS_CODE");

    const [statusCode] = args;
    if (statusCode) {
      const match = statusCodes.find((v) =>
        v.value.value.toLowerCase().startsWith(statusCode.toLowerCase()),
      );
      if (!match) {
        chat(player, "An invalid status code was provided.");
        return;
      }
      await setStatus(player, match.id, false);
      return;
    }

    const statuses: StatusOption[] = statusCodes.map((v) => ({
      id: v.id,
      label: v.value.value,
      color: v.color ?? null,
    }));
    emitNet(ClientEvents.RequestSetStatusFlow, player, {
      statuses,
      currentStatusId: result.user.unit.status?.id ?? null,
    });
  },
  false,
);

/** (source, unitId, statusCodeId) as in 0.14.3: the source and unit id sent are ignored */
onNet(
  ServerEvents.OnSetUnitStatus,
  async (_source: unknown, _unitId: unknown, statusId: unknown) => {
    const player = netSource();
    if (!player || typeof statusId !== "string" || !statusId) return;
    if (throttled("set-status", player, 1_500)) return;
    await setStatus(player, statusId, true);
  },
);

RegisterCommand(
  SnCommands.PanicButton,
  async (source: number) => {
    const player = Number(source);
    if (player <= 0 || throttled("panic", player, 2_000)) return;

    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit) return;

    const unit = result.user.unit;
    const isOfficer = Array.isArray(unit.divisions) || "officers" in unit;
    const updated = await cadRequest<{ id?: string; status?: { shouldDo?: string } | null }>({
      method: "POST",
      path: isOfficer ? "/leo/panic-button" : "/ems-fd/panic-button",
      data: { [isOfficer ? "officerId" : "deputyId"]: unit.id },
      auth: result.auth,
      quiet: true,
    });

    if (!updated.ok || !updated.data?.id) {
      chat(
        player,
        updated.ok ? "An error occurred while updating your status." : explainPlayerError(updated),
      );
      return;
    }

    const enabled = updated.data.status?.shouldDo === "PANIC_BUTTON";
    chat(player, `You successfully ${enabled ? "enabled" : "disabled"} your panic button`);
  },
  false,
);

/** snailycad_player_leave_auto_off_duty "true": set a leaving player's unit off-duty */
on("playerDropped", () => {
  const player = Number(globalThis.source);
  forgetDuty(player);
  if (GetConvar("snailycad_player_leave_auto_off_duty", "false") !== "true") return;

  // identifiers are only readable while the drop event runs
  const auth = playerAuth(player);
  void setOffDuty(player, auth);
});

async function setOffDuty(player: number, auth: PlayerAuth) {
  const result = await getPlayerUser(player, { auth, silent: true });
  if (!result?.user.unit) return;

  const codes = await getStatusCodes(auth);
  const offDuty = codes?.find((v) => v.shouldDo === "SET_OFF_DUTY");
  if (!offDuty) return;

  await cadRequest({
    method: "PUT",
    path: `/dispatch/status/${encodeURIComponent(result.user.unit.id)}`,
    auth,
    data: { status: offDuty.id },
    quiet: true,
  });
}
