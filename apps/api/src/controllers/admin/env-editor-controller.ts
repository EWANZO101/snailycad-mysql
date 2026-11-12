import { spawn } from "node:child_process";
import { chmodSync, existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, Context } from "@tsed/platform-params";
import { ContentType, Description, Get, Put, Tags } from "@tsed/schema";
import { BadRequest, Forbidden } from "@tsed/exceptions";
import { Rank, type User } from "@prisma/client";
import { hasPermission } from "@snailycad/permissions";
import { z } from "zod";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findApiRoot } from "lib/recovery/recovery-token";
import {
  DEFAULT_PROTECTED_KEYS,
  KEY_REGEX,
  type EditorConfig,
  changedKeys,
  isProtected,
  maskContent,
  mergeForNonOwner,
  normalize,
  parseValues,
} from "lib/env-editor/env-file";
import {
  backupCurrentEnv,
  getEnvPaths,
  listEnvBackups,
  writeEnvEverywhere,
} from "lib/env-editor/env-backup";
import { assertNotDemoAccount } from "lib/demo/demo-mode";
import { validateSchema } from "lib/data/validate-schema";
import { prisma } from "lib/data/prisma";

/**
 * Admin > CAD Settings > Environment (.env): edit the CAD's .env file in the browser.
 *
 * - The owner can always use it. Only the owner can turn it on for others and pick which users
 *   (who can already manage CAD settings) may edit it.
 * - Protected keys (database settings, secrets, tokens, passwords, ...) are only shown to and
 *   changeable by the owner. Other users see "********" and their changes to them are ignored.
 * - Every save backs up the old file to `.env-backups/` (last 20 kept) and updates the
 *   `apps/api/.env` and `apps/client/.env` copies when they exist.
 * - The editor settings live in `apps/api/.env-editor.json` (not in .env or the database).
 */

const MAX_SIZE = 100_000;

const SAVE_SCHEMA = z.object({
  content: z.string().max(MAX_SIZE),
  restart: z.boolean().default(false),
});

const SETTINGS_SCHEMA = z.object({
  enabled: z.boolean(),
  userIds: z.array(z.string().min(1).max(255)).max(100),
  protectedKeys: z.array(z.string().regex(KEY_REGEX).max(255)).max(200),
});

function getConfigPath() {
  return join(findApiRoot(), ".env-editor.json");
}

function writeSecureFile(path: string, content: string) {
  const tmpPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tmpPath, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(tmpPath, 0o600);
  renameSync(tmpPath, path);
}

function readConfig(): EditorConfig {
  const configPath = getConfigPath();
  try {
    if (existsSync(configPath)) {
      const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Partial<EditorConfig>;
      return {
        enabled: parsed.enabled === true,
        userIds: Array.isArray(parsed.userIds) ? parsed.userIds.map(String) : [],
        protectedKeys: Array.isArray(parsed.protectedKeys)
          ? parsed.protectedKeys.map(String).filter((key) => KEY_REGEX.test(key))
          : [],
      };
    }
  } catch {
    // a broken config file means: off, nobody else allowed
  }
  return { enabled: false, userIds: [], protectedKeys: [] };
}

function canRestart() {
  return Boolean(process.env.SNAILYCAD_SERVICE_NAME) && existsSync("/run/systemd/system");
}

/** systemd restarts the service after we've responded */
function restartCad() {
  const serviceName = process.env.SNAILYCAD_SERVICE_NAME;
  if (!serviceName || !canRestart()) return false;

  setTimeout(() => {
    spawn("systemctl", ["restart", "--no-block", serviceName], {
      stdio: "ignore",
      detached: true,
    }).unref();
  }, 3000);
  return true;
}

function getAccess(user: User) {
  const config = readConfig();
  const isOwner = user.rank === Rank.OWNER;
  const isAllowed = isOwner || (config.enabled && config.userIds.includes(user.id));
  return { config, isOwner, isAllowed };
}

