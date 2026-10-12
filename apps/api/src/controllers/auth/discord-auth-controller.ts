import process from "node:process";
import { Context, Delete, Get, QueryParams, Req, Res, UseBefore } from "@tsed/common";
import { BadRequest } from "@tsed/exceptions";
import { Controller } from "@tsed/di";
import { URL } from "node:url";
import { request } from "undici";
import type { RESTPostOAuth2AccessTokenResult, APIUser } from "discord-api-types/v10";
import { prisma } from "lib/data/prisma";
import { getSessionUser } from "lib/auth/getSessionUser";
import { type cad, Feature, Rank, WhitelistStatus, type User } from "@prisma/client";
import { getDefaultPermissionsForNewUser } from "./auth-controller";
import { IsAuth } from "middlewares/auth/is-auth";
import { DISCORD_API_URL } from "lib/discord/config";
import { updateMemberRolesLogin } from "lib/discord/auth";
import { ContentType, Description } from "@tsed/schema";
import { isFeatureEnabled } from "lib/upsert-cad";
import { setUserTokenCookies } from "lib/auth/setUserTokenCookies";
import { sendUserRegisteredWebhook } from "lib/discord/extra-webhooks";
import { getAPIUrl } from "@snailycad/utils/api-url";
import { IsFeatureEnabled } from "middlewares/is-enabled";
import { encode } from "lib/discord/utils";
import { setCookie } from "utils/set-cookie";
import { insensitive } from "lib/data/db-provider";

const callbackUrl = makeCallbackURL(getAPIUrl());
const authorizeUrl = makeAuthorizeURL(getAPIUrl());
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;

/**
 * set after a successful Discord OAuth2 flow. Indicates that this browser has already
 * authorized the application, so Discord's consent screen can be skipped (`prompt=none`).
 */
const DISCORD_AUTHORIZED_COOKIE = "snaily-cad-discord-authorized";
const DISCORD_AUTHORIZED_COOKIE_EXPIRES_MS = 60 * 60 * 24 * 365 * 1000; // 1 year

/**
 * errors Discord can return when `prompt=none` is used for a user that has not (or no longer)
 * authorized the application. When this happens, we retry the flow with `prompt=consent`.
 */
const PROMPT_NONE_RETRY_ERRORS = ["consent_required", "interaction_required", "login_required"];

@Controller("/auth/discord")
@ContentType("application/json")
@IsFeatureEnabled({ feature: [Feature.DISCORD_AUTH] })
export class DiscordAuth {
  @Get("/")
  @Description("Redirect to Discord OAuth2 URL")
  async handleRedirectToDiscordOAuthAPI(
    @Res() res: Res,
    @Req() req: Req,
    @QueryParams("consent", Boolean) forceConsent = false,
  ) {
    const url = new URL(`${DISCORD_API_URL}/oauth2/authorize`);
    const redirectURL = findRedirectURL();

    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      throw new BadRequest(
        "No `DISCORD_CLIENT_ID` was specified in the .env file. Please refer to the documentation: https://docs.snailycad.org/docs/discord-integration/discord-authentication",
      );
    }

    const userCount = await prisma.user.count();
    if (userCount <= 0) {
      return res.redirect(`${redirectURL}/auth/login?error=ownerCannotDiscordAuth`);
    }

    url.searchParams.append("client_id", DISCORD_CLIENT_ID);
    url.searchParams.append("redirect_uri", callbackUrl);
    /**
     * - `consent`: forced after Discord rejected a `prompt=none` request (user revoked/never authorized).
     * - `none`: the user already authorized the application before -> skip the consent screen.
     * - omitted: first-time authorization; Discord shows its regular authorization screen.
     */
    const prompt = forceConsent ? "consent" : await getDiscordOAuthPrompt(req, res);
    if (prompt) {
      url.searchParams.append("prompt", prompt);
    }
    url.searchParams.append("response_type", "code");
    url.searchParams.append("scope", "identify role_connections.write");

