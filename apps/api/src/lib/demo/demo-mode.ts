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
 * The baseline is a data-only `mysqldump` / `mariadb-dump` taken once, the first time demo mode starts, and stored in
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

interface DbConnection {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
}

function getDbConnection(): DbConnection {
  const url = process.env.DATABASE_URL;
  if (!url || url.includes("${")) {
    throw new Error("DATABASE_URL must be a complete mysql:// URL for demo mode");
  }

  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parsed.port || "3306",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: decodeURIComponent(parsed.pathname.slice(1)),
  };
}

/** MariaDB ships `mariadb-dump`/`mariadb`; MySQL's `mysqldump` is not fully compatible with it */
async function getClientCommands() {
  const [row] = await prisma.$queryRaw<{ version: string }[]>`SELECT VERSION() AS version`;
  const isMariaDb = /mariadb/i.test(row?.version ?? "");
  return isMariaDb
    ? { dump: "mariadb-dump", client: "mariadb", extraDumpArgs: [] as string[] }
    : {
        dump: "mysqldump",
        client: "mysql",
        extraDumpArgs: ["--set-gtid-purged=OFF", "--no-tablespaces"],
      };
}

function connectionArgs(connection: DbConnection) {
  return [
    "--protocol=TCP",
    `--host=${connection.host}`,
    `--port=${connection.port}`,
    `--user=${connection.user}`,
  ];
}

function run(command: string, args: string[]) {
  const connection = getDbConnection();
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      // keeps the password out of the process list
      env: { ...process.env, MYSQL_PWD: connection.password },
      stdio: ["ignore", "ignore", "pipe"],
    });
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
  const connection = getDbConnection();
  const commands = await getClientCommands();

  await run(commands.dump, [
    ...connectionArgs(connection),
    "--no-create-info",
    "--skip-triggers",
    "--complete-insert",
    "--single-transaction",
    "--skip-add-locks",
    "--skip-disable-keys",
    ...commands.extraDumpArgs,
    `--ignore-table=${connection.database}._prisma_migrations`,
    `--result-file=${tmpPath}`,
    connection.database,
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
    const connection = getDbConnection();
    const commands = await getClientCommands();
    const tables = await prisma.$queryRaw<{ name: string }[]>`
      SELECT TABLE_NAME AS name FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
        AND TABLE_NAME <> '_prisma_migrations'
    `;

    // one transaction: either everything is reset, or nothing changes. TRUNCATE can't be used
    // because it commits implicitly in MySQL/MariaDB.
    writeFileSync(
      scriptPath,
      [
        "SET SESSION innodb_lock_wait_timeout = 15;",
        // the baseline is consistent as a whole, so foreign keys are checked by the snapshot itself
        "SET FOREIGN_KEY_CHECKS = 0;",
        "START TRANSACTION;",
        ...tables.map((table) => `DELETE FROM \`${table.name.replace(/`/g, "``")}\`;`),
        `SOURCE ${baselinePath};`,
        "COMMIT;",
        "SET FOREIGN_KEY_CHECKS = 1;",
        "",
      ].join("\n"),
      { mode: 0o600 },
    );

    await run(commands.client, [
      ...connectionArgs(connection),
      `--database=${connection.database}`,
      `--execute=SOURCE ${scriptPath}`,
    ]);
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
