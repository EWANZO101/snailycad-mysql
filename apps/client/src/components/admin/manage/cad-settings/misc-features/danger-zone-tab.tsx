import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useQuery } from "@tanstack/react-query";
import { Button, Loader } from "@snailycad/ui";
import {
  CheckCircleFill,
  Clipboard,
  ExclamationTriangle,
  LockFill,
  Trash3,
} from "react-bootstrap-icons";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import useFetch from "lib/useFetch";

interface UninstallItem {
  id: string;
  group: "cad" | "data" | "software" | "system";
  label: string;
  description: string;
  locked?: boolean;
  unavailable?: string;
  implies?: string[];
}

interface UninstallStatus {
  canUninstall: boolean;
  reason: "container" | "notInstaller" | "unsupportedPlatform" | null;
  isOwner: boolean;
  isDemoAccount: boolean;
  platform: "windows" | "linux";
  isDefaultPassword: boolean;
}

interface UninstallInfo extends UninstallStatus {
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

const REASONS: Record<NonNullable<UninstallStatus["reason"]>, string> = {
  container:
    "This CAD runs in a container, so it can't remove itself. Run the uninstaller on the Docker host.",
  notInstaller:
    "This CAD wasn't set up with the one-line installer, so there's no record of what to remove. Stop its service and delete its folder and database by hand.",
  unsupportedPlatform: "Uninstalling from here isn't supported on this operating system.",
};

const inputClassName =
  "mt-1 block w-full max-w-xs rounded-md border px-3 py-1.5 bg-white dark:bg-secondary border-gray-200 dark:border-quaternary";

/**
 * CAD Settings > Danger zone: uninstalls the whole CAD (made by the one-line installer) and
 * everything it installed, leaving out whatever the owner unticks. Locked with the uninstall
 * password (UNINSTALL_PASSWORD in .env, "snaily-2026" by default).
 */
export function DangerZoneTab() {
  const { execute, state } = useFetch();

  const [password, setPassword] = React.useState("");
  const [info, setInfo] = React.useState<UninstallInfo | null>(null);
  const [removing, setRemoving] = React.useState<Set<string>>(new Set());
  const [confirm, setConfirm] = React.useState("");
  const [phase, setPhase] = React.useState<"idle" | "running" | "done">("idle");
  const [copied, setCopied] = React.useState(false);

  const status = useQuery({
    queryKey: ["admin", "uninstall-status"],
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { json } = await execute<UninstallStatus>({ path: "/admin/uninstall", noToast: true });
      return "canUninstall" in json ? json : null;
    },
  });
  const data = status.data;

