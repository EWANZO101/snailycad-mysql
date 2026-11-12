import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { findApiRoot } from "lib/recovery/recovery-token";

/**
 * Reading, backing up and writing this CAD's .env files (used by the .env editor and the
 * PostgreSQL import). Backups go to `<project>/.env-backups/` (mode 0700, files 0600).
 */

const MAX_BACKUPS = 20;

export function getEnvPaths() {
  const root = resolve(findApiRoot(), "..", "..");
  return {
    envPath: join(root, ".env"),
    /** copies made by scripts/copy-env.mjs; kept in sync when they exist */
    copies: [join(root, "apps", "api", ".env"), join(root, "apps", "client", ".env")],
    backupDir: join(root, ".env-backups"),
  };
}

export function writeSecureFile(path: string, content: string) {
  const tmpPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tmpPath, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(tmpPath, 0o600);
  renameSync(tmpPath, path);
}

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function ensureBackupDir() {
  const { backupDir } = getEnvPaths();
  mkdirSync(backupDir, { recursive: true, mode: 0o700 });
  chmodSync(backupDir, 0o700);
  return backupDir;
}

function pruneBackups() {
  const { backupDir } = getEnvPaths();
  // copies of an old CAD's .env are never removed automatically
  const backups = listEnvBackups().filter((name) => !name.startsWith(".env.old-cad."));
  for (const old of backups.slice(MAX_BACKUPS)) {
    try {
      unlinkSync(join(backupDir, old));
    } catch {
      // ignore
    }
  }
}

/** copies the current .env to .env-backups/.env.<time>; returns the backup path (null: no .env) */
export function backupCurrentEnv() {
  const { envPath } = getEnvPaths();
  if (!existsSync(envPath)) return null;

  const path = join(ensureBackupDir(), `.env.${timestamp()}`);
  copyFileSync(envPath, path);
  chmodSync(path, 0o600);
  pruneBackups();
  return path;
}

/** keeps a copy of another CAD's .env (e.g. the old PostgreSQL CAD's) next to the backups */
export function saveOldCadEnv(content: string) {
  const path = join(ensureBackupDir(), `.env.old-cad.${timestamp()}`);
  writeSecureFile(path, content);
  pruneBackups();
  return path;
}

/** newest first */
export function listEnvBackups() {
  const { backupDir } = getEnvPaths();
  if (!existsSync(backupDir)) return [];
  return readdirSync(backupDir)
    .filter((name) => name.startsWith(".env."))
    .sort((a, b) =>
      b.replace(/^\.env\.(old-cad\.)?/, "").localeCompare(a.replace(/^\.env\.(old-cad\.)?/, "")),
    );
}

/** writes .env and the apps/api + apps/client copies. Back up first with backupCurrentEnv() */
export function writeEnvEverywhere(content: string) {
  const { envPath, copies } = getEnvPaths();
  writeSecureFile(envPath, content);
  for (const copy of copies) {
    if (existsSync(copy)) writeSecureFile(copy, content);
  }
}