    return res.redirect(url.toString());
  }

  @Get("/callback")
  @Description("Handle Discord's OAuth2 response. Authenticate user where possible.")
  async handleCallbackFromDiscord(
    @QueryParams("code") code: string,
    @Res() res: Res,
    @Req() req: Req,
    @QueryParams("error") discordError?: string,
  ) {
    const redirectURL = findRedirectURL();

    /**
     * Discord redirects back with `?error=...` (and no code) when the user cancels the authorization
     * or when `prompt=none` cannot be used (the user has not authorized the application yet).
     */
    if (discordError) {
      if (PROMPT_NONE_RETRY_ERRORS.includes(discordError)) {
        clearDiscordAuthorizedCookie(res);
        return res.redirect(`${authorizeUrl}?consent=true`);
      }

      const sessionUser = await getSessionUser({ req, res, returnNullOnError: true }).catch(
        () => null,
      );

      if (sessionUser) {
        return res.redirect(`${redirectURL}/account?tab=discord&error=discordAuthIssue`);
      }

      return res.redirect(`${redirectURL}/auth/login?error=discordAuthIssue`);
    }

    if (!code) {
      return res.redirect(`${redirectURL}/auth/login?error=invalidCode`);
    }

    const [data, authUser] = await Promise.all([
      getDiscordData(code).catch(() => null),
      getSessionUser({ req, res, returnNullOnError: true }),
    ]);

    if (!data?.id) {
      return res.redirect(`${redirectURL}/auth/login?error=discordAuthIssue`);
    }

    // this browser has now authorized the application; future logins can skip the consent screen.
    setCookie({
      res,
      name: DISCORD_AUTHORIZED_COOKIE,
      value: "true",
      expires: DISCORD_AUTHORIZED_COOKIE_EXPIRES_MS,
    });

    const users = await prisma.user.count();
    if (users <= 0) {
      return res.redirect(`${redirectURL}/auth/login?error=cannotRegisterFirstWithDiscord`);
    }

    const user = await prisma.user.findFirst({
      where: { discordId: data.id },
    });

    const cad = await prisma.cad.findFirst({ include: { autoSetUserProperties: true } });
    const discordRolesId = cad?.discordRolesId ?? null;

    /**
     * a user was found with the discordId, but the user is not authenticated.
     *
     * -> log the user in and set the cookie
     */
    if (!authUser && user) {
      const updatedWithRoles = await updateMemberRolesLogin(user, discordRolesId);

      // authenticate user with cookie
      await setUserTokenCookies({ user, res });

      validateUser(updatedWithRoles ?? user);

      return res.redirect(`${redirectURL}/citizen`);
    }

    /**
     * there is no user authenticated and there is no user with the discordId already registered
     *
     * -> register the account and set cookie
     */
    if (!user && !authUser) {
      const existingUserWithUsername = await prisma.user.findFirst({
        where: { username: { equals: data.username, ...insensitive() } },
      });

      if (existingUserWithUsername) {
        return res.redirect(`${redirectURL}/auth/login?error=discordNameInUse`);
      }

      const user = await prisma.user.create({
        data: {
          username: data.username,
          password: "",
          discordId: data.id,
          permissions: getDefaultPermissionsForNewUser(cad),
          whitelistStatus: cad?.whitelisted ? WhitelistStatus.PENDING : WhitelistStatus.ACCEPTED,
        },
      });

      sendUserRegisteredWebhook({ user, method: "discord" });

      const updatedWithRoles = await updateMemberRolesLogin(user, discordRolesId);
      // authenticate user with cookie
      await setUserTokenCookies({ user, res });

      validateUser(updatedWithRoles ?? user);

      return res.redirect(`${redirectURL}/citizen`);
    }

    if (authUser && user) {
      if (user.id === authUser.id) {
        const updated = await prisma.user.update({
          where: {
            id: authUser.id,
          },
          data: {
            discordId: data.id,
          },
        });

        const updatedWithRoles = await updateMemberRolesLogin(updated, discordRolesId);
        validateUser(updatedWithRoles ?? updated);

        return res.redirect(`${redirectURL}/account?tab=discord&success`);
      }

      return res.redirect(`${redirectURL}/account?tab=discord&error=discordAccountAlreadyLinked`);
    }

    if (authUser && !user) {
      const updated = await prisma.user.update({
        where: {
          id: authUser.id,
        },
        data: {
          discordId: data.id,
        },
      });

      const updatedWithRoles = await updateMemberRolesLogin(updated, discordRolesId);
      validateUser(updatedWithRoles ?? updated);

      return res.redirect(`${redirectURL}/account?tab=discord&success`);
    }

    function validateUser(user: User) {
      if (user.rank !== Rank.OWNER) {
        if (user.banned) {
          return res.redirect(`${redirectURL}/auth/login?error=userBanned`);
        }

        if (user.whitelistStatus === WhitelistStatus.PENDING) {
          return res.redirect(`${redirectURL}/auth/pending?success=discord`);
        }

        if (user.whitelistStatus === WhitelistStatus.DECLINED) {
          return res.redirect(`${redirectURL}/auth/login?error=whitelistDeclined`);
        }
      }
    }
  }

  @Delete("/")
  @UseBefore(IsAuth)
  @Description("Remove Discord OAuth2 from from authenticated user")
  async removeDiscordAuth(
    @Context("user") user: User,
    @Context("cad") cad: cad & { features?: Record<Feature, boolean> },
  ) {
    const regularAuthEnabled = isFeatureEnabled({
      features: cad.features,
      feature: Feature.ALLOW_REGULAR_LOGIN,
      defaultReturn: true,
    });

    if (!regularAuthEnabled) {
      throw new BadRequest("allowRegularLoginDisabled");
    }

    await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        discordId: null,
      },
    });

    return true;
  }
}

