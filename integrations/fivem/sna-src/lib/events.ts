/**
 * Command and event names. Every name that existed in SnailyCAD fivem-integrations 0.14.3 is kept
 * as-is so other scripts keep working; new ones are marked "new".
 */

export enum Events {
  WraithPlateLocked = "wk:onPlateLocked",
  ALPRCadPlateResults = "sn:cadPlateResults",
  ALPRCadBoloResults = "sn:cadBoloResults",

  Call911ToClient = "sn:911Call",
  Call911ToServer = "sn:911CallUpdate",
  Call911ToClientResponse = "sn:911CallResponse",

  TowCallToClient = "sn:towCall",
  TowCallToServer = "sn:towCallUpdate",
  TowCallToClientResponse = "sn:towCallResponse",

  TaxiCallToClient = "sn:taxiCall",
  TaxiCallToServer = "sn:taxiCallUpdate",
  TaxiCallToClientResponse = "sn:taxiCallResponse",
}

export enum SnCommands {
  Call911 = "sn-call911",
  CallTow = "sn-calltow",
  CallTaxi = "sn-calltaxi",
  WhoAmI = "sn-whoami",
  Logout = "sn-logout",
  Auth = "sn-auth",
  ActiveUnit = "sn-active-unit",
  SetStatus = "sn-set-status",
  PanicButton = "sn-panic-button",
  AttachTo911Call = "sn-attach",
  TrafficStop = "sn-traffic-stop",
}

export enum ServerEvents {
  /** original edition: the player entered a personal API token in the NUI ({ token }) */
  OnUserSave = "sna-sync:on-user-save",
  /** (ignored source, ignored unit id, status code id) */
  OnSetUnitStatus = "sna-sync:on-set-unit-status",
  /** (ignored source, "assign" | "unassign", ignored unit id, call id) */
  OnCall911Attach = "sna-sync:on-call-911-attach",
  /** the client's position for a pending /sn-traffic-stop */
  OnTrafficStopClientPosition = "sna-sync:on-traffic-stop-client-position",
  /** 0.14.3: the NUI forwarded a socket event. Alerts now come from the server's socket */
  Incoming911Call = "sna-sync:incoming-911-call",
  PanicButtonOn = "sna-sync:panic-button-on",
}

export enum ClientEvents {
  RequestAuthFlow = "sna-sync:request-authentication-flow",
  RequestSetStatusFlow = "sna-sync:request-set-status-flow",
  RequestCall911AttachFlow = "sna-sync:request-call-911-attach-flow",
  RequestTrafficStopFlow = "sna-sync:request-traffic-stop-flow",
  /** { title, message, timeout? } — other scripts use this one */
  CreateNotification = "sna-sync:create-notification",
  AutoPostalOnAttach = "sna-sync:attach-postal",
  /** new: the result of an action started from the NUI ({ flow, ok, message? }) */
  FlowResult = "sna-sync:flow-result",
}

/** NUI -> client callbacks */
export enum NuiEvents {
  CloseNui = "sna-sync-nui:close-nui",
  /** new: { token } from the authentication screen */
  Authenticate = "sna-sync-nui:authenticate",
  /** new: { statusId } from the set-status screen */
  SetStatus = "sna-sync-nui:set-status",
  /** new: { type, callId } from the 911 call list */
  AttachToCall = "sna-sync-nui:attach-to-call",
}

export type NuiFlow = "auth" | "set-status" | "attach";

export interface FlowResult {
  flow: NuiFlow;
  ok: boolean;
  message?: string;
}

export interface NotificationData {
  title: string;
  message: string;
  timeout?: number;
}

/** one row of the 911 call attach list (only what the NUI shows) */
export interface AttachListCall {
  id: string;
  caseNumber: number | string;
  location: string;
  postal: string | null;
  caller: string;
  description: string;
  isAttached: boolean;
}

export interface StatusOption {
  id: string;
  label: string;
  color: string | null;
}
