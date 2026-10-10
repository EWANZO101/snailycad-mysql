import crypto from "node:crypto";
import { existsSync, readFileSync, writeFileSync, renameSync, chmodSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Recovery token storage.
 *
 * - The token itself lives in `apps/api/.recovery-token` (plain text, mode 0600).
 * - Its state (whether the owner acknowledged it) lives in `apps/api/.recovery-token.json`.
 * - `RECOVERY_TOKEN_FILE` can override the token file location.
 *
 * The token must NEVER be logged.
 */

interface RecoveryTokenState {
  tokenAcknowledged: boolean;
  createdAt: string;
}

export function findApiRoot() {
  let dir = __dirname;

  for (let i = 0; i < 8; i++) {
    const pkgPath = join(dir, "package.json");
    if (existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
        if (pkg.name === "@snailycad/api") {
          return dir;
        }
      } catch {
        // ignore and keep walking up
      }
    }

    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return process.cwd();
}

export function getRecoveryTokenPaths() {
  const tokenPath = process.env.RECOVERY_TOKEN_FILE
    ? resolve(process.env.RECOVERY_TOKEN_FILE)
    : join(findApiRoot(), ".recovery-token");

  return { tokenPath, statePath: `${tokenPath}.json` };
}

function writeSecureFile(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.${process.pid}.tmp`;
  writeFileSync(tmpPath, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(tmpPath, 0o600);
  renameSync(tmpPath, path);
}

function generateToken() {
  return crypto.randomBytes(32).toString("base64url");
}

function readToken(): string | null {
  const { tokenPath } = getRecoveryTokenPaths();
  if (!existsSync(tokenPath)) return null;

  const token = readFileSync(tokenPath, "utf8").trim();
  return token.length > 0 ? token : null;
}

export function readRecoveryTokenState(): RecoveryTokenState {
  const { statePath } = getRecoveryTokenPaths();

  try {
    if (existsSync(statePath)) {
      const parsed = JSON.parse(readFileSync(statePath, "utf8")) as Partial<RecoveryTokenState>;
      return {
        tokenAcknowledged: parsed.tokenAcknowledged === true,
        createdAt: typeof parsed.createdAt === "string" ? parsed.createdAt : "",
      };
    }
  } catch {
    // corrupted state file -> treat as not acknowledged
  }

  return { tokenAcknowledged: false, createdAt: "" };
}

function writeState(state: RecoveryTokenState) {
  const { statePath } = getRecoveryTokenPaths();
  writeSecureFile(statePath, `${JSON.stringify(state, null, 2)}\n`);
}

/**
 * Called on API startup: creates a token if none exists yet. Never logs the token.
 */
export function ensureRecoveryToken() {
  try {
    const { tokenPath } = getRecoveryTokenPaths();
    const existing = readToken();

    if (existing) {
      // make sure permissions stay strict
      try {
        chmodSync(tokenPath, 0o600);
      } catch {
        // ignore (e.g. file owned by another user)
      }
      return;
    }

    writeSecureFile(tokenPath, `${generateToken()}\n`);
    writeState({ tokenAcknowledged: false, createdAt: new Date().toISOString() });
    console.info(
      `[recovery] A new recovery token was generated and stored at ${tokenPath}. The CAD owner can view it once on the /admin page.`,
    );
  } catch (error) {
    console.error("[recovery] Unable to create the recovery token file.", error);
  }
}

/** Generates a new token, replacing the old one. Returns the new token (show it once only). */
export function rotateRecoveryToken() {
  const { tokenPath } = getRecoveryTokenPaths();
  const token = generateToken();

  writeSecureFile(tokenPath, `${token}\n`);
  writeState({ tokenAcknowledged: false, createdAt: new Date().toISOString() });

  return token;
}

export function acknowledgeRecoveryToken() {
  const state = readRecoveryTokenState();
  writeState({ ...state, tokenAcknowledged: true });
}

/** Returns the token only while it has not been acknowledged yet. */
export function getUnacknowledgedRecoveryToken() {
  const state = readRecoveryTokenState();
  if (state.tokenAcknowledged) return null;

  return readToken();
}

/** Constant-time comparison of a provided token with the stored one. */
export function verifyRecoveryToken(provided: unknown) {
  if (typeof provided !== "string" || provided.length === 0 || provided.length > 512) {
    return false;
  }

  const stored = readToken();
  if (!stored) return false;

  // hash both sides so the buffers always have the same length (timingSafeEqual requirement)
  const a = crypto.createHash("sha256").update(provided.trim()).digest();
  const b = crypto.createHash("sha256").update(stored).digest();

  return crypto.timingSafeEqual(a, b);
}
