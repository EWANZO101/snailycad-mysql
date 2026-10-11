/**
 * Prisma (5.x) leaves `@default(dbgenerated("(json_array())"))` out of the SQL it generates for
 * MySQL JSON columns. These columns were lists (String[] / enum[]) on PostgreSQL and the CAD relies
 * on them defaulting to an empty list, so this adds `DEFAULT (json_array())` to them in a migration.
 *
 * usage: node scripts/mysql/patch-json-defaults.mjs <schema.prisma> <migration.sql>
 */
import { readFileSync, writeFileSync } from "node:fs";

const [schemaPath, migrationPath] = process.argv.slice(2);
if (!schemaPath || !migrationPath) {
  console.error("usage: patch-json-defaults.mjs <schema.prisma> <migration.sql>");
  process.exit(1);
}

const schema = readFileSync(schemaPath, "utf8");
let sql = readFileSync(migrationPath, "utf8");

const columns = [];
for (const model of schema.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)) {
  const [, modelName, body] = model;
  const tableName = body.match(/@@map\("(\w+)"\)/)?.[1] ?? modelName;

  for (const field of body.matchAll(
    /^\s+(\w+)\s+Json\s+@default\(dbgenerated\("\(json_array\(\)\)"\)\)/gm,
  )) {
    columns.push({ tableName, columnName: field[1] });
  }
}

let patched = 0;
for (const { tableName, columnName } of columns) {
  const table = new RegExp(`(CREATE TABLE \`${tableName}\` \\([\\s\\S]*?\\n\\)[^;]*;)`);
  sql = sql.replace(table, (tableSql) => {
    const column = new RegExp(`(\`${columnName}\` JSON NOT NULL)(,)`);
    if (!column.test(tableSql)) return tableSql;
    patched += 1;
    return tableSql.replace(column, "$1 DEFAULT (json_array())$2");
  });
}

writeFileSync(migrationPath, sql);
console.log(`added DEFAULT (json_array()) to ${patched}/${columns.length} JSON list columns`);
if (patched !== columns.length) process.exit(1);
