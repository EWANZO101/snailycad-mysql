import { execFile, spawn } from "node:child_process";
import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, isAbsolute, join, resolve } from "node:path";
import { promisify } from "node:util";
import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, Context } from "@tsed/platform-params";
import { ContentType, Description, Get, Post, Tags } from "@tsed/schema";
import { BadRequest, Forbidden } from "@tsed/exceptions";
import { Rank, type User } from "@prisma/client";
import { z } from "zod";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findApiRoot } from "lib/recovery/recovery-token";
import { assertNotDemoAccount } from "lib/demo/demo-mode";
import { validateSchema } from "lib/data/validate-schema";
import { prisma } from "lib/data/prisma";

const execFileAsync = promisify(execFile);

/**
 * Admin > CAD Settings > Import from PostgreSQL: copies a PostgreSQL SnailyCAD into this
 * MySQL/MariaDB CAD with scripts/mysql/migrate-data.mjs (PostgreSQL is only read).
 *
 * - "values": departments, statuses, penal codes, ... into a CAD that has no values yet
 * - "replace": everything, replacing this CAD's data in one transaction (owner only)
 */

const SOURCE_SCHEMA = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("url"),
    url: z
      .string()
      .trim()
      .regex(/^postgres(ql)?:\/\//),
  }),
  z.object({
    type: z.literal("fields"),
    host: z.string().trim().min(1).max(255),
    port: z.coerce.number().int().min(1).max(65535).default(5432),
    user: z.string().trim().min(1).max(255),
    password: z.string().max(1024).default(""),
    database: z.string().trim().min(1).max(255),
  }),
  z.object({ type: z.literal("env"), path: z.string().trim().min(1).max(1024) }),
]);

const START_SCHEMA = z.object({
  source: SOURCE_SCHEMA,
  mode: z.enum(["values", "replace"]),
  confirmation: z.string().optional(),
  copyEncryptionToken: z.boolean().default(false),
});

interface ImportJob {
  state: "idle" | "running" | "done" | "failed";
  mode: "values" | "replace" | null;
  startedAt: string | null;
  finishedAt: string | null;
  lines: string[];
  error: string | null;
  needsRestart: boolean;
}

let job: ImportJob = {
  state: "idle",
  mode: null,
  startedAt: null,
  finishedAt: null,
  lines: [],
  error: null,
  needsRestart: false,
};

function getProjectRoot() {
  return resolve(findApiRoot(), "..", "..");
}

/** expands ${VAR} the way Prisma does (plain dotenv leaves them in DATABASE_URL) */
function expandEnv(value: string, env: Record<string, string | undefined> = process.env) {
  return value.replace(/\$\{(\w+)\}/g, (_, name: string) => env[name] ?? "");
}

function readEnvFile(path: string) {
  const values: Record<string, string> = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2]!.trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    values[match[1]!] = value;
  }
  for (const key of Object.keys(values)) {
    values[key] = expandEnv(values[key]!, values);
  }
  return values;
}

/** never show passwords in responses or the job log */
function redact(text: string) {
  return text.replace(/(postgres(?:ql)?|mysql):\/\/([^:/@\s]+):[^@\s]*@/g, "$1://$2:****@");
}

function resolveSource(source: z.infer<typeof SOURCE_SCHEMA>) {
  if (source.type === "url") {
    return { pgUrl: source.url, encryptionToken: null as string | null };
  }

  if (source.type === "fields") {
    const auth = `${encodeURIComponent(source.user)}:${encodeURIComponent(source.password)}`;
    return {
      pgUrl: `postgresql://${auth}@${source.host}:${source.port}/${encodeURIComponent(source.database)}`,
      encryptionToken: null as string | null,
    };
  }

  // only a file called .env can be read, and only its database settings and encryption token are used
  const path = source.path;
  if (!isAbsolute(path) || basename(path) !== ".env") {
    throw new BadRequest("envPathMustBeAbsoluteDotEnv");
  }
  if (!existsSync(path) || !statSync(path).isFile()) {
    throw new BadRequest("envFileNotFound");
  }

  const env = readEnvFile(path);
  let pgUrl = env.DATABASE_URL;
  if (!pgUrl?.startsWith("postgres") && env.POSTGRES_USER) {
    const auth = `${encodeURIComponent(env.POSTGRES_USER)}:${encodeURIComponent(env.POSTGRES_PASSWORD ?? "")}`;
    pgUrl = `postgresql://${auth}@${env.DB_HOST || "localhost"}:${env.DB_PORT || "5432"}/${env.POSTGRES_DB}`;
  }
  if (!pgUrl?.startsWith("postgres")) {
    throw new BadRequest("envFileHasNoPostgresDatabase");
  }

  return { pgUrl, encryptionToken: env.ENCRYPTION_TOKEN ?? null };
}

