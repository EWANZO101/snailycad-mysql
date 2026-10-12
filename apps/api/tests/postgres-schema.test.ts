import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { toPostgresSchema } from "../scripts/postgres-schema.mjs";

const prismaDir = join(__dirname, "..", "prisma");

test("prisma/postgresql/schema.prisma is generated from the current schema.prisma", () => {
  const mysql = readFileSync(join(prismaDir, "schema.prisma"), "utf8");
  const postgres = readFileSync(join(prismaDir, "postgresql", "schema.prisma"), "utf8");
  // run `node scripts/postgres-schema.mjs` (and add a PostgreSQL migration) after changing schema.prisma
  const lf = (text: string) => text.replace(/\r\n/g, "\n");
  expect(lf(postgres)).toBe(lf(toPostgresSchema(mysql)));
});

test("the PostgreSQL schema has no MySQL-only defaults", () => {
  const postgres = readFileSync(join(prismaDir, "postgresql", "schema.prisma"), "utf8");
  // eslint-disable-next-line quotes
  expect(postgres).toContain('provider = "postgresql"');
  expect(postgres).not.toContain("json_array");
});
