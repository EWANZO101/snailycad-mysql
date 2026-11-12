import * as React from "react";
import dynamic from "next/dynamic";
import { TabsContent } from "@radix-ui/react-tabs";
import { Alert, Button, Loader, SwitchField } from "@snailycad/ui";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { useAuth } from "context/AuthContext";
import useFetch from "lib/useFetch";
import { toastMessage } from "lib/toastMessage";

// the editor from VS Code (Monaco); only loaded in the browser
const MonacoEditor = dynamic(async () => (await import("@monaco-editor/react")).default, {
  ssr: false,
  loading: () => <Loader />,
});

interface Settings {
  enabled: boolean;
  userIds: string[];
  protectedKeys: string[];
  defaultProtectedKeys: string[];
  candidates: { id: string; username: string; rank: string }[];
}

interface EnvData {
  isOwner: boolean;
  isAllowed: boolean;
  enabled: boolean;
  canRestart: boolean;
  content: string | null;
  path?: string;
  protectedKeys?: string[];
  backups?: string[];
  settings?: Settings | null;
}

interface SaveResult {
  saved: boolean;
  changedKeys: string[];
  backup: string | null;
  restarting: boolean;
  needsRebuild: boolean;
}

const ERRORS: Record<string, string> = {
  envEditorNotAllowed: "You don't have access to the .env editor.",
  onlyOwnerCanChangeEnvEditor: "Only the CAD owner can change who can use the .env editor.",
  invalidContent: "The file contains invalid characters.",
};

function translateError(error: string) {
  if (error.startsWith("cannotReferenceProtectedKey:")) {
    return `You can't use the protected value ${error.split(":")[1]} in other settings.`;
  }
  return ERRORS[error] ?? error;
}

/**
 * Admin > CAD Settings > Environment (.env). The owner can always use it, turn it on for others and
 * pick who. Protected values (database, secrets, tokens) are hidden from everyone but the owner.
 */
