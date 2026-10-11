# SnailyCAD on MySQL / MariaDB

This branch (`feat/mysql-support`) runs SnailyCAD on **MySQL 8.0+** or **MariaDB 10.6+** instead of
PostgreSQL. It is MySQL-only: the PostgreSQL migrations were replaced by one MySQL baseline.

Tested with MySQL 8.0.46 and MariaDB 11.4.12.

## What changed

| Area         | Change                                                                                                                             |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Prisma       | `provider = "mysql"`; one baseline migration `20261011000000_mysql_init`                                                           |
| List columns | The 23 `String[]` / enum list columns (permissions, `whatPages`, layout orders, …) are `Json` arrays with `DEFAULT (json_array())` |
| Text columns | Plain `String` columns are `TEXT`, except ids, foreign keys and indexed columns (`VARCHAR(191)`)                                   |
| Case numbers | The 5 auto-increment `caseNumber` columns are unique (MySQL requires an indexed auto-increment)                                    |
| Search       | `mode: "insensitive"` removed: MySQL/MariaDB collations are case-insensitive already                                               |
| List filters | `has` / `hasSome` / `isEmpty` → `array_contains` / `equals: []`                                                                    |
| Raw SQL      | Jail list and duty-hours report rewritten (backticks, `CONCAT`/`LIKE`, recursive CTE, `TIMESTAMPDIFF`)                             |
| Demo mode    | Snapshot/reset with `mysqldump`/`mysql` (or `mariadb-dump`/`mariadb`, detected automatically)                                      |
| Config       | `.env` uses `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`; `DATABASE_URL=mysql://…`                                    |
| Docker       | Both compose files use `mariadb:11.4`                                                                                              |

## Behaviour differences

- **Usernames and other unique text are case-insensitive.** On PostgreSQL `Admin` and `admin` could be
  two users; on MySQL/MariaDB they can't. The data copy fails loudly if such duplicates exist.
- Case numbers keep counting up after a demo reset (MySQL can't reset counters inside a transaction).

## New install

### One-line installers (Ubuntu)

```bash
# Docker: the CAD and a MariaDB database in containers
curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-docker.sh | sudo bash

# Ubuntu standalone: the CAD runs directly with Node.js, as a systemd service
curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-ubuntu.sh | sudo bash
```

Each prints a link to a setup wizard on `http://<server-ip>:3100`. In the browser you install each
requirement with a button (system tools, then Docker or Node.js + pnpm, then the CAD), choose the
database and ports, and follow the install live. `install.sh` without a method asks in the wizard
instead. Everything lives in `/opt/snailycad`, and `sudo bash /opt/snailycad/uninstall.sh` removes
all of it again, including what the wizard added outside that folder. Options (`SNAILY_NAME`,
`SNAILY_WIZARD_PORT`, …) are listed at the top of `scripts/installer/install.sh`. Full guides:
[docs/one-line-install.md](docs/one-line-install.md) and [docs/install-docker.md](docs/install-docker.md).

### By hand

1. Create a database and user:
   ```sql
   CREATE DATABASE `snaily-cad-v4` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'snailycad'@'localhost' IDENTIFIED BY 'a-strong-password';
   GRANT ALL PRIVILEGES ON `snaily-cad-v4`.* TO 'snailycad'@'localhost';
   ```
2. Copy `.env.example` to `.env` and fill in the `DB_*` values. The password is part of a URL: use
   letters and numbers, or URL-encode special characters.
3. `pnpm install && node scripts/copy-env.mjs --client --api && pnpm run build && pnpm run start`
   (`start` applies the migration).

## Moving an existing PostgreSQL CAD

Set up this CAD first (install, `.env` with an empty MySQL/MariaDB database), then run one command:

```bash
pnpm convert:postgres --from-env /path/to/old/snaily-cadv4/.env
```

It reads the old CAD's database settings from its `.env`, checks both databases (the MySQL/MariaDB one
must be empty), checks the old data for usernames that only differ in case, creates the tables, shows
how many rows will be copied and asks you to confirm. It then copies everything in one transaction,
checks every table's row count, and offers to copy the old `ENCRYPTION_TOKEN` into this `.env` (some
stored data is encrypted with it). PostgreSQL is only read. Requires `psql`.

Options: `--pg-url postgresql://...` instead of `--from-env`, `--mysql-url mysql://...` to convert into
another database (this `.env` isn't changed), `--values` to copy only the values, `--yes` to skip the
questions.

### Doing it by hand

1. Install as above, but stop before `pnpm run start`, and apply the schema only:
   `cd apps/api && pnpm prisma migrate deploy`
2. Use the **same `ENCRYPTION_TOKEN`** as the old CAD (some stored data is encrypted with it).
3. Copy the data. PostgreSQL is only read; the target must be empty:
   ```bash
   cd apps/api
   PG_URL="postgresql://USER:PASSWORD@HOST:5432/DB" DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/DB" \
     node ../../scripts/mysql/migrate-data.mjs --dry-run   # read only, shows row count
   PG_URL=... DATABASE_URL=... node ../../scripts/mysql/migrate-data.mjs
   ```
   It copies every table in one transaction, turns PostgreSQL lists into JSON arrays, and checks the
   row count of every table afterwards. Requires `psql` on the machine.
4. Start the CAD and sign in.

### Only the values

To give a new CAD the departments, statuses, call types, penal codes, vehicles and so on of another
CAD, without its users or other data:

```bash
PG_URL=... DATABASE_URL=... node ../../scripts/mysql/migrate-data.mjs --values
```

The value tables must be empty in the target. Accounts and settings of the new CAD are kept.

## Changing the schema

`prisma migrate diff` / `migrate dev` leave the JSON defaults out of the SQL they generate. After
creating a migration, run:

```bash
node scripts/mysql/patch-json-defaults.mjs apps/api/prisma/schema.prisma apps/api/prisma/migrations/<name>/migration.sql
```

## Not done yet

- TypeScript: the API's Prisma types now say `JsonValue` for the former list columns. It runs (they are
  arrays at runtime) but the API isn't type-clean against these columns yet.
- Upstream SnailyCAD migrations must be translated by hand when merging updates.
