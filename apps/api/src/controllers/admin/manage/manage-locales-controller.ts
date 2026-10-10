import { spawn } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, Context, PathParams } from "@tsed/platform-params";
import { ContentType, Delete, Description, Get, Post, Put } from "@tsed/schema";
import { BadRequest, NotFound } from "@tsed/exceptions";
import type { User } from "@prisma/client";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findApiRoot } from "lib/recovery/recovery-token";
import { assertNotDemoAccount } from "lib/demo/demo-mode";

/** locales shipped with SnailyCAD. These can't be removed from the UI. */
const BUILT_IN_LOCALES = [
  "en",
  "en-gb",
  "ru",
  "cn",
  "tc",
  "fr-FR",
  "de-DE",
  "pt-BR",
  "cs-CZ",
  "nl-BE",
  "zh-CN",
  "sv",
];

/** ISO 639-1 (or 639-2) language code, optionally with a region, e.g. "es" or "es-ES" */
const LOCALE_CODE_REGEX = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const SERVICE_NAME = process.env.SNAILYCAD_SERVICE_NAME || "start-snaily-cadv4";

function getPaths() {
  const clientRoot = resolve(findApiRoot(), "..", "client");
  const projectRoot = resolve(findApiRoot(), "..", "..");
  return {
    localesDir: join(clientRoot, "locales"),
    configPath: join(clientRoot, "i18n.config.mjs"),
    pendingPath: join(projectRoot, ".snaily-cache", "locales-pending"),
  };
}

function readConfig() {
  const { configPath } = getPaths();
  const source = readFileSync(configPath, "utf8");

  const localesMatch = source.match(/locales:\s*\[([\s\S]*?)\]/);
  const defaultMatch = source.match(/defaultLocale:\s*["']([^"']+)["']/);
  if (!localesMatch) {
    throw new BadRequest("unableToReadI18nConfig");
  }

  const locales = Array.from(localesMatch[1]!.matchAll(/["']([^"']+)["']/g)).map((m) => m[1]!);
  return { source, locales, defaultLocale: defaultMatch?.[1] ?? "en" };
}

function writeConfig(locales: string[], defaultLocale: string) {
  const { configPath } = getPaths();
  const content = `export const i18n = {
  locales: [
${locales.map((locale) => `    "${locale}",`).join("\n")}
  ],
  defaultLocale: "${defaultLocale}",
};
`;
  writeFileSync(configPath, content, "utf8");
}

function listJsonFiles(dir: string) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort();
}

function markPending() {
  const { pendingPath } = getPaths();
  try {
    mkdirSync(resolve(pendingPath, ".."), { recursive: true });
    writeFileSync(pendingPath, new Date().toISOString(), "utf8");
  } catch {
    // not critical
  }
}

function validateCode(code: unknown): string {
  if (typeof code !== "string" || !LOCALE_CODE_REGEX.test(code.trim())) {
    throw new BadRequest("invalidLocaleCode");
  }
  return code.trim();
}

