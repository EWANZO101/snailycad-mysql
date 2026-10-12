import { spawn } from "node:child_process";
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { join, resolve as resolvePath } from "node:path";
import { Controller, UseBeforeEach } from "@tsed/common";
import { BodyParams, Context } from "@tsed/platform-params";
import { ContentType, Description, Get, Post } from "@tsed/schema";
import { BadRequest, Forbidden } from "@tsed/exceptions";
import { Rank, type User } from "@prisma/client";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findApiRoot } from "lib/recovery/recovery-token";
import { assertNotDemoAccount, getDemoConfig, isDemoMode } from "lib/demo/demo-mode";
import { runDetachedPowerShellTask } from "lib/windows/run-detached-task";

/**
 * Admin > Dashboard > Danger zone: removes a CAD made by the one-line installer
 * (scripts/installer), using the manifest it kept of everything it added. The items the owner
 * unticks are passed to uninstall.sh / uninstall.ps1 as --keep / -Keep.
 */

interface UninstallItem {
  id: string;
  group: "cad" | "data" | "software" | "system";
  label: string;
  description: string;
  /** always removed: it's what's being uninstalled */
  locked?: boolean;
  /** can't be removed from here, `reason` says why */
  unavailable?: string;
  /** removing this also removes these */
  implies?: string[];
}

const KEEP_ID = /^(database|db-server|docker|runtime|caches|firewall|pkg:[A-Za-z0-9.+_-]{1,100})$/;

const WINGET_NAMES: Record<string, string> = {
  "Git.Git": "Git",
  "NSSM.NSSM": "NSSM",
  "MariaDB.Server": "MariaDB",
};

function getProjectRoot() {
  return resolvePath(findApiRoot(), "..", "..");
}

function samePath(a: string, b: string) {
  const norm = (p: string) => resolvePath(p).replace(/[\\/]+$/, "");
  return process.platform === "win32"
    ? norm(a).toLowerCase() === norm(b).toLowerCase()
    : norm(a) === norm(b);
}

/** the installer's manifest, or null when this CAD wasn't installed by it */
function readInstall() {
  const installDir = resolvePath(getProjectRoot(), "..");
  const manifestPath = join(installDir, "installer", "manifest.env");
  if (!existsSync(manifestPath)) return null;

  const values = new Map<string, string[]>();
  for (const line of readFileSync(manifestPath, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+)=(.*)$/);
    if (!match) continue;
    const [, key, value] = match as unknown as [string, string, string];
    const list = values.get(key) ?? [];
    if (!list.includes(value.trim())) list.push(value.trim());
    values.set(key, list);
  }
  const one = (key: string) => values.get(key)?.[0] ?? "";
  const all = (key: string) => values.get(key) ?? [];

  const isWindows = process.platform === "win32";
  const script = join(installDir, isWindows ? "uninstall.ps1" : "uninstall.sh");
  if (!samePath(one("INSTALL_DIR"), installDir) || !existsSync(script)) return null;

  return { installDir, script, isWindows, one, all };
}

type Install = NonNullable<ReturnType<typeof readInstall>>;

