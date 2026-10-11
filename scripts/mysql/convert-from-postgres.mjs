#!/usr/bin/env node
/**
 * Converts a PostgreSQL SnailyCAD into this MySQL / MariaDB CAD, step by step:
 *
 *  1. reads the old CAD's database settings (its .env, or --pg-url)
 *  2. checks both databases can be reached and that the MySQL/MariaDB database is empty
 *  3. checks the old data for things MySQL can't store (e.g. usernames that only differ in case)
 *  4. creates the tables (prisma migrate deploy)
 *  5. shows what will be copied and asks for confirmation
 *  6. copies everything in one transaction and verifies every table's row count
 *  7. makes sure ENCRYPTION_TOKEN matches the old CAD (encrypted data can't be read otherwise)
 *
 * PostgreSQL is only read. Nothing is written to the MySQL/MariaDB database before step 4.
 *
 * usage (from the root of this CAD):
 *   pnpm convert:postgres --from-env /home/me/snaily-cadv4/.env
 *   pnpm convert:postgres --pg-url postgresql://user:pass@localhost:5432/snaily-cad-v4
 * options:
 *   --mysql-url URL  convert into this database instead of the one in this CAD's .env
 *                    (this CAD's .env is then never changed)
 *   --yes            don't ask for confirmation
 *   --values         copy only the values (departments, statuses, penal codes, ...)
 *   --copy-encryption-token   copy the old ENCRYPTION_TOKEN into this .env without asking
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline/promises";
import { createRequire } from "node:module";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const API_DIR = join(ROOT, "apps", "api");
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};

const color = (code) => (text) => (process.stdout.isTTY ? `\x1b[${code}m${text}\x1b[0m` : text);
const bold = color("1");
const green = color("32");
const yellow = color("33");
const red = color("31");
const step = (n, text) => console.log(`\n${bold(`[${n}/7]`)} ${text}`);
const ok = (text) => console.log(`  ${green("✓")} ${text}`);
const warn = (text) => console.log(`  ${yellow("!")} ${text}`);
function fail(text) {
  console.error(`\n${red("✗")} ${text}`);
  process.exit(1);
}

/** reads a .env file, expanding ${VAR} references like Prisma does */
function readEnvFile(path) {
  const values = {};
  for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    else value = value.replace(/\s+#.*$/, "");
    values[match[1]] = value;
  }
  for (const key of Object.keys(values)) {
    values[key] = values[key].replace(
      /\$\{(\w+)\}/g,
      (_, name) => values[name] ?? process.env[name] ?? "",
    );
  }
  return values;
}

function redact(url) {
  return url.replace(/\/\/([^:/@]+):[^@]*@/, "//$1:****@");
}

function run(command, commandArgs, options = {}) {
  return spawnSync(command, commandArgs, { encoding: "utf8", ...options });
}

