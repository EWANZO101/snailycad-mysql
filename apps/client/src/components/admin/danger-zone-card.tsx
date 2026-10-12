import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Loader } from "@snailycad/ui";
import { CheckCircleFill, Clipboard, ExclamationTriangle, Trash3 } from "react-bootstrap-icons";
import useFetch from "lib/useFetch";
import { usePermission, Permissions } from "hooks/usePermission";

interface UninstallItem {
  id: string;
  group: "cad" | "data" | "software" | "system";
  label: string;
  description: string;
  locked?: boolean;
  unavailable?: string;
  implies?: string[];
}

interface UninstallInfo {
  canUninstall: boolean;
  reason: "container" | "notInstaller" | "unsupportedPlatform" | null;
  isOwner: boolean;
  isDemoAccount: boolean;
  platform: "windows" | "linux";
  name: string;
  installDir: string | null;
  items: UninstallItem[];
  manualCommand: string | null;
}

const GROUPS: { id: UninstallItem["group"]; label: string }[] = [
  { id: "cad", label: "The CAD" },
  { id: "data", label: "Data" },
  { id: "software", label: "Software it installed" },
  { id: "system", label: "System changes" },
];

const REASONS: Record<NonNullable<UninstallInfo["reason"]>, string> = {
  container:
    "This CAD runs in a container, so it can't remove itself. Run the uninstaller on the Docker host.",
  notInstaller:
    "This CAD wasn't set up with the one-line installer, so there's no record of what to remove. Stop its service and delete its folder and database by hand.",
  unsupportedPlatform: "Uninstalling from here isn't supported on this operating system.",
};

/**
 * Admin dashboard danger zone: uninstalls the whole CAD (made by the one-line installer) and
 * everything it installed, leaving out whatever the owner unticks.
 */
