#!/usr/bin/env node
/**
 * Runs the Prisma CLI with the schema for this CAD's database: prisma/schema.prisma for MySQL /
 * MariaDB, prisma/postgresql/schema.prisma for PostgreSQL. Which one comes from DB_PROVIDER
 * ("mysql" or "postgresql"), else the DATABASE_URL scheme, read from the environment or .env.
 *
 * usage (apps/api):
 *   node scripts/prisma.mjs migrate deploy | generate | studio | ...
 *   node scripts/prisma.mjs which                       print the provider and schema
 *   node scripts/prisma.mjs migrate-postgres <name>     add a PostgreSQL migration for the changes
 *                                                       in schema.prisma (needs SHADOW_DATABASE_URL,
 *                                                       an empty PostgreSQL database)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { delimiter, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCHEMAS = {
  mysql: join(apiDir, "prisma", "schema.prisma"),
  postgresql: join(apiDir, "prisma", "postgresql", "schema.prisma"),
};

/** KEY=value pairs of a .env file, with ${VAR} expanded the way Prisma does */
function readEnvFile(path) {
  if (!existsSync(path)) return {};
  const values = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (/^(["']).*\1$/.test(value)) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  for (const key of Object.keys(values)) {
    values[key] = values[key].replace(
      /\$\{(\w+)\}/g,
      (_, name) => process.env[name] ?? values[name] ?? "",
    );
  }
  return values;
}

export function detectProvider(env = process.env) {
  const fileEnv = {
    ...readEnvFile(join(apiDir, "..", "..", ".env")),
    ...readEnvFile(join(apiDir, ".env")),
  };
  const explicit = (env.DB_PROVIDER ?? fileEnv.DB_PROVIDER ?? "").trim().toLowerCase();
  if (explicit === "postgresql" || explicit === "postgres") return "postgresql";
  if (explicit === "mysql" || explicit === "mariadb") return "mysql";
  const url = env.DATABASE_URL ?? fileEnv.DATABASE_URL ?? "";
  return /^postgres(ql)?:/i.test(url) ? "postgresql" : "mysql";
}

function prismaCli() {
  const require = createRequire(join(apiDir, "package.json"));
  return require.resolve("prisma/build/index.js");
}

/** the environment `pnpm prisma` would give: node_modules/.bin on PATH (Prisma's generators) */
function cliEnv(extraEnv = {}) {
  const pathKey = Object.keys(process.env).find((key) => key.toUpperCase() === "PATH") ?? "PATH";
  const bins = [
    join(apiDir, "node_modules", ".bin"),
    join(apiDir, "..", "..", "node_modules", ".bin"),
  ];
  return {
    ...process.env,
    [pathKey]: [...bins, process.env[pathKey] ?? ""].join(delimiter),
    ...extraEnv,
  };
}

function run(args, extraEnv = {}) {
  const result = spawnSync(process.execPath, [prismaCli(), ...args], {
    cwd: apiDir,
    stdio: "inherit",
    env: cliEnv(extraEnv),
  });
  return result.status ?? 1;
}

function migratePostgres(name) {
  if (!name || !/^[\w-]+$/.test(name)) {
    console.error("usage: node scripts/prisma.mjs migrate-postgres <name>");
    return 1;
  }
  const shadow = process.env.SHADOW_DATABASE_URL;
  if (!shadow?.startsWith("postgres")) {
    console.error("Set SHADOW_DATABASE_URL to an empty PostgreSQL database (it is reset).");
    return 1;
  }
  const generate = spawnSync(process.execPath, [join(apiDir, "scripts", "postgres-schema.mjs")], {
    stdio: "inherit",
  });
  if (generate.status !== 0) return 1;

  const migrations = join(apiDir, "prisma", "postgresql", "migrations");
  const diff = spawnSync(
    process.execPath,
    [
      prismaCli(),
      "migrate",
      "diff",
      "--from-migrations",
      migrations,
      "--to-schema-datamodel",
      SCHEMAS.postgresql,
      "--shadow-database-url",
      shadow,
      "--script",
    ],
    { cwd: apiDir, encoding: "utf8" },
  );
  if (diff.status !== 0) {
    process.stderr.write(diff.stderr);
    return 1;
  }
  if (!diff.stdout.trim() || /^-- This is an empty migration/.test(diff.stdout.trim())) {
    console.log("No PostgreSQL changes to migrate.");
    return 0;
  }
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const dir = join(migrations, `${stamp}_${name}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "migration.sql"), diff.stdout);
  console.log(`wrote ${join(dir, "migration.sql")}`);
  return 0;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const args = process.argv.slice(2);
  const provider = detectProvider();
  const schema = SCHEMAS[provider];

  if (args[0] === "which") {
    console.log(`${provider} ${schema}`);
    process.exit(0);
  }
  if (args[0] === "migrate-postgres") {
    process.exit(migratePostgres(args[1]));
  }

  // commands that take --schema (others, like --version, run as they are)
  const takesSchema = ["migrate", "generate", "db", "format", "validate", "studio"].includes(
    args[0],
  );
  const hasSchema = args.some((arg) => arg === "--schema" || arg.startsWith("--schema="));
  process.exit(run(takesSchema && !hasSchema ? [...args, "--schema", schema] : args));
}