function psql(pgUrl, sql) {
  const result = run("psql", [pgUrl, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    env: { ...process.env, PGTZ: "UTC", PGCONNECT_TIMEOUT: "10" },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim());
  return result.stdout.trim();
}

async function confirm(question) {
  if (flag("yes")) return true;
  if (!process.stdin.isTTY) fail("Run in a terminal to confirm, or pass --yes.");
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`  ${question} [y/N] `);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  console.log(bold("SnailyCAD: convert a PostgreSQL CAD to MySQL / MariaDB"));

  // ---- 1. settings
  step(1, "Reading the database settings");
  const thisEnvPath = join(ROOT, ".env");
  if (!existsSync(thisEnvPath)) fail(`No .env in ${ROOT}. Set up this CAD's .env first.`);
  const thisEnv = readEnvFile(thisEnvPath);
  const targetIsThisCad = !option("mysql-url");
  const mysqlUrl = option("mysql-url") ?? thisEnv.DATABASE_URL;
  if (!mysqlUrl?.startsWith("mysql://")) {
    fail("DATABASE_URL in this CAD's .env must be a mysql:// URL (see .env.example).");
  }

  let oldEnv = null;
  let pgUrl = option("pg-url");
  const fromEnv = option("from-env");
  if (fromEnv) {
    const path = resolve(fromEnv);
    if (!existsSync(path)) fail(`${path} does not exist.`);
    oldEnv = readEnvFile(path);
    pgUrl ??= oldEnv.DATABASE_URL;
    if (!pgUrl && oldEnv.POSTGRES_USER) {
      pgUrl = `postgresql://${encodeURIComponent(oldEnv.POSTGRES_USER)}:${encodeURIComponent(
        oldEnv.POSTGRES_PASSWORD ?? "",
      )}@${oldEnv.DB_HOST || "localhost"}:${oldEnv.DB_PORT || "5432"}/${oldEnv.POSTGRES_DB}`;
    }
  }
  if (!pgUrl?.startsWith("postgres")) {
    fail("Tell me where the old CAD is: --from-env /path/to/old/.env or --pg-url postgresql://...");
  }
  // psql doesn't understand Prisma-only parameters such as ?schema=public
  pgUrl = pgUrl.replace(/([?&])schema=[^&]*&?/, "$1").replace(/[?&]$/, "");
  ok(`From: ${redact(pgUrl)}`);
  ok(`To:   ${redact(mysqlUrl)}`);

  // ---- 2. connections
  step(2, "Checking both databases");
  if (run("psql", ["--version"]).error) {
    fail(
      "psql is not installed. Install the PostgreSQL client (Ubuntu: sudo apt install postgresql-client).",
    );
  }
  try {
    const version = psql(pgUrl, "SHOW server_version");
    const users = psql(pgUrl, 'SELECT COUNT(*) FROM "User"');
    ok(`PostgreSQL ${version} reachable, ${users} user(s)`);
  } catch (error) {
    fail(`Can't read the PostgreSQL CAD: ${error.message}`);
  }

  process.env.DATABASE_URL = mysqlUrl;
  const require = createRequire(join(API_DIR, "package.json"));
  let prisma;
  try {
    const { PrismaClient } = require("@prisma/client");
    prisma = new PrismaClient();
    const [{ version }] = await prisma.$queryRaw`SELECT VERSION() AS version`;
    ok(`MySQL/MariaDB ${version} reachable`);
  } catch (error) {
    fail(
      `Can't connect to MySQL/MariaDB: ${error.message?.split("\n").pop()}\n  Did you run pnpm install and create the database and user?`,
    );
  }

  const tablesWithRows = [];
  const existing = await prisma.$queryRaw`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME <> '_prisma_migrations'
  `;
  // --values copies into a CAD that already has accounts; the copy itself checks the value tables
  const valueOnly = flag("values");
  for (const { name } of valueOnly ? [] : existing) {
    const [{ count }] = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM \`${name}\``);
    if (Number(count) > 0) tablesWithRows.push(`${name} (${count})`);
  }
  if (tablesWithRows.length) {
    fail(
      `The MySQL/MariaDB database already has data in: ${tablesWithRows.slice(0, 8).join(", ")}${
        tablesWithRows.length > 8 ? ", ..." : ""
      }\n  Use a new, empty database so nothing is mixed or overwritten.`,
    );
  }
  ok(
    valueOnly
      ? "Values only: existing accounts and settings are kept"
      : existing.length
        ? "Target is empty"
        : "Target has no tables yet",
  );

  // ---- 3. data checks
  step(3, "Checking the old data");
  const problems = [];
  if (!valueOnly) {
    const duplicates = psql(
      pgUrl,
      `SELECT string_agg(username, ' / ') FROM "User" GROUP BY lower(username) HAVING COUNT(*) > 1`,
    );
    if (duplicates) {
      problems.push(
        `Usernames that only differ in upper/lower case (MySQL treats them as the same):\n    ${duplicates
          .split("\n")
          .join("\n    ")}\n  Rename one of each pair in the old CAD, then run this again.`,
      );
    }
  }
  if (problems.length) fail(problems.join("\n  "));
  ok("No conflicts found");

  // ---- 4. schema
  step(4, "Creating the tables");
  const migrate = run("pnpm", ["prisma", "migrate", "deploy"], {
    cwd: API_DIR,
    env: { ...process.env, DATABASE_URL: mysqlUrl },
  });
  if (migrate.status !== 0)
    fail(`prisma migrate deploy failed:\n${migrate.stdout}${migrate.stderr}`);
  ok("Tables are up to date");

  // ---- 5. preview
  step(5, "What will be copied");
  const copyArgs = [
    join(ROOT, "scripts", "mysql", "migrate-data.mjs"),
    ...(valueOnly ? ["--values"] : []),
  ];
  const childEnv = { ...process.env, PG_URL: pgUrl, DATABASE_URL: mysqlUrl };
  const preview = run(process.execPath, [...copyArgs, "--dry-run"], {
    cwd: API_DIR,
    env: childEnv,
  });
  if (preview.status !== 0)
    fail(`Reading the old CAD failed:\n${preview.stderr || preview.stdout}`);
  const summary = preview.stdout.split("\n").find((line) => line.startsWith("Read ")) ?? "";
  ok(summary.replace(/\.$/, "") + (valueOnly ? " (values only)" : ""));

  if (!(await confirm("Copy this data into the MySQL/MariaDB database?"))) {
    console.log("\nStopped. Nothing was copied.");
    await prisma.$disconnect();
    return;
  }

  // ---- 6. copy
  step(6, "Copying (one transaction: all or nothing)");
  await prisma.$disconnect();
  const exitCode = await new Promise((resolvePromise) => {
    const child = spawn(process.execPath, copyArgs, {
      cwd: API_DIR,
      env: childEnv,
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (chunk) => {
      for (const line of String(chunk).split("\n")) {
        if (line.startsWith("Done")) ok(line);
      }
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("close", (code) => {
      if (code !== 0) console.error(`  ${red(stderr.trim() || "copy failed")}`);
      resolvePromise(code);
    });
  });
  if (exitCode !== 0)
    fail("The copy failed and was rolled back. The MySQL/MariaDB database is unchanged.");

  // ---- 7. encryption token
  step(7, "Encryption token");
  const oldToken = oldEnv?.ENCRYPTION_TOKEN;
  if (valueOnly) {
    ok("Not needed for values");
  } else if (!oldToken) {
    warn("Couldn't read the old ENCRYPTION_TOKEN (no --from-env). Copy it into this .env by hand,");
    warn("otherwise encrypted data from the old CAD (e.g. API tokens, 2FA) can't be read.");
  } else if (!targetIsThisCad) {
    warn(
      "Converted into --mysql-url: use the old CAD's ENCRYPTION_TOKEN in the .env of the CAD that uses it.",
    );
  } else if (oldToken === thisEnv.ENCRYPTION_TOKEN) {
    ok("ENCRYPTION_TOKEN already matches the old CAD");
  } else if (
    flag("copy-encryption-token") ||
    (await confirm("Copy the old ENCRYPTION_TOKEN into this CAD's .env?"))
  ) {
    const text = readFileSync(thisEnvPath, "utf8");
    const line = `ENCRYPTION_TOKEN="${oldToken}"`;
    writeFileSync(
      thisEnvPath,
      /^ENCRYPTION_TOKEN=.*$/m.test(text)
        ? text.replace(/^ENCRYPTION_TOKEN=.*$/m, line)
        : `${text.trimEnd()}\n${line}\n`,
    );
    run(process.execPath, [join(ROOT, "scripts", "copy-env.mjs"), "--client", "--api"], {
      cwd: ROOT,
    });
    ok("ENCRYPTION_TOKEN copied (and the .env copied to the apps)");
  } else {
    warn("ENCRYPTION_TOKEN differs from the old CAD: encrypted data from it can't be read.");
  }

  console.log(
    `\n${green(bold("Done."))} ${
      targetIsThisCad
        ? "Start (or restart) this CAD and sign in with your existing accounts."
        : "Point a CAD's DATABASE_URL at that database to use it."
    }`,
  );
}

main().catch((error) => fail(error.message ?? String(error)));
