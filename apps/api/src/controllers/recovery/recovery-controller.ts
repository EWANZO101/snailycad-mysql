import { Controller } from "@tsed/di";
import { BodyParams, Req } from "@tsed/common";
import { ContentType, Description, Post, Tags } from "@tsed/schema";
import { BadRequest, NotFound, TooManyRequests, Unauthorized } from "@tsed/exceptions";
import { Feature, Rank, WhitelistStatus } from "@prisma/client";
import { hashSync, genSaltSync } from "bcrypt";
import { z } from "zod";
import { prisma } from "lib/data/prisma";
import { validateSchema } from "lib/data/validate-schema";
import { createFeaturesObject } from "middlewares/is-enabled";
import { verifyRecoveryToken } from "lib/recovery/recovery-token";
import { insensitive } from "lib/data/db-provider";

/**
 * Recovery endpoints (roadmap 2.1).
 *
 * These endpoints do NOT use the normal session auth. They are authenticated only by the
 * recovery token (header `x-recovery-token`) which is stored on the server in
 * `apps/api/.recovery-token`. All requests are rate-limited in memory.
 */

const RECOVERY_TOKEN_HEADER = "x-recovery-token";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 60;
const MAX_FAILURES_PER_IP = 5;
const MAX_GLOBAL_FAILURES = 25;

interface Bucket {
  windowStart: number;
  requests: number;
  failures: number;
}

const buckets = new Map<string, Bucket>();
const globalFailures = { windowStart: Date.now(), count: 0 };

function getBucket(ip: string) {
  const now = Date.now();
  let bucket = buckets.get(ip);

  if (!bucket || now - bucket.windowStart > WINDOW_MS) {
    bucket = { windowStart: now, requests: 0, failures: 0 };
    buckets.set(ip, bucket);
  }

  // keep the map from growing forever
  if (buckets.size > 5000) {
    for (const [key, value] of buckets) {
      if (now - value.windowStart > WINDOW_MS) buckets.delete(key);
    }
  }

  return bucket;
}

function getGlobalFailures() {
  if (Date.now() - globalFailures.windowStart > WINDOW_MS) {
    globalFailures.windowStart = Date.now();
    globalFailures.count = 0;
  }
  return globalFailures;
}