function getItems({ installDir, isWindows, one, all }: Install): UninstallItem[] {
  const items: UninstallItem[] = [];
  const service = one("CAD_SERVICE");
  const sep = isWindows ? "\\" : "/";

  items.push({
    id: "core",
    group: "cad",
    label: "SnailyCAD",
    description: `The CAD's code, build and logs in ${installDir}${
      service ? `, and its ${isWindows ? "Windows service" : "systemd service"} ${service}` : ""
    }.`,
    locked: true,
  });

  const ourMariaDB = one("APT_MARIADB") === "1" || one("WINGET_MARIADB") === "1";
  if (one("DB_NAME")) {
    const canDrop = isWindows ? one("WINGET_MARIADB") === "1" : one("DB_ADMIN") === "socket";
    items.push({
      id: "database",
      group: "data",
      label: `Database ${one("DB_NAME")}`,
      description: `All CAD data (users, citizens, records, settings) and the MySQL user ${one(
        "DB_USER",
      )}. Untick to keep it, e.g. to reinstall later with the same data.`,
      unavailable: canDrop
        ? undefined
        : "It's on a database server the installer doesn't manage, so it's left alone. Drop it there yourself if you want it gone.",
    });
  }
  if (ourMariaDB) {
    items.push({
      id: "db-server",
      group: "software",
      label: "MariaDB server",
      description:
        "Installed by the setup wizard. Removing it deletes every database in it, not only the CAD's, so it's only removed together with the CAD database.",
      implies: ["database"],
    });
  }
  if (one("APT_DOCKER") === "1") {
    items.push({
      id: "docker",
      group: "software",
      label: "Docker",
      description:
        "Installed by the setup wizard. Removes Docker with all its images, containers and volumes.",
    });
  }

  items.push({
    id: "runtime",
    group: "software",
    label: "Node.js and pnpm",
    description: `The CAD's own copies in ${installDir}${sep}runtime${
      isWindows ? " (with NSSM and pnpm's package store)" : ""
    }. A Node.js installed separately on this ${isWindows ? "PC" : "server"} is never touched.`,
  });
  if (!isWindows) {
    items.push({
      id: "caches",
      group: "software",
      label: "Download caches",
      description:
        "pnpm's package store, npm's cache and Prisma's engine cache in /root. Other Node.js projects on this server keep working; they just download again what they need.",
    });
  }

  for (const pkg of all("APT_PACKAGE")) {
    items.push({
      id: `pkg:${pkg}`,
      group: "software",
      label: pkg,
      description: "System package the setup wizard installed (it wasn't on this server before).",
    });
  }
  for (const pkg of all("WINGET_PACKAGE")) {
    items.push({
      id: `pkg:${pkg}`,
      group: "software",
      label: WINGET_NAMES[pkg] ?? pkg,
      description: `Program the setup wizard installed with winget (${pkg}). It wasn't on this PC before.`,
    });
  }

  const ports = all("UFW_PORT");
  const rules = all("WIN_FW_RULE");
  if (ports.length || rules.length) {
    items.push({
      id: "firewall",
      group: "system",
      label: "Firewall rules",
      description: ports.length
        ? `The ufw rules that opened port${ports.length === 1 ? "" : "s"} ${ports.join(", ")}.`
        : `The Windows Firewall rule${rules.length === 1 ? "" : "s"} ${rules.join(", ")}.`,
    });
  }

  return items.filter((item) => item.id === "core" || KEEP_ID.test(item.id));
}

/**
 * The installer copied uninstall.sh / .ps1 into the install folder when it installed the CAD; an
 * install made before the Danger zone existed has one without --keep / -Keep, which would remove
 * everything regardless of what was unticked. Refresh it from this CAD's own (updated) copy.
 */
function ensureScriptSupportsKeep(install: Install) {
  const flag = install.isWindows ? "[string]$Keep" : "--keep=";
  const supports = (path: string) => existsSync(path) && readFileSync(path, "utf8").includes(flag);
  if (supports(install.script)) return true;

  const bundled = join(
    getProjectRoot(),
    "scripts",
    "installer",
    install.isWindows ? "uninstall.ps1" : "uninstall.sh",
  );
  if (!supports(bundled)) return false;
  try {
    copyFileSync(bundled, install.script);
    return supports(install.script);
  } catch {
    return false;
  }
}

function whyUnavailable(install: Install | null) {
  if (existsSync("/.dockerenv")) return "container";
  if (!install) return "notInstaller";
  if (install.isWindows) return null;
  if (process.platform !== "linux") return "unsupportedPlatform";
  return null;
}