  // once started, the CAD goes away under this page: wait until the API stops answering
  React.useEffect(() => {
    if (phase !== "running") return;
    let failures = 0;
    const timer = setInterval(async () => {
      const { json } = await execute<UninstallStatus>({ path: "/admin/uninstall", noToast: true });
      failures = "canUninstall" in json ? 0 : failures + 1;
      if (failures >= 3) {
        clearInterval(timer);
        setPhase("done");
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleUnlock(event?: React.FormEvent) {
    event?.preventDefault();
    const { json } = await execute<UninstallInfo>({
      path: "/admin/uninstall/unlock",
      method: "POST",
      data: { password },
    });
    if ("items" in json) {
      setInfo(json);
      setRemoving(new Set(json.items.filter((item) => !item.unavailable).map((item) => item.id)));
    }
  }

  function toggle(item: UninstallItem) {
    if (!info || item.locked || item.unavailable) return;
    const next = new Set(removing);
    if (next.has(item.id)) {
      next.delete(item.id);
      // keeping the database keeps the server it lives in
      info.items.filter((i) => i.implies?.includes(item.id)).forEach((i) => next.delete(i.id));
    } else {
      next.add(item.id);
      item.implies?.forEach((id) => next.add(id));
    }
    setRemoving(next);
  }

  async function handleUninstall() {
    if (!info) return;
    const keep = info.items
      .filter((i) => !i.locked && !i.unavailable && !removing.has(i.id))
      .map((i) => i.id);
    const { json } = await execute<{ started: boolean }>({
      path: "/admin/uninstall",
      method: "POST",
      data: { keep, confirm: confirm.trim(), password },
    });
    if (json.started) setPhase("running");
  }

  async function handleCopy() {
    if (!info?.manualCommand) return;
    try {
      await navigator.clipboard.writeText(info.manualCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable
    }
  }

  if (phase !== "idle") {
    return (
      <TabsContent value={SettingsTabs.DangerZone}>
        <div className="fixed inset-0 z-[999] grid place-items-center bg-black/70 p-4">
          <div className="card max-w-md w-full p-6 text-center">
            {phase === "running" ? (
              <>
                <Loader className="mx-auto mb-4 w-6 h-6" />
                <h2 className="font-semibold text-lg">Uninstalling SnailyCAD…</h2>
                <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
                  The CAD is removing itself. This page stops working as it goes; keep it open to
                  see when it&apos;s finished.
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
      </TabsContent>
    );
  }

  const removable = info?.items.filter((i) => !i.unavailable) ?? [];
  const keptCount = removable.filter((i) => !removing.has(i.id)).length;

  return (
    <TabsContent value={SettingsTabs.DangerZone} className="mt-3">
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-1 rounded-lg p-2 bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-200">
          <ExclamationTriangle aria-hidden className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-2xl font-semibold">Danger zone</h2>
          <p className="mt-1 text-neutral-600 dark:text-gray-400">
            Uninstall SnailyCAD from this {data?.platform === "windows" ? "PC" : "server"} and
            remove everything the installer added, as if it was never there. Untick anything you
            want to keep.
          </p>
        </div>
      </header>

      {status.isPending ? <Loader /> : null}

      {data && !data.isOwner ? (
        <p className="card p-4 text-neutral-600 dark:text-gray-400">
          Only the CAD owner can uninstall the CAD.
        </p>
      ) : data?.isDemoAccount ? (
        <p className="card p-4 text-neutral-600 dark:text-gray-400">
          Uninstalling is disabled for the demo account.
        </p>
      ) : data && !info ? (
        <form
          onSubmit={handleUnlock}
          className="card p-4 border border-red-300 dark:border-red-500/40"
        >
          <h3 className="font-semibold flex items-center gap-2">
            <LockFill aria-hidden className="w-4 h-4" /> Locked
          </h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-gray-400">
            Enter the uninstall password. It&apos;s set in the setup wizard, or as{" "}
            <code>UNINSTALL_PASSWORD</code> in the CAD&apos;s <code>.env</code>
            {data.isDefaultPassword ? " (still the default: change it there)" : ""}.
          </p>
          <label className="block mt-3 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className={inputClassName}
            />
          </label>
          <Button
            type="submit"
            variant="danger"
            className="mt-3 flex items-center gap-2"
            disabled={!password || state === "loading"}
          >
            {state === "loading" ? <Loader /> : <LockFill aria-hidden className="w-4 h-4" />}
            Unlock
          </Button>
        </form>
      ) : null}

      {info && !info.canUninstall && info.reason ? (
        <section className="card p-4">
          <p className="text-sm text-neutral-600 dark:text-gray-400">{REASONS[info.reason]}</p>
          {info.manualCommand ? (
            <div className="mt-3 rounded-lg bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-200 dark:border-quaternary">
                <span className="text-xs text-neutral-500 dark:text-gray-400">
                  Run as {info.platform === "windows" ? "administrator" : "root"}
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
                {info.manualCommand}
              </pre>
            </div>
          ) : null}
        </section>
      ) : null}

      {info?.canUninstall ? (
        <section className="card p-4 border border-red-300 dark:border-red-500/40 flex flex-col gap-5">
          {GROUPS.map((group) => {
            const items = info.items.filter((i) => i.group === group.id);
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
              Type <code className="font-mono font-semibold">{info.name}</code> to confirm
              <input
                type="text"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                className={inputClassName}
              />
            </label>
            <Button
              variant="danger"
              className="mt-3 flex items-center gap-2"
              disabled={confirm.trim() !== info.name || state === "loading"}
              onPress={handleUninstall}
            >
              {state === "loading" ? <Loader /> : <Trash3 aria-hidden className="w-4 h-4" />}
              Uninstall permanently
            </Button>
          </div>
        </section>
      ) : null}
    </TabsContent>
  );
}
