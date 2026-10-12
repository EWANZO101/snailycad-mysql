import { Prisma } from "@prisma/client";

/**
 * The CAD runs on MySQL / MariaDB or PostgreSQL (prisma/schema.prisma and its generated twin
 * prisma/postgresql/schema.prisma). Raw SQL and a few Prisma options differ between them; this is
 * where the code asks which one it's on.
 */
export type DbProvider = "mysql" | "postgresql";

export function getDbProvider(): DbProvider {
  const explicit = process.env.DB_PROVIDER?.trim().toLowerCase();
  if (explicit === "postgresql" || explicit === "postgres") return "postgresql";
  if (explicit === "mysql" || explicit === "mariadb") return "mysql";
  return /^postgres(ql)?:/i.test(process.env.DATABASE_URL ?? "") ? "postgresql" : "mysql";
}

export function isPostgres() {
  return getDbProvider() === "postgresql";
}

/** a quoted table / column name for raw SQL: `name` on MySQL, "name" on PostgreSQL */
export function ident(name: string) {
  return Prisma.raw(
    // eslint-disable-next-line quotes
    isPostgres() ? `"${name.replace(/"/g, '""')}"` : `\`${name.replace(/`/g, "``")}\``,
  );
}

/**
 * Spread into a Prisma string filter ({ contains: query, ...insensitive() }) for a case-insensitive
 * search. MySQL / MariaDB collations already ignore case and its client has no `mode` option, so
 * there it adds nothing; PostgreSQL compares case-sensitively without it.
 */
export function insensitive(): object {
  return isPostgres() ? { mode: "insensitive" } : {};
}

/**
 * A Prisma JSON filter path: "$.a.b" on MySQL / MariaDB, ["a", "b"] on PostgreSQL. Typed for the
 * client the code is compiled against; the other database's client accepts the other form.
 */
export function jsonPath(...keys: string[]): string & string[] {
  return (isPostgres() ? keys : `$.${keys.join(".")}`) as unknown as string & string[];
}
