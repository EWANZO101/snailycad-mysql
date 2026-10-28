import { execFile, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { Controller, UseBeforeEach } from "@tsed/common";
import { Context } from "@tsed/platform-params";
import { ContentType, Description, Get, Post, Tags } from "@tsed/schema";
import { BadRequest, Forbidden } from "@tsed/exceptions";
import { Rank, type User } from "@prisma/client";
import { IsAuth } from "middlewares/auth/is-auth";
import { UsePermissions, Permissions } from "middlewares/use-permissions";
import { findApiRoot } from "lib/recovery/recovery-token";
import { assertNotDemoAccount, getDemoConfig, isDemoMode } from "lib/demo/demo-mode";
import { getCADVersion } from "@snailycad/utils/version";

const execFileAsync = promisify(execFile);

type UpdateMode = "git" | "docker" | "local";

const DOCS_URLS: Record<UpdateMode, string> = {
  git: "https://docs.snailycad.org/docs/installations/updating/methods/standalone",
  docker: "https://docs.snailycad.org/docs/installations/updating/methods/docker",
  local: "https://docs.snailycad.org/docs/installations/updating/methods/standalone",
};

function getUpdateMode(): UpdateMode {
  const mode = process.env.UPDATE_MODE?.trim().toLowerCase();
  if (mode === "local" || mode === "docker" || mode === "git") return mode;
  // the API image has no git checkout: a containerised CAD is updated with Docker Compose
  return existsSync("/.dockerenv") ? "docker" : "git";
}

function getProjectRoot() {
  return resolve(findApiRoot(), "..", "..");
}

async function git(args: string[], timeout = 15_000) {
  const { stdout } = await execFileAsync("git", args, { cwd: getProjectRoot(), timeout });
  return stdout.trim();
}

/** whether this process can start the updater (it must run on the host, with systemd) */
function canRunUpdater(mode: UpdateMode) {
  const isInContainer = existsSync("/.dockerenv");
  if (isInContainer) return false;
  if (process.platform !== "linux") return false;
  if (mode === "docker") return true;
  return existsSync("/run/systemd/system");
}

@Tags("Admin")
@Controller("/admin/update")
@UseBeforeEach(IsAuth)
@ContentType("application/json")
export class UpdateCadController {
  @Get("/")
  @Description("Get information about the current version and how this CAD is updated")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async getUpdateInfo(@Context("user") user: User) {
    const mode = getUpdateMode();
    const versions = await getCADVersion().catch(() => null);

    let branch: string | null = null;
    let localChanges = 0;
    let behindBy: number | null = null;

    try {
      branch = await git(["rev-parse", "--abbrev-ref", "HEAD"]);
      localChanges = (await git(["status", "--porcelain", "--untracked-files=no"]))
        .split("\n")
        .filter(Boolean).length;

      if (mode !== "local") {
        await git(["fetch", "--quiet", "origin", process.env.UPDATE_BRANCH || "main"], 20_000);
        behindBy = Number(
          await git(["rev-list", "--count", `HEAD..origin/${process.env.UPDATE_BRANCH || "main"}`]),
        );
      }
    } catch {
      // not a git checkout or the remote is unreachable
    }

    const isInContainer = existsSync("/.dockerenv");
    const isDemoAccount = isDemoMode() && user.username === getDemoConfig().username;

    return {
      mode,
      docsUrl: DOCS_URLS[mode],
      currentVersion: versions?.currentVersion ?? null,
      currentCommitHash: versions?.currentCommitHash ?? null,
      latestReleaseVersion: versions?.latestReleaseVersion ?? null,
      branch,
      localChanges,
      behindBy,
      canUpdate: canRunUpdater(mode) && user.rank === Rank.OWNER && !isDemoAccount,
      isDemoAccount,
      isOwner: user.rank === Rank.OWNER,
      isInContainer,
      manualCommands:
        mode === "docker"
          ? [
              "git stash",
              "git pull origin main",
              "docker compose -f production.docker-compose.yml build",
              "docker compose -f production.docker-compose.yml up -d",
            ]
          : [
              "git stash",
              "git pull origin main",
              "pnpm install",
              "pnpm run build",
              "pnpm run start",
            ],
    };
  }

  @Post("/")
  @Description("Update the CAD to the latest version. Only the owner can do this.")
  @UsePermissions({ permissions: [Permissions.ManageCADSettings] })
  async startUpdate(@Context("user") user: User) {
    await assertNotDemoAccount(user.id);

    if (user.rank !== Rank.OWNER) {
      throw new Forbidden("onlyOwnerCanUpdate");
    }

    const mode = getUpdateMode();
    if (!canRunUpdater(mode)) {
      throw new BadRequest("updateMustRunOnHost");
    }

    const script = join(getProjectRoot(), "scripts", "update-cad.sh");
    if (!existsSync(script)) {
      throw new BadRequest("updateScriptMissing");
    }

    const startedAt = Math.floor(Date.now() / 1000);
    const env = {
      ...process.env,
      UPDATE_MODE: mode,
      PROJECT_DIR: getProjectRoot(),
    };

    // run it as its own systemd unit, so it survives this API being restarted by the update
    const hasSystemdRun = existsSync("/usr/bin/systemd-run") || existsSync("/bin/systemd-run");
    const command = hasSystemdRun ? "systemd-run" : "setsid";
    const args = hasSystemdRun
      ? [
          `--unit=snailycad-update-${startedAt}`,
          "--collect",
          `--setenv=UPDATE_MODE=${mode}`,
          `--setenv=PROJECT_DIR=${getProjectRoot()}`,
          ...(process.env.UPDATE_BRANCH
            ? [`--setenv=UPDATE_BRANCH=${process.env.UPDATE_BRANCH}`]
            : []),
          "/bin/bash",
          script,
        ]
      : ["/bin/bash", script];

    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(command, args, { env, detached: true, stdio: "ignore" });
      child.on("error", () => reject(new BadRequest("unableToStartUpdate")));
      if (hasSystemdRun) {
        child.on("close", (code) =>
          code === 0 ? resolvePromise() : reject(new BadRequest("unableToStartUpdate")),
        );
      } else {
        child.unref();
        resolvePromise();
      }
    });

    return { started: true, startedAt, mode };
  }
}
