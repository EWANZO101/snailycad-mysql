import { spawn } from "node:child_process";
import { chmodSync, existsSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { hashSync, genSaltSync } from "bcrypt";
import { Rank, WhitelistStatus } from "@prisma/client";
import { BadRequest } from "@tsed/exceptions";
import { $log } from "@tsed/logger";
import { prisma } from "lib/data/prisma";
import { findOrCreateCAD } from "lib/upsert-cad";
import { findApiRoot } from "lib/recovery/recovery-token";

/**
 * Demo mode.
 *
 * When `DEMO_MODE=true`:
 * - a demo account (`DEMO_USERNAME` / `DEMO_PASSWORD`) is created as an owner (full admin),
 * - its credentials are shown on the login page,
 * - every `DEMO_RESET_MINUTES` (default 10) all data is reset to a baseline snapshot.
 *
 * The baseline is a data-only `pg_dump` taken once, the first time demo mode starts, and stored in
 * `apps/api/.demo-baseline.sql`. Delete that file and restart the API to take a new baseline.
 */

const DEFAULT_RESET_MINUTES = 10;

let nextResetAt: Date | null = null;
let isResetting = false;

export function isDemoMode() {
  return process.env.DEMO_MODE === "true";
}

export function getDemoConfig() {
  const minutes = Number(process.env.DEMO_RESET_MINUTES);

  return {
    username: process.env.DEMO_USERNAME || "demo",
    password: process.env.DEMO_PASSWORD || "demo1234",
    resetMinutes: Number.isFinite(minutes) && minutes >= 1 ? minutes : DEFAULT_RESET_MINUTES,
  };
}

export function getDemoStatus() {
  if (!isDemoMode()) {
    return { enabled: false as const };
  }

  const config = getDemoConfig();
  return {
    enabled: true as const,
    username: config.username,
    password: config.password,
    resetMinutes: config.resetMinutes,
    nextResetAt: nextResetAt?.toISOString() ?? null,
  };
}

/**
 * throws when demo mode is enabled and `userId` is the demo account. Used to stop people from
 * locking everyone else out of the demo (password changes, bans, deletion, ...).
 */
export async function assertNotDemoAccount(userId: string | null | undefined) {
  if (!isDemoMode() || !userId) return;

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } });
  if (user?.username === getDemoConfig().username) {
    throw new BadRequest("demoAccountIsProtected");
  }
}

function getBaselinePath() {
  return process.env.DEMO_BASELINE_FILE || join(findApiRoot(), ".demo-baseline.sql");
}

function getPgEnv() {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const url = process.env.DATABASE_URL;

  if (url && !url.includes("${")) {
    try {
      const parsed = new URL(url);
      env.PGHOST = parsed.hostname;
      env.PGPORT = parsed.port || "5432";
      env.PGUSER = decodeURIComponent(parsed.username);
      env.PGPASSWORD = decodeURIComponent(parsed.password);
      env.PGDATABASE = decodeURIComponent(parsed.pathname.slice(1));
      return env;
    } catch {
      // fall back to the individual variables
    }
  }

  env.PGHOST = process.env.DB_HOST || "localhost";
  env.PGPORT = process.env.DB_PORT || "5432";
  env.PGUSER = process.env.POSTGRES_USER;
  env.PGPASSWORD = process.env.POSTGRES_PASSWORD;
  env.PGDATABASE = process.env.POSTGRES_DB;
  return env;
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { env: getPgEnv(), stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with code ${code}: ${stderr.slice(0, 2000)}`));
    });
  });
}

async function ensureDemoAccount() {
  const config = getDemoConfig();
  const password = hashSync(config.password, genSaltSync());

  const existing = await prisma.user.findUnique({ where: { username: config.username } });
  const data = {
    password,
    rank: Rank.OWNER,
    whitelistStatus: WhitelistStatus.ACCEPTED,
    banned: false,
    banReason: null,
    tempPassword: null,
  };

  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data })
    : await prisma.user.create({ data: { username: config.username, ...data } });

  await prisma.user2FA.deleteMany({ where: { userId: user.id } });

  if ((await prisma.cad.count()) <= 0) {
    await findOrCreateCAD({ ownerId: user.id });
  }
}

async function takeBaseline() {
  const baselinePath = getBaselinePath();
  const tmpPath = `${baselinePath}.${process.pid}.tmp`;

  await run("pg_dump", [
    "--data-only",
    "--no-owner",
    "--no-privileges",
    "--exclude-table=_prisma_migrations",
    "--file",
    tmpPath,
  ]);
  // the snapshot contains password hashes
  chmodSync(tmpPath, 0o600);
  renameSync(tmpPath, baselinePath);
  $log.info(`[demo] baseline snapshot saved to ${baselinePath}`);
}

export async function resetDemoData() {
  const baselinePath = getBaselinePath();
  if (isResetting || !existsSync(baselinePath)) return;
  isResetting = true;

  const scriptPath = join(findApiRoot(), `.demo-reset.${process.pid}.sql`);

  try {
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'
    `;
    const tableList = tables.map((t) => `"public"."${t.tablename.replace(/"/g, '""')}"`).join(", ");

    // single transaction: either everything is reset, or nothing changes.
    writeFileSync(
      scriptPath,
      [
        "SET lock_timeout = '15s';",
        // skip FK triggers while reloading, the baseline is consistent as a whole
        "SET session_replication_role = replica;",
        `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE;`,
        `\\i '${baselinePath.replace(/'/g, "''")}'`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );

    await run("psql", ["-v", "ON_ERROR_STOP=1", "--single-transaction", "-q", "-f", scriptPath]);
    $log.info("[demo] data reset to baseline");
  } catch (error) {
    $log.error("[demo] failed to reset data", error);
  } finally {
    isResetting = false;
    try {
      unlinkSync(scriptPath);
    } catch {
      // already gone
    }
  }
}

function scheduleNextReset() {
  const intervalMs = getDemoConfig().resetMinutes * 60_000;
  // aligned to the clock (e.g. :00, :10, :20) so the countdown is predictable
  const next = Math.ceil((Date.now() + 1000) / intervalMs) * intervalMs;
  nextResetAt = new Date(next);

  setTimeout(async () => {
    await resetDemoData();
    scheduleNextReset();
  }, next - Date.now()).unref();
}

export async function startDemoMode() {
  if (!isDemoMode()) return;

  try {
    await ensureDemoAccount();

    if (!existsSync(getBaselinePath())) {
      await takeBaseline();
    }

    scheduleNextReset();
    $log.info(
      `[demo] demo mode enabled, data resets every ${getDemoConfig().resetMinutes} minute(s)`,
    );
  } catch (error) {
    $log.error("[demo] failed to start demo mode", error);
  }
}
