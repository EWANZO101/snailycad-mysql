import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button, Loader } from "@snailycad/ui";
import { ArrowRepeat, BoxArrowUpRight, Clipboard, CloudArrowDown } from "react-bootstrap-icons";
import useFetch from "lib/useFetch";
import { usePermission, Permissions } from "hooks/usePermission";

interface UpdateInfo {
  mode: "git" | "docker" | "local";
  docsUrl: string;
  currentVersion: string | null;
  currentCommitHash: string | null;
  latestReleaseVersion: string | null;
  branch: string | null;
  localChanges: number;
  behindBy: number | null;
  canUpdate: boolean;
  isOwner: boolean;
  isInContainer: boolean;
  isDemoAccount: boolean;
  /** Windows: the "Update SnailyCAD.bat" in the install folder */
  updateBat: string | null;
  manualCommands: string[];
}

const MODE_LABELS: Record<UpdateInfo["mode"], string> = {
  git: "Standalone (git)",
  docker: "Docker",
  local: "Local build",
};

/**
 * one-click CAD update on the admin dashboard. Sends the owner to the live progress page
 * (/__snaily_update) while the CAD updates.
 */
export function UpdateCadCard() {
  const { hasPermissions } = usePermission();
  const { execute, state } = useFetch();
  const [copied, setCopied] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);
  const canManage = hasPermissions([Permissions.ManageCADSettings]);

  const { data, isPending } = useQuery({
    enabled: canManage,
    queryKey: ["admin", "update-info"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { json } = await execute<UpdateInfo>({ path: "/admin/update", noToast: true });
      return "mode" in json ? json : null;
    },
  });

  if (!canManage) return null;

  async function handleUpdate() {
    if (!data) return;
    const what =
      data.mode === "local"
        ? "apply the latest local build"
        : "download and install the latest version";
    if (
      !window.confirm(
        `Update the CAD now? This will ${what}. The CAD is unavailable for a few minutes while it rebuilds.`,
      )
    ) {
      return;
    }

    const { json } = await execute<{ started: boolean; startedAt: number; waitForStop?: boolean }>({
      path: "/admin/update",
      method: "POST",
    });

    if (!json.started) return;
    const progressUrl = `/__snaily_update?since=${json.startedAt}`;
    if (!json.waitForStop) {
      window.location.href = progressUrl;
      return;
    }

    // the updater stops the CAD first, then serves the progress page on this port
    setIsStarting(true);
    const deadline = Date.now() + 90_000;
    while (Date.now() < deadline) {
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 3000);
      });
      const check = await execute<UpdateInfo>({ path: "/admin/update", noToast: true });
      if (!("mode" in check.json)) break;
    }
    window.location.href = progressUrl;
  }

  async function handleCopy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.manualCommands.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  const isUpToDate = data?.mode !== "local" && data?.behindBy === 0;

  return (
    <section className="card p-4 mb-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg p-2 bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
            <CloudArrowDown aria-hidden className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-semibold text-lg">Update CAD</h2>
            {isPending || !data ? (
              <p className="text-sm text-neutral-600 dark:text-gray-400">
                {isPending ? "Checking for updates…" : "Update information is unavailable."}
              </p>
            ) : (
              <>
                <p className="text-sm text-neutral-600 dark:text-gray-400">
                  {data.mode === "local"
                    ? "Applies the latest version built on this server."
                    : isUpToDate
                      ? "This CAD is up to date. Rebuild now rebuilds and restarts it anyway."
                      : data.behindBy
                        ? `${data.behindBy} new change${data.behindBy === 1 ? "" : "s"} available.`
                        : "Installs the latest version of SnailyCAD."}
                </p>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
                  <dt className="text-neutral-500 dark:text-gray-400">Version</dt>
                  <dd>
                    {data.currentVersion ?? "unknown"}
                    {data.currentCommitHash ? (
                      <span className="ml-1.5 font-mono text-xs text-neutral-500 dark:text-gray-400">
                        {data.currentCommitHash}
                      </span>
                    ) : null}
                  </dd>
                  {data.latestReleaseVersion ? (
                    <>
                      <dt className="text-neutral-500 dark:text-gray-400">Latest release</dt>
                      <dd>{data.latestReleaseVersion}</dd>
                    </>
                  ) : null}
                  <dt className="text-neutral-500 dark:text-gray-400">Method</dt>
                  <dd>
                    {MODE_LABELS[data.mode]}{" "}
                    <Link
                      href={data.docsUrl}
                      target="_blank"
                      className="inline-flex items-center gap-1 underline text-blue-600 dark:text-blue-400"
                    >
                      docs <BoxArrowUpRight className="w-3 h-3" aria-hidden />
                    </Link>
                  </dd>
                  {data.updateBat ? (
                    <>
                      <dt className="text-neutral-500 dark:text-gray-400">On the PC</dt>
                      <dd>
                        double-click{" "}
                        <code className="font-mono text-xs break-all">{data.updateBat}</code>
                      </dd>
                    </>
                  ) : null}
                  {data.mode !== "local" && data.localChanges > 0 ? (
                    <>
                      <dt className="text-neutral-500 dark:text-gray-400">Local changes</dt>
                      <dd>{data.localChanges} file(s), saved with git stash before updating</dd>
                    </>
                  ) : null}
                </dl>
              </>
            )}
          </div>
        </div>

        {data ? (
          data.canUpdate ? (
            <Button
              variant="blue"
              className="flex items-center gap-2 shrink-0 w-fit"
              onPress={handleUpdate}
              disabled={state === "loading" || isStarting}
            >
              {state === "loading" || isStarting ? (
                <Loader />
              ) : (
                <ArrowRepeat aria-hidden className="w-4 h-4" />
              )}
              {isStarting
                ? "Stopping the CAD…"
                : data.mode === "local"
                  ? "Apply latest build"
                  : isUpToDate
                    ? "Rebuild now"
                    : "Update now"}
            </Button>
          ) : (
            <p className="text-sm text-neutral-600 dark:text-gray-400 md:max-w-xs">
              {data.isDemoAccount
                ? "Updates are disabled for the demo account."
                : !data.isOwner
                  ? "Only the CAD owner can run updates."
                  : data.isInContainer
                    ? "This CAD runs in a container. Run the commands below on the Docker host."
                    : "One-click updates aren't available on this server. Use the commands below."}
            </p>
          )
        ) : null}
      </div>

      {data && !data.canUpdate && data.isOwner && !data.isDemoAccount ? (
        <div className="mt-4 rounded-lg bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-quaternary">
            <span className="text-xs text-neutral-500 dark:text-gray-400">
              Run in the CAD folder
            </span>
            <Button
              size="xs"
              variant="transparent"
              onPress={handleCopy}
              className="flex items-center gap-1"
            >
              <Clipboard aria-hidden className="w-3 h-3" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="px-3 py-2 text-sm overflow-x-auto thin-scrollbar">
            {data.manualCommands.join("\n")}
          </pre>
        </div>
      ) : null}
    </section>
  );
}