function getClientIp(req: Req) {
  // intentionally not trusting `x-forwarded-for` (spoofable). Behind a proxy all clients share
  // one bucket, which is acceptable for an emergency-only tool. The global limit still applies.
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

function logRecoveryAction(req: Req, action: string, details: Record<string, unknown> = {}) {
  // NEVER log the token itself.
  console.warn(
    `[recovery] ${new Date().toISOString()} action=${action} ip=${getClientIp(req)} ${JSON.stringify(
      details,
    )}`,
  );
}

const USER_ID_SCHEMA = z.object({ userId: z.string().min(1).max(255) });
const SEARCH_SCHEMA = z.object({ query: z.string().max(255).nullish() });
const RESET_PASSWORD_SCHEMA = z.object({
  userId: z.string().min(1).max(255),
  newPassword: z.string().min(8).max(255),
});

const USER_SELECT = {
  id: true,
  username: true,
  rank: true,
  banned: true,
  whitelistStatus: true,
  discordId: true,
  steamId: true,
  tempPassword: true,
  User2FA: { select: { id: true } },
} as const;

@Tags("Account Recovery")
@Controller("/recovery")
@ContentType("application/json")
export class RecoveryController {
  private authorize(req: Req) {
    const bucket = getBucket(getClientIp(req));
    const global = getGlobalFailures();

    bucket.requests += 1;

    if (
      bucket.requests > MAX_REQUESTS_PER_IP ||
      bucket.failures >= MAX_FAILURES_PER_IP ||
      global.count >= MAX_GLOBAL_FAILURES
    ) {
      throw new TooManyRequests("recoveryRateLimited");
    }

    const header = req.headers[RECOVERY_TOKEN_HEADER];
    const provided = Array.isArray(header) ? header[0] : header;

    if (!verifyRecoveryToken(provided)) {
      bucket.failures += 1;
      global.count += 1;
      logRecoveryAction(req, "invalid-token");
      throw new Unauthorized("invalidRecoveryToken");
    }
  }

  async getUserOrThrow(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
    if (!user) {
      throw new NotFound("userNotFound");
    }
    return user;
  }

  private async setFeatures(features: Partial<Record<Feature, boolean>>) {
    const cad = await prisma.cad.findFirst({ select: { id: true } });

    await prisma.$transaction(
      Object.entries(features).map(([feature, isEnabled]) =>
        prisma.cadFeature.upsert({
          where: { feature: feature as Feature },
          create: { feature: feature as Feature, isEnabled: Boolean(isEnabled), cadId: cad?.id },
          update: { isEnabled: Boolean(isEnabled) },
        }),
      ),
    );
  }

  private async getStatus() {
    const cad = await prisma.cad.findFirst({
      select: { name: true, whitelisted: true, features: true },
    });
    const features = createFeaturesObject(cad?.features);

    return {
      cadName: cad?.name ?? null,
      whitelisted: cad?.whitelisted ?? false,
      features: {
        ALLOW_REGULAR_LOGIN: features.ALLOW_REGULAR_LOGIN,
        DISCORD_AUTH: features.DISCORD_AUTH,
        STEAM_OAUTH: features.STEAM_OAUTH,
        FORCE_DISCORD_AUTH: features.FORCE_DISCORD_AUTH,
        FORCE_STEAM_AUTH: features.FORCE_STEAM_AUTH,
      },
    };
  }

  private mapUser(user: Awaited<ReturnType<RecoveryController["getUserOrThrow"]>>) {
    return {
      id: user.id,
      username: user.username,
      rank: user.rank,
      banned: user.banned,
      whitelistStatus: user.whitelistStatus,
      discordId: user.discordId,
      steamId: user.steamId,
      hasTempPassword: Boolean(user.tempPassword),
      has2FA: user.User2FA.length > 0,
    };
  }

  @Post("/verify")
  @Description("Verify a recovery token and return the current authentication settings")
  async verify(@Req() req: Req) {
    this.authorize(req);
    logRecoveryAction(req, "verify");

    return this.getStatus();
  }

  @Post("/users")
  @Description("Search users (max 25). Owners are listed first.")
  async searchUsers(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const data = validateSchema(SEARCH_SCHEMA, body);
    const query = data.query?.trim();

    const users = await prisma.user.findMany({
      where: query
        ? {
            OR: [
              { username: { contains: query, ...insensitive() } },
              { id: query },
              { discordId: query },
              { steamId: query },
            ],
          }
        : undefined,
      select: USER_SELECT,
      orderBy: [{ rank: "asc" }, { username: "asc" }],
      take: 25,
    });

    return users.map((user) => this.mapUser(user));
  }

  @Post("/actions/enable-regular-login")
  @Description("Enable username/password login (ALLOW_REGULAR_LOGIN)")
  async enableRegularLogin(@Req() req: Req) {
    this.authorize(req);
    await this.setFeatures({ [Feature.ALLOW_REGULAR_LOGIN]: true });
    logRecoveryAction(req, "enable-regular-login");

    return this.getStatus();
  }

  @Post("/actions/disable-forced-oauth")
  @Description("Disable the forced Discord and Steam authentication requirements")
  async disableForcedOAuth(@Req() req: Req) {
    this.authorize(req);
    await this.setFeatures({
      [Feature.FORCE_DISCORD_AUTH]: false,
      [Feature.FORCE_STEAM_AUTH]: false,
    });
    logRecoveryAction(req, "disable-forced-oauth");

    return this.getStatus();
  }

  @Post("/actions/disable-whitelist")
  @Description("Disable the CAD whitelist (open registration)")
  async disableWhitelist(@Req() req: Req) {
    this.authorize(req);

    const cad = await prisma.cad.findFirst({ select: { id: true } });
    if (!cad) {
      throw new BadRequest("cadNotFound");
    }

    await prisma.cad.update({ where: { id: cad.id }, data: { whitelisted: false } });
    logRecoveryAction(req, "disable-whitelist");

    return this.getStatus();
  }

  @Post("/actions/restore-user-access")
  @Description("Unban a user and accept their whitelist status")
  async restoreUserAccess(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const { userId } = validateSchema(USER_ID_SCHEMA, body);
    await this.getUserOrThrow(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { banned: false, banReason: null, whitelistStatus: WhitelistStatus.ACCEPTED },
      select: USER_SELECT,
    });
    logRecoveryAction(req, "restore-user-access", { userId });

    return this.mapUser(updated);
  }

  @Post("/actions/reset-password")
  @Description("Set a new password for a user. Ends all of their sessions.")
  async resetPassword(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const data = validateSchema(RESET_PASSWORD_SCHEMA, body);
    await this.getUserOrThrow(data.userId);

    const password = hashSync(data.newPassword, genSaltSync());
    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: data.userId },
        data: { password, tempPassword: null },
        select: USER_SELECT,
      }),
      prisma.userSession.deleteMany({ where: { userId: data.userId } }),
    ]);
    logRecoveryAction(req, "reset-password", { userId: data.userId });

    return this.mapUser(updated);
  }

  @Post("/actions/disable-2fa")
  @Description("Remove two-factor authentication from a user")
  async disable2FA(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const { userId } = validateSchema(USER_ID_SCHEMA, body);
    await this.getUserOrThrow(userId);

    await prisma.user2FA.deleteMany({ where: { userId } });
    logRecoveryAction(req, "disable-2fa", { userId });

    return this.mapUser(await this.getUserOrThrow(userId));
  }

  @Post("/actions/unlink-discord")
  @Description("Unlink the Discord account from a user")
  async unlinkDiscord(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const { userId } = validateSchema(USER_ID_SCHEMA, body);
    await this.getUserOrThrow(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { discordId: null },
      select: USER_SELECT,
    });
    logRecoveryAction(req, "unlink-discord", { userId });

    return this.mapUser(updated);
  }

  @Post("/actions/unlink-steam")
  @Description("Unlink the Steam account from a user")
  async unlinkSteam(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const { userId } = validateSchema(USER_ID_SCHEMA, body);
    await this.getUserOrThrow(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { steamId: null },
      select: USER_SELECT,
    });
    logRecoveryAction(req, "unlink-steam", { userId });

    return this.mapUser(updated);
  }

  @Post("/actions/make-owner")
  @Description("Give a user the OWNER rank (e.g. when the only owner account is lost)")
  async makeOwner(@Req() req: Req, @BodyParams() body: unknown) {
    this.authorize(req);
    const { userId } = validateSchema(USER_ID_SCHEMA, body);
    await this.getUserOrThrow(userId);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { rank: Rank.OWNER, banned: false, whitelistStatus: WhitelistStatus.ACCEPTED },
      select: USER_SELECT,
    });
    logRecoveryAction(req, "make-owner", { userId });

    return this.mapUser(updated);
  }
}
