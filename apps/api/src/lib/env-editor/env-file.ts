import { BadRequest } from "@tsed/exceptions";

/** .env parsing for the .env editor: masking and merging protected keys (no file access here). */

export const MASK = "********";

/** always protected; owners can add more */
export const DEFAULT_PROTECTED_KEYS = [
  "DB_PROVIDER",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "DATABASE_URL",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "JWT_SECRET",
  "ENCRYPTION_TOKEN",
  "UNINSTALL_PASSWORD",
  "RECOVERY_TOKEN_FILE",
  "SNAILYCAD_SERVICE_NAME",
];
const PROTECTED_KEY_PATTERN = /(SECRET|PASSWORD|PASSWD|TOKEN|PRIVATE|CREDENTIAL|_KEY$|^KEY$)/i;

const LINE_REGEX = /^(\s*(?:export\s+)?)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)(.*)$/;
export const KEY_REGEX = /^[A-Za-z_][A-Za-z0-9_]*$/;

export interface EditorConfig {
  enabled: boolean;
  userIds: string[];
  protectedKeys: string[];
}

export function isProtected(key: string, config: EditorConfig) {
  return (
    DEFAULT_PROTECTED_KEYS.includes(key) ||
    config.protectedKeys.includes(key) ||
    PROTECTED_KEY_PATTERN.test(key)
  );
}

function parseLine(line: string) {
  const match = line.match(LINE_REGEX);
  if (!match) return null;
  return { prefix: match[1]!, key: match[2]!, separator: match[3]!, value: match[4]! };
}

export function parseValues(content: string) {
  const values = new Map<string, string>();
  for (const line of content.split("\n")) {
    const parsed = parseLine(line);
    if (parsed) values.set(parsed.key, parsed.value);
  }
  return values;
}

/** non-owners see protected values as ******** */
export function maskContent(content: string, config: EditorConfig) {
  return content
    .split("\n")
    .map((line) => {
      const parsed = parseLine(line);
      if (!parsed || !isProtected(parsed.key, config)) return line;
      return `${parsed.prefix}${parsed.key}${parsed.separator}${MASK}`;
    })
    .join("\n");
}

/**
 * builds the file a non-owner saves: protected lines always come from the current file (changes,
 * new protected keys and removals are ignored), everything else from what they submitted.
 */
export function mergeForNonOwner(current: string, submitted: string, config: EditorConfig) {
  const originalLines = new Map<string, string>();
  for (const line of current.split("\n")) {
    const parsed = parseLine(line);
    if (parsed && isProtected(parsed.key, config)) originalLines.set(parsed.key, line);
  }

  const protectedKeys = [...originalLines.keys()];
  const emitted = new Set<string>();
  const output: string[] = [];

  for (const line of submitted.split("\n")) {
    const parsed = parseLine(line);
    if (!parsed) {
      output.push(line);
      continue;
    }

    if (isProtected(parsed.key, config)) {
      const original = originalLines.get(parsed.key);
      if (original !== undefined && !emitted.has(parsed.key)) {
        output.push(original);
        emitted.add(parsed.key);
      }
      continue;
    }

    // e.g. NEXT_PUBLIC_X=${JWT_SECRET} would copy a secret into the public client build
    const referenced = [...parsed.value.matchAll(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g)].map(
      (m) => m[1]!,
    );
    const forbidden = referenced.find((key) => isProtected(key, config));
    if (forbidden) {
      throw new BadRequest(`cannotReferenceProtectedKey:${forbidden}`);
    }

    output.push(line);
  }

  for (const key of protectedKeys) {
    if (!emitted.has(key)) output.push(originalLines.get(key)!);
  }

  return output.join("\n");
}

export function normalize(content: string) {
  return `${content.replace(/\r\n?/g, "\n").replace(/\n+$/, "")}\n`;
}

export function changedKeys(before: string, after: string) {
  const a = parseValues(before);
  const b = parseValues(after);
  const keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys].filter((key) => a.get(key) !== b.get(key)).sort();
}

/**
 * settings that belong to this install and are never taken from another CAD's .env when importing:
 * the database connection, ports, URLs and service name
 */
export const INSTALL_SPECIFIC_KEYS = [
  "DB_PROVIDER",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "DATABASE_URL",
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "PORT_API",
  "PORT_CLIENT",
  "CORS_ORIGIN_URL",
  "NEXT_PUBLIC_CLIENT_URL",
  "NEXT_PUBLIC_PROD_ORIGIN",
  "DOMAIN",
  "NODE_ENV",
  "SNAILYCAD_SERVICE_NAME",
  "RECOVERY_TOKEN_FILE",
  "UPDATE_BRANCH",
  "SNAILY_STATUS_DIR",
];

/**
 * this CAD's .env with the old CAD's settings copied in: the old file's values win, except for
 * INSTALL_SPECIFIC_KEYS (this CAD's are kept). Keys only this CAD has are kept too.
 */
export function mergeImportedEnv(current: string, old: string) {
  const currentLines = new Map<string, string>();
  for (const line of current.split("\n")) {
    const parsed = parseLine(line);
    if (parsed) currentLines.set(parsed.key, line);
  }

  const emitted = new Set<string>();
  const output: string[] = [];

  for (const line of normalize(old).split("\n")) {
    const parsed = parseLine(line);
    if (!parsed) {
      output.push(line);
      continue;
    }
    if (emitted.has(parsed.key)) continue;
    emitted.add(parsed.key);

    if (INSTALL_SPECIFIC_KEYS.includes(parsed.key)) {
      const own = currentLines.get(parsed.key);
      if (own !== undefined) output.push(own);
      continue;
    }
    output.push(line);
  }

  const kept = [...currentLines.keys()].filter((key) => !emitted.has(key));
  if (kept.length) {
    output.push("", "# kept from this CAD's .env (not in the imported one)");
    for (const key of kept) output.push(currentLines.get(key)!);
  }

  const content = normalize(output.join("\n"));
  return { content, changedKeys: changedKeys(current, content) };
}