async function startOnLinux(install: Install, keep: string[], startedAt: number) {
  const args = [...(keep.length ? [`--keep=${keep.join(",")}`] : []), "--yes"];
  // its own systemd unit, so it outlives this API when the uninstaller stops the CAD service
  const hasSystemdRun = existsSync("/usr/bin/systemd-run") || existsSync("/bin/systemd-run");
  const command = hasSystemdRun ? "systemd-run" : "setsid";
  const commandArgs = hasSystemdRun
    ? [`--unit=snailycad-uninstall-${startedAt}`, "--collect", "/bin/bash", install.script, ...args]
    : ["/bin/bash", install.script, ...args];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, commandArgs, { detached: true, stdio: "ignore" });
    child.on("error", () => reject(new BadRequest("unableToStartUninstall")));
    if (hasSystemdRun) {
      child.on("close", (code) =>
        code === 0 ? resolve() : reject(new BadRequest("unableToStartUninstall")),
      );
    } else {
      child.unref();
      resolve();
    }
  });
}

async function startOnWindows(install: Install, keep: string[], startedAt: number) {
  try {
    await runDetachedPowerShellTask({
      taskName: `SnailyCAD-Uninstall-${startedAt}`,
      scriptPath: install.script,
      args: ["-Yes", ...(keep.length ? [`-Keep "${keep.join(",")}"`] : [])],
    });
  } catch {
    throw new BadRequest("unableToStartUninstall");
  }
}

@Controller("/admin/uninstall")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class UninstallCadController {
  @Get("/")
  @Description("What uninstalling this CAD would remove, and whether it can be done from here")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async getUninstallInfo(@Context("user") user: User) {
    const install = readInstall();
    const reason = whyUnavailable(install);
    const isDemoAccount = isDemoMode() && user.username === getDemoConfig().username;
    const isOwner = user.rank === Rank.OWNER;

    return {
      canUninstall: !reason && isOwner && !isDemoAccount,
      reason,
      isOwner,
      isDemoAccount,
      platform: install?.isWindows ? "windows" : "linux",
      name: install?.one("NAME") || "snailycad",
      installDir: install?.installDir ?? null,
      items: install ? getItems(install) : [],
      manualCommand: install
        ? install.isWindows
          ? `powershell -ExecutionPolicy Bypass -File "${install.script}"`
          : `sudo bash ${install.script}`
        : null,
    };
  }

  @Post("/")
  @Description("Uninstall this CAD. Only the owner can do this; it can't be undone.")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async startUninstall(
    @Context("user") user: User,
    @BodyParams("keep") rawKeep: unknown,
    @BodyParams("confirm") confirm: unknown,
  ) {
    await assertNotDemoAccount(user.id);
    if (user.rank !== Rank.OWNER) {
      throw new Forbidden("onlyOwnerCanUninstall");
    }

    const install = readInstall();
    if (whyUnavailable(install) || !install) {
      throw new BadRequest("uninstallMustRunOnHost");
    }

    const name = install.one("NAME") || "snailycad";
    if (typeof confirm !== "string" || confirm.trim() !== name) {
      throw new BadRequest("uninstallConfirmMismatch");
    }

    const items = getItems(install);
    const keepable = new Set(items.filter((i) => !i.locked && !i.unavailable).map((i) => i.id));
    const keep = Array.isArray(rawKeep)
      ? rawKeep.filter((id): id is string => typeof id === "string" && keepable.has(id))
      : [];
    // the MariaDB server only goes together with the CAD's database
    if (keep.includes("database") && keepable.has("db-server") && !keep.includes("db-server")) {
      keep.push("db-server");
    }

    if (!ensureScriptSupportsKeep(install) && keep.length) {
      throw new BadRequest("uninstallScriptOutdated");
    }

    const startedAt = Math.floor(Date.now() / 1000);
    if (install.isWindows) {
      await startOnWindows(install, keep, startedAt);
    } else {
      await startOnLinux(install, keep, startedAt);
    }

    return { started: true, startedAt, kept: keep };
  }
}
