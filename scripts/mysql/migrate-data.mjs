/**
 * Copies all SnailyCAD data from a PostgreSQL database into an empty MySQL / MariaDB database that
 * already has the schema (run `pnpm prisma migrate deploy` in apps/api first).
 *
 * - reads PostgreSQL with `psql` (one JSON row per line, nothing is written to PostgreSQL)
 * - writes with the API's Prisma client, in one transaction with foreign key checks off
 * - PostgreSQL lists (String[] / enum[]) become JSON arrays
 * - verifies the row count of every table afterwards
 *
 * usage (from apps/api):
 *   PG_URL=postgresql://user:pass@host:5432/db DATABASE_URL=mysql://user:pass@host:3306/db \
 *     node ../../scripts/mysql/migrate-data.mjs [--dry-run]
 */
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { createRequire } from "node:module";

// resolve @prisma/client from apps/api (the MySQL client), whichever directory this runs from
const require = createRequire(`${process.cwd()}/package.json`);
const { PrismaClient } = require("@prisma/client");

const PG_URL = process.env.PG_URL;
const isDryRun = process.argv.includes("--dry-run");
const BATCH_SIZE = 200;

if (!PG_URL || !process.env.DATABASE_URL?.startsWith("mysql://")) {
  console.error("Set PG_URL (source PostgreSQL) and DATABASE_URL (target mysql://...).");
  process.exit(1);
}

const prisma = new PrismaClient();

function psqlLines(sql) {
  const child = spawn("psql", [PG_URL, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", sql], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => (stderr += chunk));
  const done = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`psql failed (${code}): ${stderr.trim()}`)),
    );
  });
  return { lines: createInterface({ input: child.stdout, crlfDelay: Infinity }), done };
}

async function psqlValue(sql) {
  const { lines, done } = psqlLines(sql);
  const out = [];
  for await (const line of lines) out.push(line);
  await done;
  return out.join("\n").trim();
}

const quote = (name) => `\`${name.replace(/`/g, "``")}\``;

/** "2026-10-10T02:00:00.123" (UTC, from row_to_json) -> "2026-10-10 02:00:00.123" */
function toMysqlDate(value) {
  return String(value)
    .replace("T", " ")
    .replace(/(Z|[+-]\d\d:?\d\d)$/, "");
}

function convertValue(value, mysqlType, isNullable) {
  const isJson = mysqlType === "json" || mysqlType === "longtext_json";
  // PostgreSQL list columns can hold NULL; the CAD treats them as empty lists
  if ((value === null || value === undefined) && isJson && !isNullable) return "[]";
  if (value === null || value === undefined) return null;
  if (mysqlType === "json" || mysqlType === "longtext_json") return JSON.stringify(value);
  if (mysqlType === "datetime" || mysqlType === "timestamp" || mysqlType === "date") {
    return toMysqlDate(value);
  }
  if (mysqlType === "tinyint") return value === true ? 1 : value === false ? 0 : value;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

async function main() {
  // PostgreSQL row_to_json prints timestamps in the session time zone: force UTC
  process.env.PGTZ = "UTC";

  const tables = await prisma.$queryRaw`
    SELECT TABLE_NAME AS name FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
      AND TABLE_NAME <> '_prisma_migrations'
    ORDER BY TABLE_NAME
  `;

  const columnsRows = await prisma.$queryRaw`
    SELECT c.TABLE_NAME AS tableName, c.COLUMN_NAME AS columnName, c.DATA_TYPE AS dataType,
      c.IS_NULLABLE AS isNullable,
      EXISTS (
        SELECT 1 FROM information_schema.CHECK_CONSTRAINTS cc
        WHERE cc.CONSTRAINT_SCHEMA = c.TABLE_SCHEMA AND cc.CONSTRAINT_NAME = c.COLUMN_NAME
          AND cc.CHECK_CLAUSE LIKE '%json_valid%'
      ) AS isJson
    FROM information_schema.COLUMNS c
    WHERE c.TABLE_SCHEMA = DATABASE()
    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
  `;

  const columnsByTable = new Map();
  for (const row of columnsRows) {
    const list = columnsByTable.get(row.tableName) ?? [];
    // MariaDB stores JSON as LONGTEXT with a json_valid() check
    const type = row.dataType === "longtext" && Number(row.isJson) ? "longtext_json" : row.dataType;
    list.push({ name: row.columnName, type, isNullable: row.isNullable === "YES" });
    columnsByTable.set(row.tableName, list);
  }

  // the target must be empty, so a re-run can't duplicate or mix data
  for (const { name } of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS count FROM ${quote(name)}`,
    );
    if (Number(count) > 0) {
      throw new Error(`Target table ${name} is not empty. Use a fresh database.`);
    }
  }

  // source row counts and data
  const sourceCounts = new Map();
  const data = new Map();
  for (const { name } of tables) {
    const columns = columnsByTable.get(name);
    const exists = await psqlValue(
      `SELECT to_regclass('public."${name.replace(/"/g, '""')}"') IS NOT NULL`,
    );
    if (exists !== "t") {
      console.warn(`- ${name}: not in PostgreSQL, skipped (new table)`);
      sourceCounts.set(name, 0);
      data.set(name, []);
      continue;
    }

    const select = columns.map((c) => `t."${c.name.replace(/"/g, '""')}"`).join(", ");
    const { lines, done } = psqlLines(
      `SELECT row_to_json(r) FROM (SELECT ${select} FROM "${name.replace(/"/g, '""')}" t) r`,
    );
    const rows = [];
    for await (const line of lines) {
      if (line.trim()) rows.push(JSON.parse(line));
    }
    await done;
    sourceCounts.set(name, rows.length);
    data.set(name, rows);
  }

  const total = [...sourceCounts.values()].reduce((a, b) => a + b, 0);
  console.log(`Read ${total} rows from ${tables.length} tables.`);
  if (isDryRun) {
    console.log("--dry-run: nothing written.");
    return;
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 0");

      for (const { name } of tables) {
        const rows = data.get(name);
        if (!rows.length) continue;

        const columns = columnsByTable.get(name);
        const columnList = columns.map((c) => quote(c.name)).join(", ");
        const rowPlaceholder = `(${columns.map(() => "?").join(", ")})`;

        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
          const batch = rows.slice(i, i + BATCH_SIZE);
          const values = batch.flatMap((row) =>
            columns.map((column) => convertValue(row[column.name], column.type, column.isNullable)),
          );
          try {
            await tx.$executeRawUnsafe(
              `INSERT INTO ${quote(name)} (${columnList}) VALUES ${batch.map(() => rowPlaceholder).join(", ")}`,
              ...values,
            );
          } catch (error) {
            throw new Error(`Inserting into ${name} failed: ${error.message}`);
          }
        }
        console.log(`- ${name}: ${rows.length}`);
      }

      await tx.$executeRawUnsafe("SET FOREIGN_KEY_CHECKS = 1");
    },
    { timeout: 30 * 60_000, maxWait: 60_000 },
  );

  // verify
  const mismatches = [];
  for (const { name } of tables) {
    const [{ count }] = await prisma.$queryRawUnsafe(
      `SELECT COUNT(*) AS count FROM ${quote(name)}`,
    );
    if (Number(count) !== sourceCounts.get(name)) {
      mismatches.push(`${name}: source ${sourceCounts.get(name)}, target ${count}`);
    }
  }

  if (mismatches.length) {
    throw new Error(`Row counts differ:\n${mismatches.join("\n")}`);
  }
  console.log(`Done: ${total} rows copied, row counts match for all ${tables.length} tables.`);
}

main()
  .catch((error) => {
    console.error(error.message ?? error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