export function EnvEditorTab() {
  const { user } = useAuth();
  const { execute, state } = useFetch();

  const [data, setData] = React.useState<EnvData | null>(null);
  const [content, setContent] = React.useState("");
  const [settings, setSettings] = React.useState<Settings | null>(null);
  const [extraKeys, setExtraKeys] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<SaveResult | null>(null);

  const isDark = user?.isDarkTheme ?? true;
  const isDirty = data?.content !== null && data?.content !== undefined && content !== data.content;

  const load = React.useCallback(async () => {
    const { json, error } = await execute<EnvData>({
      path: "/admin/env-editor",
      method: "GET",
      noToast: true,
    });

    if (error) {
      setError(translateError(error));
      return;
    }
    if (json && "isAllowed" in json) {
      setData(json);
      setContent(json.content ?? "");
      if (json.settings) {
        setSettings(json.settings);
        setExtraKeys(json.settings.protectedKeys.join(", "));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleSave(restart: boolean) {
    setError(null);
    setResult(null);

    const { json, error } = await execute<SaveResult>({
      path: "/admin/env-editor",
      method: "PUT",
      data: { content, restart },
      noToast: true,
    });

    if (error) {
      setError(translateError(error));
      return;
    }

    setResult(json);
    if (json.saved) {
      toastMessage({ icon: "success", title: "Saved", message: ".env saved." });
    }
    if (!json.restarting) await load();
  }

  async function handleSaveSettings() {
    if (!settings) return;
    setError(null);

    const { json, error } = await execute<Settings>({
      path: "/admin/env-editor/settings",
      method: "PUT",
      data: {
        enabled: settings.enabled,
        userIds: settings.userIds,
        protectedKeys: extraKeys
          .split(/[\s,]+/)
          .map((key) => key.trim())
          .filter(Boolean),
      },
      noToast: true,
    });

    if (error) {
      setError(translateError(error));
      return;
    }

    setSettings(json);
    setExtraKeys(json.protectedKeys.join(", "));
    toastMessage({ icon: "success", title: "Saved", message: "Editor access saved." });
    await load();
  }

  function toggleUser(id: string) {
    setSettings((prev) =>
      prev
        ? {
            ...prev,
            userIds: prev.userIds.includes(id)
              ? prev.userIds.filter((userId) => userId !== id)
              : [...prev.userIds, id],
          }
        : prev,
    );
  }

  return (
    <TabsContent value={SettingsTabs.EnvEditor} className="mt-3">
      <h2 className="text-2xl font-semibold">Environment (.env)</h2>
      <p className="my-2 text-neutral-700 dark:text-gray-400 max-w-3xl">
        Edit this CAD&apos;s <code>.env</code> file. The old file is backed up every time you save.
        Changes apply after a restart; <code>NEXT_PUBLIC_*</code> changes also need a rebuild.
      </p>

      {error ? <Alert type="error" className="my-3" message={error} /> : null}

      {!data ? (
        <Loader />
      ) : !data.isAllowed ? (
        <Alert
          type="warning"
          className="my-3"
          title="No access"
          message={
            data.enabled
              ? "The CAD owner hasn't given you access to the .env editor."
              : "The .env editor is turned off. Only the CAD owner can turn it on and choose who can use it."
          }
        />
      ) : (
        <>
          {data.isOwner && settings ? (
            <section className="my-4 p-4 rounded-md border border-gray-300 dark:border-quaternary max-w-3xl">
              <h3 className="text-lg font-semibold">Who can use the editor</h3>
              <p className="text-sm text-neutral-700 dark:text-gray-400 mb-3">
                Only you (the owner) can change this. You can always use the editor.
              </p>

              <SwitchField
                isSelected={settings.enabled}
                onChange={(enabled) => setSettings({ ...settings, enabled })}
              >
                Let the users below edit the .env
              </SwitchField>

              <div className="mt-3">
                {settings.candidates.length <= 0 ? (
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    No other users can manage CAD settings. Give someone the &quot;Manage CAD
                    settings&quot; permission first.
                  </p>
                ) : (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {settings.candidates.map((candidate) => (
                      <li key={candidate.id}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={settings.userIds.includes(candidate.id)}
                            onChange={() => toggleUser(candidate.id)}
                          />
                          {candidate.username}
                          <span className="text-xs text-neutral-500">({candidate.rank})</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <label className="block mt-4 text-sm font-semibold">
                Extra protected keys (owner only)
                <input
                  className="mt-1 w-full px-2 py-1 rounded-md border bg-white dark:bg-secondary border-gray-300 dark:border-quaternary font-mono text-sm"
                  value={extraKeys}
                  placeholder="e.g. DISCORD_BOT_TOKEN, STEAM_API_KEY"
                  onChange={(event) => setExtraKeys(event.target.value)}
                />
              </label>
              <p className="mt-1 text-xs text-neutral-600 dark:text-gray-400">
                Always protected: {settings.defaultProtectedKeys.join(", ")}, and any key with
                SECRET, PASSWORD, TOKEN, PRIVATE or _KEY in its name.
              </p>

              <Button
                className="mt-3"
                size="xs"
                isDisabled={state === "loading"}
                onPress={handleSaveSettings}
              >
                Save access
              </Button>
            </section>
          ) : null}

          {!data.isOwner && data.protectedKeys?.length ? (
            <Alert
              type="info"
              className="my-3"
              message={`Only the owner can see or change: ${data.protectedKeys.join(
                ", ",
              )}. Your changes to these are ignored.`}
            />
          ) : null}

          <p className="text-sm text-neutral-600 dark:text-gray-400 mb-2">
            <code>{data.path}</code>
          </p>

          <div className="rounded-md overflow-hidden border border-gray-300 dark:border-quaternary">
            <MonacoEditor
              height="60vh"
              defaultLanguage="ini"
              theme={isDark ? "vs-dark" : "light"}
              value={content}
              onChange={(value) => setContent(value ?? "")}
              options={{
                minimap: { enabled: false },
                wordWrap: "on",
                fontSize: 14,
                scrollBeyondLastLine: false,
                renderWhitespace: "boundary",
              }}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Button isDisabled={state === "loading" || !isDirty} onPress={() => handleSave(false)}>
              {state === "loading" ? <Loader className="mr-2 inline-block" /> : null}
              Save
            </Button>
            {data.canRestart ? (
              <Button
                variant="danger"
                isDisabled={state === "loading" || !isDirty}
                onPress={() => handleSave(true)}
              >
                Save &amp; restart CAD
              </Button>
            ) : null}
            <Button
              variant="cancel"
              isDisabled={state === "loading" || !isDirty}
              onPress={() => setContent(data.content ?? "")}
            >
              Undo changes
            </Button>
          </div>

          {result?.saved ? (
            <Alert
              type="success"
              className="my-3"
              message={[
                `Changed: ${result.changedKeys.join(", ") || "comments/formatting only"}.`,
                result.backup ? `Old file backed up to ${result.backup}.` : null,
                result.restarting
                  ? "The CAD is restarting, reload the page in a few seconds."
                  : "Restart the CAD to use the new values.",
                result.needsRebuild
                  ? "NEXT_PUBLIC_ values also need a rebuild (pnpm run build)."
                  : null,
              ]
                .filter(Boolean)
                .join(" ")}
            />
          ) : null}

          {data.isOwner && data.backups?.length ? (
            <details className="mt-4 max-w-3xl">
              <summary className="cursor-pointer text-sm font-semibold">
                Backups ({data.backups.length}, newest first)
              </summary>
              <ul className="mt-2 text-sm font-mono">
                {data.backups.map((name) => (
                  <li key={name}>.env-backups/{name}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </TabsContent>
  );
}
