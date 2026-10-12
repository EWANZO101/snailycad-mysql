/**
 * The CAD runs on MySQL / MariaDB or PostgreSQL. prisma/schema.prisma (MySQL) is the one you edit;
 * this writes the PostgreSQL twin, prisma/postgresql/schema.prisma, from it. The only differences:
 * the provider, the JSON-array defaults (MySQL needs `(json_array())`, PostgreSQL takes '[]') and
 * the types generator's relative output path.
 *
 * usage (apps/api):
 *   node scripts/postgres-schema.mjs            write prisma/postgresql/schema.prisma
 *   node scripts/postgres-schema.mjs --check    exit 1 when it's out of date (CI / tests)
 *
 * After changing schema.prisma, also add the PostgreSQL migration:
 *   pnpm prisma:migrate-postgres <name>   (see scripts/prisma.mjs)
 */
/* eslint-disable quotes -- the strings are Prisma schema text, full of double quotes */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const apiDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(apiDir, "prisma", "schema.prisma");
const TARGET = join(apiDir, "prisma", "postgresql", "schema.prisma");

export function toPostgresSchema(schema) {
  let out = schema.replace(
    /datasource db \{\s*provider\s*=\s*"mysql"/,
    'datasource db {\n  provider = "postgresql"',
  );
  if (out === schema) throw new Error('schema.prisma has no `provider = "mysql"` datasource');

  out = out.replace(/@default\(dbgenerated\("\(json_array\(\)\)"\)\)/g, '@default("[]")');
  // one folder deeper than schema.prisma
  out = out.replace(
    /output\s*=\s*"\.\.\/\.\.\/\.\.\/packages\//g,
    'output   = "../../../../packages/',
  );

  const leftover = out.match(
    /dbgenerated\([^)]*\)|@db\.(TinyInt|MediumText|LongText|DateTime|UnsignedInt)\b/,
  );
  if (leftover) {
    throw new Error(
      `schema.prisma uses ${leftover[0]}: teach scripts/postgres-schema.mjs its PostgreSQL form`,
    );
  }

  // keep the source's line endings (a Windows checkout has CRLF)
  const eol = schema.includes("\r\n") ? "\r\n" : "\n";
  const header = `// GENERATED from ../schema.prisma by scripts/postgres-schema.mjs: don't edit, edit that one.${eol}`;
  return header + out;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const generated = toPostgresSchema(readFileSync(SOURCE, "utf8"));
  if (process.argv.includes("--check")) {
    const current = existsSync(TARGET) ? readFileSync(TARGET, "utf8") : "";
    if (current !== generated) {
      console.error(
        "prisma/postgresql/schema.prisma is out of date: run node scripts/postgres-schema.mjs",
      );
      process.exit(1);
    }
    console.log("prisma/postgresql/schema.prisma is up to date");
  } else {
    mkdirSync(dirname(TARGET), { recursive: true });
    writeFileSync(TARGET, generated);
    console.log(`wrote ${TARGET}`);
  }
}
