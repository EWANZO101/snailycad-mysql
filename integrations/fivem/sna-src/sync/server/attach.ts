/**
 * /sn-attach [case-number]: attach the player's active unit to a 911 call, or pick one from a
 * list of the active calls (up to 50, newest first).
 */
import { cadRequest, type CadResult, type PlayerAuth } from "../../lib/cad.server";
import { ClientEvents, ServerEvents, SnCommands, type AttachListCall } from "../../lib/events";
import { chat, explainPlayerError, getPlayerUser, throttled } from "../../lib/player.server";
import { flowResult, netSource } from "./common";

const PAGE_SIZE = 25;
const MAX_CALLS = 50;

interface Call911 {
  id: string;
  caseNumber: number;
  location?: string | null;
  postal?: string | null;
  name?: string | null;
  description?: string | null;
  descriptionData?: unknown;
  assignedUnits?: { unit?: { id?: string } | null }[];
}

/** the text of a rich-text (Slate) description */
function slateToText(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  if (Array.isArray(value)) return value.map(slateToText).filter(Boolean).join(" ");
  const node = value as { text?: unknown; children?: unknown };
  if (typeof node.text === "string") return node.text;
  return slateToText(node.children);
}

async function listCalls(auth: PlayerAuth): Promise<CadResult<Call911[]>> {
  const calls: Call911[] = [];
  let result: CadResult<Call911[]> | null = null;

  for (let skip = 0; skip < MAX_CALLS; skip += PAGE_SIZE) {
    const page = await cadRequest<{ totalCount: number; calls: Call911[] }>({
      method: "GET",
      path: `/911-calls?take=${PAGE_SIZE}&skip=${skip}`,
      auth,
      quiet: true,
    });
    if (!page.ok || !page.data) {
      // the first page failing is an error; a later one just ends the list
      if (!result) return { ...page, data: null };
      break;
    }

    calls.push(...page.data.calls);
    result = { ...page, data: calls };
    if (calls.length >= page.data.totalCount || page.data.calls.length < PAGE_SIZE) break;
  }

  return result
    ? { ...result, data: calls.slice(0, MAX_CALLS) }
    : { ok: false, status: 0, data: null, edition: "original" };
}

RegisterCommand(
  SnCommands.AttachTo911Call,
  async (source: number, args: string[]) => {
    const player = Number(source);
    if (player <= 0 || throttled("attach-command", player, 1_500)) return;

    const result = await getPlayerUser(player, { requireUnit: true });
    if (!result?.user.unit) return;
    const unitId = result.user.unit.id;

    const [caseNumber] = args;
    if (caseNumber) {
      const id = caseNumber.replace(/^#/, "");
      const call = await cadRequest<Call911>({
        method: "GET",
        path: `/911-calls/${encodeURIComponent(id)}`,
        auth: result.auth,
        quiet: true,
      });
      if (!call.ok || !call.data?.id) {
        chat(
          player,
          call.status === 404 || call.ok
            ? "That call could not be found. Please try a different case-number."
            : explainPlayerError(call),
        );
        return;
      }

      await attach(player, "assign", call.data.id, false);
      return;
    }

    const calls = await listCalls(result.auth);
    if (!calls.ok || !calls.data) {
      chat(player, explainPlayerError(calls));
      return;
    }

    const list: AttachListCall[] = calls.data.map((call) => ({
      id: call.id,
      caseNumber: call.caseNumber,
      location: call.location ?? "",
      postal: call.postal ?? null,
      caller: call.name ?? "",
      description: (slateToText(call.descriptionData) || call.description || "").slice(0, 300),
      isAttached: Boolean(call.assignedUnits?.some((u) => u.unit?.id === unitId)),
    }));

    // 0.14.3 sent (unitId, source, calls, userApiToken); tokens never go to the client now
    emitNet(ClientEvents.RequestCall911AttachFlow, player, { calls: list });
  },
  false,
);

async function attach(
  player: number,
  type: "assign" | "unassign",
  callId: string,
  viaNui: boolean,
) {
  const result = await getPlayerUser(player, { requireUnit: true, silent: viaNui });
  if (!result?.user.unit) {
    if (viaNui) flowResult(player, "attach", false, "No active unit found. Go on-duty first.");
    return;
  }

  const updated = await cadRequest<{ id?: string; caseNumber?: number; postal?: string | null }>({
    method: "POST",
    path: `/911-calls/${type}/${encodeURIComponent(callId)}`,
    data: { unit: result.user.unit.id },
    auth: result.auth,
    quiet: true,
  });

  if (!updated.ok || !updated.data?.id) {
    const message = updated.ok
      ? "An error occurred while attaching you to the call."
      : explainPlayerError(updated);
    if (viaNui) flowResult(player, "attach", false, message);
    else chat(player, message);
    return;
  }

  const message =
    type === "assign"
      ? `Successfully attached yourself to a call with case number: #${updated.data.caseNumber}.`
      : `Successfully removed yourself from a call with case number: #${updated.data.caseNumber}.`;
  if (viaNui) flowResult(player, "attach", true, message);
  chat(player, message);

  if (type === "assign" && updated.data.postal) {
    emitNet(ClientEvents.AutoPostalOnAttach, player, updated.data.postal);
  }
}

/** (source, type, unitId, callId) as in 0.14.3: the source and unit id sent are ignored */
onNet(
  ServerEvents.OnCall911Attach,
  async (_source: unknown, type: unknown, _unitId: unknown, callId: unknown) => {
    const player = netSource();
    if (!player || (type !== "assign" && type !== "unassign")) return;
    if (typeof callId !== "string" || !callId || callId.length > 64) return;
    if (throttled("attach", player, 1_000)) return;
    await attach(player, type, callId, true);
  },
);