@Controller("/admin/manage/locales")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class ManageLocalesController {
  @Get("/")
  @Description("List the locales on disk and in i18n.config.mjs")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async getLocales() {
    const { localesDir, pendingPath } = getPaths();
    const config = readConfig();
    const enFiles = listJsonFiles(join(localesDir, "en"));

    const folders = existsSync(localesDir)
      ? readdirSync(localesDir, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : [];

    const names = Array.from(new Set([...config.locales, ...folders])).sort((a, b) =>
      a === "en" ? -1 : b === "en" ? 1 : a.localeCompare(b),
    );

    const locales = names.map((name) => {
      const files = listJsonFiles(join(localesDir, name));
      return {
        code: name,
        hasFolder: folders.includes(name),
        isRegistered: config.locales.includes(name),
        isDefault: config.defaultLocale === name,
        isBuiltIn: BUILT_IN_LOCALES.includes(name),
        fileCount: files.length,
        totalFiles: enFiles.length,
        missingFiles: enFiles.filter((file) => !files.includes(file)),
      };
    });

    return {
      locales,
      defaultLocale: config.defaultLocale,
      rebuildPending: existsSync(pendingPath),
    };
  }

  @Post("/")
  @Description("Add a new locale by copying an existing one and registering it")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async addLocale(
    @BodyParams("code") rawCode: unknown,
    @BodyParams("copyFrom") rawCopyFrom: unknown,
    @Context("user") user: User,
  ) {
    await assertNotDemoAccount(user.id);
    const code = validateCode(rawCode);
    const copyFrom = rawCopyFrom ? validateCode(rawCopyFrom) : "en";
    const { localesDir } = getPaths();
    const config = readConfig();

    const target = join(localesDir, code);
    const source = join(localesDir, copyFrom);

    if (!existsSync(source)) {
      throw new NotFound("localeNotFound");
    }

    if (existsSync(target) && config.locales.includes(code)) {
      throw new BadRequest("localeAlreadyExists");
    }

    if (!existsSync(target)) {
      cpSync(source, target, { recursive: true });
    }

    if (!config.locales.includes(code)) {
      writeConfig([...config.locales, code], config.defaultLocale);
    }

    markPending();
    return this.getLocales();
  }

  @Post("/:code/fill-missing")
  @Description("Copy the English files a locale is missing")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async fillMissing(@PathParams("code") rawCode: string, @Context("user") user: User) {
    await assertNotDemoAccount(user.id);
    const code = validateCode(rawCode);
    const { localesDir } = getPaths();
    const target = join(localesDir, code);

    if (!existsSync(target)) {
      throw new NotFound("localeNotFound");
    }

    const existing = listJsonFiles(target);
    for (const file of listJsonFiles(join(localesDir, "en"))) {
      if (!existing.includes(file)) {
        cpSync(join(localesDir, "en", file), join(target, file));
      }
    }

    // translations are read at runtime, no rebuild needed for new files
    return this.getLocales();
  }

  @Put("/default")
  @Description("Set the default locale")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async setDefault(@BodyParams("code") rawCode: unknown, @Context("user") user: User) {
    await assertNotDemoAccount(user.id);
    const code = validateCode(rawCode);
    const config = readConfig();

    if (!config.locales.includes(code)) {
      throw new BadRequest("localeNotRegistered");
    }

    writeConfig(config.locales, code);
    markPending();
    return this.getLocales();
  }

  @Delete("/:code")
  @Description("Remove a custom locale (built-in locales can't be removed)")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async removeLocale(@PathParams("code") rawCode: string, @Context("user") user: User) {
    await assertNotDemoAccount(user.id);
    const code = validateCode(rawCode);
    const config = readConfig();

    if (BUILT_IN_LOCALES.includes(code)) {
      throw new BadRequest("cannotRemoveBuiltInLocale");
    }

    if (config.defaultLocale === code) {
      throw new BadRequest("cannotRemoveDefaultLocale");
    }

    const { localesDir } = getPaths();
    rmSync(join(localesDir, code), { recursive: true, force: true });
    writeConfig(
      config.locales.filter((locale) => locale !== code),
      config.defaultLocale,
    );

    markPending();
    return this.getLocales();
  }

  @Post("/rebuild")
  @Description("Restart SnailyCAD so the client is rebuilt with the new locales")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async rebuild(@Context("user") user: User) {
    await assertNotDemoAccount(user.id);

    await new Promise<void>((resolvePromise, reject) => {
      // --no-block: systemd restarts the service (and this process) after we've responded
      const child = spawn("systemctl", ["restart", "--no-block", SERVICE_NAME], {
        stdio: "ignore",
      });
      child.on("error", () => reject(new BadRequest("unableToRestartService")));
      child.on("close", (code) =>
        code === 0 ? resolvePromise() : reject(new BadRequest("unableToRestartService")),
      );
    });

    const { pendingPath } = getPaths();
    rmSync(pendingPath, { force: true });

    return { restarting: true };
  }
}