function cleanPgUrl(url: string) {
  // psql doesn't understand Prisma-only parameters such as ?schema=public
  return url.replace(/([?&])schema=[^&]*&?/, "$1").replace(/[?&]$/, "");
}

async function psql(pgUrl: string, sql: string) {
  try {
    const { stdout } = await execFileAsync(
      "psql",
      [pgUrl, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql],
      { env: { ...process.env, PGCONNECT_TIMEOUT: "10", PGTZ: "UTC" }, timeout: 30_000 },
    );
    return stdout.trim();
  } catch (error: any) {
    if (error?.code === "ENOENT") {
      throw new BadRequest("psqlNotInstalled");
    }
    const message = String(error?.stderr || error?.message || "unknown error").trim();
    throw new BadRequest(redact(message).split("\n")[0]!.slice(0, 300));
  }
}

function getTargetUrl() {
  const url = expandEnv(process.env.DATABASE_URL ?? "");
  if (!url.startsWith("mysql://")) {
    throw new BadRequest("databaseUrlNotMysql");
  }
  return url;
}

function migrateDataArgs(mode: "values" | "replace", extra: string[] = []) {
  const script = join(getProjectRoot(), "scripts", "mysql", "migrate-data.mjs");
  if (!existsSync(script)) {
    throw new BadRequest("migrateScriptMissing");
  }
  return [script, ...(mode === "values" ? ["--values"] : ["--replace"]), ...extra];
}