async function getDiscordData(code: string): Promise<APIUser | null> {
  const response = await request(
    `${DISCORD_API_URL}/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${callbackUrl}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: encode({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: callbackUrl,
        scope: "identify guilds",
      }),
    },
  ).catch(() => null);

  if (response?.statusCode !== 200) {
    return null;
  }

  const data = (await response.body.json()) as RESTPostOAuth2AccessTokenResult;
  const accessToken = data.access_token;

  const roleConnectionURL = `https://discord.com/api/v10/users/@me/applications/${DISCORD_CLIENT_ID}/role-connection`;
  await request(roleConnectionURL, {
    method: "PUT",
    body: JSON.stringify({
      platform_name: "SnailyCAD",
      metadata: { cad_connected: 1 },
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  }).catch(() => null);

  const meData = await request(`${DISCORD_API_URL}/users/@me`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
    .then((v) => v.body.json() as any)
    .catch(() => null);

  return meData;
}

export function findRedirectURL() {
  const url =
    process.env.NEXT_PUBLIC_CLIENT_URL ?? process.env.CORS_ORIGIN_URL ?? "http://localhost:3000";

  if (url.includes("*") && process.env.NEXT_PUBLIC_CLIENT_URL) {
    return process.env.NEXT_PUBLIC_CLIENT_URL;
  }

  return url;
}

function makeCallbackURL(base: string) {
  return `${new URL(base)}/auth/discord/callback`;
}

function makeAuthorizeURL(base: string) {
  return `${new URL(base)}/auth/discord`;
}

function clearDiscordAuthorizedCookie(res: Res) {
  setCookie({ res, name: DISCORD_AUTHORIZED_COOKIE, value: "", expires: 0 });
}

/**
 * only use `prompt=none` when we know the user has authorized the application before, since
 * Discord returns an error for `prompt=none` if the user has not authorized it yet.
 * (that error is handled in the callback by retrying with `prompt=consent`)
 */
async function getDiscordOAuthPrompt(req: Req, res: Res): Promise<"none" | undefined> {
  if (req.cookies?.[DISCORD_AUTHORIZED_COOKIE] === "true") {
    return "none";
  }

  const sessionUser = await getSessionUser({ req, res, returnNullOnError: true }).catch(() => null);

  if (sessionUser?.discordId) {
    return "none";
  }

  return undefined;
}