@Tags("Admin")
@Controller("/admin/env-editor")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class EnvEditorController {
  @Get("/")
  @Description("The .env file (protected values masked for non-owners) and the editor settings")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async getEnv(@Context("user") user: User) {
    const { config, isOwner, isAllowed } = getAccess(user);
    const { envPath } = getEnvPaths();

    const base = {
      isOwner,
      isAllowed,
      enabled: config.enabled,
      canRestart: canRestart(),
    };

    if (!isAllowed) {
      return { ...base, content: null };
    }

    const content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    const keys = [...parseValues(content).keys()];

    return {
      ...base,
      path: envPath,
      content: isOwner ? content : maskContent(content, config),
      protectedKeys: keys.filter((key) => isProtected(key, config)),
      backups: isOwner ? listEnvBackups() : [],
      settings: isOwner ? await getSettings(config) : null,
    };
  }

  @Put("/")
  @Description("Save the .env file. Backs up the old one first.")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async saveEnv(@Context("user") user: User, @BodyParams() body: unknown) {
    await assertNotDemoAccount(user.id);
    const { config, isOwner, isAllowed } = getAccess(user);
    if (!isAllowed) {
      throw new Forbidden("envEditorNotAllowed");
    }

    const data = validateSchema(SAVE_SCHEMA, body);
    if (data.content.includes("\0")) {
      throw new BadRequest("invalidContent");
    }

    const { envPath } = getEnvPaths();
    const current = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
    const submitted = normalize(data.content);
    const next = normalize(isOwner ? submitted : mergeForNonOwner(current, submitted, config));

    const changed = changedKeys(current, next);
    if (next === current) {
      return {
        saved: false,
        changedKeys: [],
        backup: null,
        restarting: false,
        needsRebuild: false,
      };
    }

    const backup = backupCurrentEnv();
    writeEnvEverywhere(next);

    // never log values
    console.info(
      `[env-editor] .env saved by user ${user.id} (${user.username}). Changed: ${
        changed.join(", ") || "comments/formatting"
      }`,
    );

    const restarting = data.restart ? restartCad() : false;

    return {
      saved: true,
      changedKeys: changed,
      backup,
      restarting,
      // NEXT_PUBLIC_* values are baked into the client when it's built
      needsRebuild: changed.some((key) => key.startsWith("NEXT_PUBLIC_") || key === "PORT_CLIENT"),
    };
  }

  @Put("/settings")
  @Description("Owner only. Turn the editor on for others and pick who can use it.")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async updateSettings(@Context("user") user: User, @BodyParams() body: unknown) {
    await assertNotDemoAccount(user.id);
    if (user.rank !== Rank.OWNER) {
      throw new Forbidden("onlyOwnerCanChangeEnvEditor");
    }

    const data = validateSchema(SETTINGS_SCHEMA, body);
    const existing = await prisma.user.findMany({
      where: { id: { in: data.userIds } },
      select: { id: true },
    });

    const config: EditorConfig = {
      enabled: data.enabled,
      userIds: existing.map((u) => u.id),
      protectedKeys: [...new Set(data.protectedKeys)],
    };
    writeSecureFile(getConfigPath(), `${JSON.stringify(config, null, 2)}\n`);
    console.info(
      `[env-editor] settings changed by owner ${user.id}: enabled=${config.enabled}, users=${config.userIds.length}`,
    );

    return getSettings(config);
  }
}

/** the owner's view: the settings plus the users who could be allowed (they can manage CAD settings) */
async function getSettings(config: EditorConfig) {
  const users = await prisma.user.findMany({
    where: { rank: { not: Rank.OWNER } },
    select: {
      id: true,
      username: true,
      rank: true,
      permissions: true,
      roles: { select: { permissions: true } },
    },
    orderBy: { username: "asc" },
    take: 5000,
  });

  const candidates = users
    .filter((u) =>
      hasPermission({
        permissionsToCheck: [Permissions.ManageCADSettings],
        userToCheck: u as any,
      }),
    )
    .map((u) => ({ id: u.id, username: u.username, rank: u.rank }));

  return {
    enabled: config.enabled,
    userIds: config.userIds,
    protectedKeys: config.protectedKeys,
    defaultProtectedKeys: DEFAULT_PROTECTED_KEYS,
    candidates,
  };
}