async function previewRows(pgUrl: string, mode: "values" | "replace") {
  try {
    const { stdout } = await execFileAsync(process.execPath, migrateDataArgs(mode, ["--dry-run"]), {
      cwd: findApiRoot(),
      env: { ...process.env, PG_URL: pgUrl, DATABASE_URL: getTargetUrl() },
      timeout: 5 * 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    const match = stdout.match(/Read (\d+) rows from (\d+) tables/);
    return { rows: Number(match?.[1] ?? 0), tables: Number(match?.[2] ?? 0) };
  } catch (error: any) {
    throw new BadRequest(
      redact(String(error?.stderr || error?.message))
        .trim()
        .slice(0, 300),
    );
  }
}

async function assertOwner(user: User) {
  await assertNotDemoAccount(user.id);
  if (user.rank !== Rank.OWNER) {
    throw new Forbidden("onlyOwnerCanImport");
  }
}

@Tags("Admin")
@Controller("/admin/import-postgres")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class ImportPostgresController {
  @Get("/status")
  @Description("The progress of the current or last PostgreSQL import")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async getStatus() {
    return job;
  }

  @Post("/check")
  @Description("Check a PostgreSQL CAD before importing it: connection, size and conflicts")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async check(@BodyParams() body: unknown, @Context("user") user: User) {
    await assertOwner(user);
    const data = validateSchema(START_SCHEMA.pick({ source: true, mode: true }), body);
    const { pgUrl: rawUrl, encryptionToken } = resolveSource(data.source);
    const pgUrl = cleanPgUrl(rawUrl);

    const [version, users] = await Promise.all([
      psql(pgUrl, "SHOW server_version"),
      // eslint-disable-next-line quotes
      psql(pgUrl, 'SELECT COUNT(*) FROM "User"'),
    ]);

    const duplicateUsernames = (
      await psql(
        pgUrl,
        "SELECT string_agg(username, ' / ') FROM \"User\" GROUP BY lower(username) HAVING COUNT(*) > 1",
      )
    )
      .split("\n")
      .filter(Boolean);

    // values can only be added to a CAD that doesn't have any yet
    const existingValues = await prisma.value.count();
    // a values import can't run when this CAD already has values (the preview would refuse too)
    const preview =
      data.mode === "values" && existingValues > 0
        ? { rows: 0, tables: 0 }
        : await previewRows(pgUrl, data.mode);

    const currentToken = process.env.ENCRYPTION_TOKEN ?? null;
    const tokenStatus =
      encryptionToken === null
        ? "unknown"
        : encryptionToken === currentToken
          ? "matches"
          : "different";

    const problems: string[] = [];
    if (data.mode === "replace" && duplicateUsernames.length) problems.push("duplicateUsernames");
    if (data.mode === "values" && existingValues > 0) problems.push("valuesNotEmpty");

    return {
      postgresVersion: version,
      users: Number(users),
      rows: preview.rows,
      tables: preview.tables,
      duplicateUsernames: data.mode === "replace" ? duplicateUsernames : [],
      existingValues,
      encryptionToken: tokenStatus,
      problems,
      canImport: problems.length === 0,
    };
  }

  @Post("/start")
  @Description("Start importing a PostgreSQL CAD into this CAD")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async start(@BodyParams() body: unknown, @Context("user") user: User) {
    await assertOwner(user);
    const data = validateSchema(START_SCHEMA, body);

    if (job.state === "running") {
      throw new BadRequest("importAlreadyRunning");
    }
    if (data.mode === "replace" && data.confirmation !== "REPLACE") {
      throw new BadRequest("typeReplaceToConfirm");
    }
    if (data.mode === "values") {
      if ((await prisma.value.count()) > 0) throw new BadRequest("valuesNotEmpty");
    }

    const { pgUrl: rawUrl, encryptionToken } = resolveSource(data.source);
    const pgUrl = cleanPgUrl(rawUrl);
    const args = migrateDataArgs(data.mode);
    const targetUrl = getTargetUrl();

    job = {
      state: "running",
      mode: data.mode,
      startedAt: new Date().toISOString(),
      finishedAt: null,
      lines: [data.mode === "values" ? "Importing the values..." : "Importing everything..."],
      error: null,
      needsRestart: false,
    };

    const child = spawn(process.execPath, args, {
      cwd: findApiRoot(),
      env: { ...process.env, PG_URL: pgUrl, DATABASE_URL: targetUrl },
      stdio: ["ignore", "pipe", "pipe"],
    });

    const addLines = (chunk: Buffer) => {
      for (const line of redact(String(chunk)).split("\n")) {
        if (line.trim()) job.lines.push(line.trim());
      }
      job.lines = job.lines.slice(-200);
    };
    let stderr = "";
    child.stdout.on("data", addLines);
    child.stderr.on("data", (chunk) => (stderr += String(chunk)));

    child.on("close", (code) => {
      job.finishedAt = new Date().toISOString();

      if (code !== 0) {
        job.state = "failed";
        job.error = redact(stderr.trim() || `exited with code ${code}`).slice(0, 2000);
        job.lines.push("The import failed and was rolled back. Nothing was changed.");
        return;
      }

      job.state = "done";
      if (
        data.mode === "replace" &&
        data.copyEncryptionToken &&
        encryptionToken &&
        encryptionToken !== process.env.ENCRYPTION_TOKEN
      ) {
        try {
          copyEncryptionToken(encryptionToken);
          job.lines.push("Copied the old CAD's ENCRYPTION_TOKEN into .env.");
          job.needsRestart = true;
          restartCad();
        } catch (error) {
          job.lines.push(`Couldn't update .env: ${String(error)}`);
        }
      }
    });

    return { started: true };
  }
}

function copyEncryptionToken(token: string) {
  const root = getProjectRoot();
  for (const path of [
    join(root, ".env"),
    join(root, "apps", "api", ".env"),
    join(root, "apps", "client", ".env"),
  ]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    const line = `ENCRYPTION_TOKEN="${token}"`;
    writeFileSync(
      path,
      /^ENCRYPTION_TOKEN=.*$/m.test(text)
        ? text.replace(/^ENCRYPTION_TOKEN=.*$/m, line)
        : `${text.trimEnd()}\n${line}\n`,
    );
  }
}

/** the new token is only used after a restart; systemd restarts the service after we've responded */
function restartCad() {
  const serviceName = process.env.SNAILYCAD_SERVICE_NAME;
  if (!serviceName || !existsSync("/run/systemd/system")) {
    job.lines.push("Restart the CAD so it uses the new ENCRYPTION_TOKEN.");
    return;
  }
  job.lines.push(`Restarting ${serviceName} in a few seconds...`);
  setTimeout(() => {
    spawn("systemctl", ["restart", "--no-block", serviceName], {
      stdio: "ignore",
      detached: true,
    }).unref();
  }, 5000);
}
