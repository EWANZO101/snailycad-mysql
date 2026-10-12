import { WhitelistStatus } from "@prisma/client";
import { allPermissions } from "@snailycad/permissions";
import type { Req, Res } from "@tsed/common";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { getSessionUser, userProperties } from "lib/auth/getSessionUser";
import { validateUserData } from "lib/auth/validateUser";
import { findLinkedUserId } from "lib/radio/access";
import { prisma } from "lib/data/prisma";
import { isRouteDisabled } from "./utils";

interface SetGlobalUserFromCADAPITokenOptions {
  req: Req;
  res: Res;
  apiTokenHeader: string | string[];
}

export async function setGlobalUserFromCADAPIToken(options: SetGlobalUserFromCADAPITokenOptions) {
  const cad = await prisma.cad.findFirst({
    select: {
      apiToken: true,
    },
  });

  if (!cad?.apiToken?.enabled || cad.apiToken.token !== options.apiTokenHeader) {
    throw new Unauthorized("Unauthorized");
  }

  const isDisabled = isRouteDisabled(options);
  if (isDisabled) {
    throw new BadRequest("routeIsDisabled");
  }

  const globalUser = {
    rank: "API_TOKEN",
    username: "Dispatch",
    whitelistStatus: WhitelistStatus.ACCEPTED,
    permissions: allPermissions,
  };

  return globalUser;
}

export async function getUserFromSession(
  options: Omit<SetGlobalUserFromCADAPITokenOptions, "apiTokenHeader">,
) {
  const user = await getSessionUser({
    req: options.req,
    res: options.res,
    returnNullOnError: false,
  });

  const user2FA = await prisma.user2FA.findFirst({
    where: { userId: user.id },
  });

  if (user2FA) {
    user.twoFactorEnabled = true;
  }

  return user;
}

/**
 * The CAD user linked to a game player (PLAYER_HEADER, with a valid CAD API token): by Discord
 * or Steam id, e.g. "discord:123,steam:110000100000000". Banned / not-whitelisted users are refused
 * like any other login.
 */
export async function getUserFromLinkedPlayer(header: string, req: Req) {
  const identifiers: { discordId?: string; steamId?: string } = {};
  for (const part of header.split(",")) {
    const [kind, ...rest] = part.trim().split(":");
    const value = rest.join(":").trim();
    if (!/^[\w]{1,64}$/.test(value)) continue;
    if (kind === "discord") identifiers.discordId = value;
    if (kind === "steam") identifiers.steamId = value;
  }

  const userId = await findLinkedUserId(identifiers);
  if (!userId) {
    throw new Unauthorized("playerNotLinked");
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: userProperties });
  validateUserData(user, req, false);
  return user;
}
