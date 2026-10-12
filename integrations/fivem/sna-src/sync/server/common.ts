import { ClientEvents, type FlowResult, type NuiFlow } from "../../lib/events";

/** the answer to something the player started in the NUI (closes it or shows the error there) */
export function flowResult(player: number, flow: NuiFlow, ok: boolean, message?: string) {
  const result: FlowResult = { flow, ok, message: message?.replace(/\^[0-9*_~r]/g, "") };
  emitNet(ClientEvents.FlowResult, player, result);
}

/** the player behind a net event, or null for a server-local event */
export function netSource() {
  const player = Number(globalThis.source);
  return Number.isInteger(player) && player > 0 ? player : null;
}

export interface StatusValue {
  id: string;
  type?: string;
  shouldDo?: string;
  color?: string | null;
  value: { value: string };
}
