/**
 * The FiveM (CitizenFX) globals used by the sna-* resources. Only what these scripts call, so the
 * sources type-check without @citizenfx/* packages. Server and client share one file: the build
 * keeps them apart (server files end in .server.ts or live in a server/ folder).
 */

declare global {
  // ---- events (server: emitNet(name, target, ...args), client: emitNet(name, ...args))
  function on(eventName: string, handler: (...args: any[]) => void): void;
  function onNet(eventName: string, handler: (...args: any[]) => void): void;
  function emit(eventName: string, ...args: any[]): void;
  function emitNet(eventName: string, ...args: any[]): void;
  function CancelEvent(): void;

  /** the player that triggered the current net event (server), "" / 0 for a local event */
  // eslint-disable-next-line no-var
  var source: number | string;

  // ---- shared
  function GetConvar(name: string, defaultValue: string): string;
  function GetCurrentResourceName(): string;
  function GetResourceMetadata(resourceName: string, key: string, index: number): string;
  function GetResourceState(resourceName: string): string;
  function RegisterCommand(
    name: string,
    handler: (source: number, args: string[], raw: string) => void,
    restricted: boolean,
  ): void;
  function LoadResourceFile(resourceName: string, fileName: string): string | null;

  // ---- server
  function GetPlayerName(player: number | string): string;
  /** undefined for a player that has left */
  function getPlayerIdentifiers(player: number | string): string[] | undefined;
  function getPlayers(): string[];
  function GetResourceKvpString(key: string): string | null;
  function SetResourceKvp(key: string, value: string): void;
  function DeleteResourceKvp(key: string): void;

  // ---- client
  function PlayerPedId(): number;
  function GetEntityCoords(entity: number, alive: boolean): number[];
  function GetEntityHeading(entity: number): number;
  function GetStreetNameAtCoord(x: number, y: number, z: number): number[];
  function GetStreetNameFromHashKey(hash: number): string;
  function SendNuiMessage(message: string): boolean;
  function SetNuiFocus(hasFocus: boolean, hasCursor: boolean): void;
  function RegisterNuiCallbackType(callbackType: string): void;
  function ExecuteCommand(commandString: string): void;
  function BeginTextCommandThefeedPost(text: string): void;
  function AddTextComponentSubstringPlayerName(text: string): void;
  function EndTextCommandThefeedPostMessagetext(
    textureDict: string,
    textureName: string,
    flash: boolean,
    iconType: number,
    sender: string,
    subject: string,
  ): number;
  function EndTextCommandThefeedPostTicker(isImportant: boolean, showInBrief: boolean): number;

  // ---- NUI page
  function GetParentResourceName(): string;
}

export {};
