export enum Cookie {
  AccessToken = "snaily-cad-session",
  RefreshToken = "snaily-cad-refresh-token",
}

export const API_TOKEN_HEADER = "snaily-cad-api-token" as const;

/** the header which is used by a user to connect to the API with their token (Not JWT) */
export const USER_API_TOKEN_HEADER = "snaily-cad-user-api-token" as const;
/**
 * With the CAD API token: act as the CAD user linked to this game player, by Discord or Steam id
 * ("discord:123,steam:110000100000000"). Lets game scripts do what the player may do in the CAD
 * without each player creating a personal API token.
 */
export const PLAYER_HEADER = "snaily-cad-player" as const;

export type AllowedFileExtension = (typeof allowedFileExtensions)[number];
export const allowedFileExtensions = [
  "image/png",
  "image/gif",
  "image/jpeg",
  "image/jpg",
  "image/webp",
] as const;
export const IMAGES_REGEX = /https:\/\/(i.imgur.com|cdn.discordapp.com)\/.+/gi;

export * from "./socket-events";
export * from "./routes";