export function DangerZoneCard() {
  const { hasPermissions } = usePermission();
  const { execute, state } = useFetch();
  const canManage = hasPermissions([Permissions.ManageCADSettings]);

  const [open, setOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());
  const [confirm, setConfirm] = React.useState("");
  const [phase, setPhase] = React.useState<"idle" | "running" | "done">("idle");
  const [copied, setCopied] = React.useState(false);

  const { data } = useQuery({
    enabled: canManage,
    queryKey: ["admin", "uninstall-info"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { json } = await execute<UninstallInfo>({ path: "/admin/uninstall", noToast: true });
      return json && "items" in json ? json : null;
    },
  });

  React.useEffect(() => {
    if (data) setRemoving(new Set(data.items.filter((i) => !i.unavailable).map((i) => i.id)));
  }, [data]);

  // once started, the CAD goes away under this page: wait until the API stops answering
  React.useEffect(() => {
    if (phase !== "running") return;
    let failures = 0;
    const timer = setInterval(async () => {
      const { json } = await execute<UninstallInfo>({ path: "/admin/uninstall", noToast: true });
      failures = json && "items" in json ? 0 : failures + 1;
      if (failures >= 3) {
        clearInterval(timer);
        setPhase("done");
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!canManage || !data || !data.isOwner || data.isDemoAccount) return null;

  function toggle(item: UninstallItem) {
    if (item.locked || item.unavailable) return;
    const next = new Set(removing);
    if (next.has(item.id)) {
      next.delete(item.id);
      // keeping the database keeps the server it lives in
      data!.items.filter((i) => i.implies?.includes(item.id)).forEach((i) => next.delete(i.id));
    } else {
      next.add(item.id);
      item.implies?.forEach((id) => next.add(id));
    }
    setRemoving(next);
  }

  async function handleUninstall() {
    if (!data) return;
    const keep = data.items
      .filter((i) => !i.locked && !i.unavailable && !removing.has(i.id))
      .map((i) => i.id);
    const { json } = await execute<{ started: boolean }>({
      path: "/admin/uninstall",
      method: "POST",
      data: { keep, confirm: confirm.trim() },
    });
    if (json?.started) setPhase("running");
  }

  async function handleCopy() {
    if (!data?.manualCommand) return;
    try {
      await navigator.clipboard.writeText(data.manualCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  if (phase !== "idle") {
    return (
      <div className="fixed inset-0 z-[999] grid place-items-center bg-black/70 p-4">
        <div className="card max-w-md w-full p-6 text-center">
          {phase === "running" ? (
            <>
              <Loader className="mx-auto mb-4 w-6 h-6" />
              <h2 className="font-semibold text-lg">Uninstalling SnailyCAD…</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
                The CAD is removing itself. This page stops working as it goes; keep it open to see
                when it&apos;s finished.
              </p>
            </>
          ) : (
            <>
              <CheckCircleFill aria-hidden className="mx-auto mb-4 w-8 h-8 text-green-500" />
              <h2 className="font-semibold text-lg">SnailyCAD has been removed</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
                The CAD no longer responds. You can close this tab.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const removable = data.items.filter((i) => !i.unavailable);
  const keptCount = removable.filter((i) => !removing.has(i.id)).length;
  const confirmed = confirm.trim() === data.name;

  return (
    <section className="card p-4 mb-8 border border-red-300 dark:border-red-500/40">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 rounded-lg p-2 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200">
            <ExclamationTriangle aria-hidden className="w-5 h-5" />
          </span>
          <div>
            <h2 className="font-semibold text-lg">Danger zone</h2>
            <p className="text-sm text-neutral-600 dark:text-gray-400">
              Uninstall SnailyCAD from this {data.platform === "windows" ? "PC" : "server"} and
              remove everything the installer added, as if it was never there. Untick anything you
              want to keep.
            </p>
          </div>
        </div>

        {data.canUninstall ? (
          <Button
            variant="danger"
            className="flex items-center gap-2 shrink-0 w-fit"
            onPress={() => setOpen((v) => !v)}
          >
            <Trash3 aria-hidden className="w-4 h-4" />
            {open ? "Cancel" : "Uninstall SnailyCAD"}
          </Button>
        ) : null}
      </div>

      {!data.canUninstall && data.reason ? (
        <div className="mt-4">
          <p className="text-sm text-neutral-600 dark:text-gray-400">{REASONS[data.reason]}</p>
          {data.manualCommand ? (
            <div className="mt-3 rounded-lg bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-quaternary">
                <span className="text-xs text-neutral-500 dark:text-gray-400">
                  Run as {data.platform === "windows" ? "administrator" : "root"}
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
                {data.manualCommand}
              </pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {open && data.canUninstall ? (
        <div className="mt-5 flex flex-col gap-5">
          {GROUPS.map((group) => {
            const items = data.items.filter((i) => i.group === group.id);
            if (!items.length) return null;
            return (
              <fieldset key={group.id}>
                <legend className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-gray-400 mb-2">
                  {group.label}
                </legend>
                <ul className="flex flex-col gap-2">
                  {items.map((item) => {
                    const checked = removing.has(item.id);
                    const disabled = Boolean(item.locked || item.unavailable);
                    return (
                      <li key={item.id}>
                        <label
                          className={`flex items-start gap-3 rounded-lg border p-3 border-gray-200 dark:border-quaternary ${
                            disabled ? "opacity-70" : "cursor-pointer"
                          } ${checked ? "bg-red-50/60 dark:bg-red-500/10" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 w-4 h-4 accent-red-600"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => toggle(item)}
                          />
                          <span className="min-w-0">
                            <span className="font-medium">
                              {item.label}
                              {item.locked ? (
                                <span className="ml-2 text-xs font-normal text-neutral-500 dark:text-gray-400">
                                  always removed
                                </span>
                              ) : null}
                              {!disabled && !checked ? (
                                <span className="ml-2 text-xs font-normal text-green-700 dark:text-green-400">
                                  kept
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-sm text-neutral-600 dark:text-gray-400 break-words">
                              {item.unavailable ?? item.description}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            );
          })}

          <div className="rounded-lg border border-red-300 dark:border-red-500/40 p-3">
            <p className="text-sm">
              This can&apos;t be undone.
              {removing.has("database")
                ? " All CAD data is deleted; export anything you need first."
                : " The database is kept."}
              {keptCount ? ` ${keptCount} item${keptCount === 1 ? " is" : "s are"} kept.` : ""}
            </p>
            <label className="block mt-3 text-sm">
              Type <code className="font-mono font-semibold">{data.name}</code> to confirm
              <input
                type="text"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                className="mt-1 block w-full max-w-xs rounded-md border px-3 py-1.5 bg-white dark:bg-secondary border-gray-200 dark:border-quaternary"
              />
            </label>
            <Button
              variant="danger"
              className="mt-3 flex items-center gap-2"
              disabled={!confirmed || state === "loading"}
              onPress={handleUninstall}
            >
              {state === "loading" ? <Loader /> : <Trash3 aria-hidden className="w-4 h-4" />}
              Uninstall permanently
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
