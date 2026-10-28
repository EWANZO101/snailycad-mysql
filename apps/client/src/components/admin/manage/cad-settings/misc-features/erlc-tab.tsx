import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Loader, SelectField, SwitchField, TextField } from "@snailycad/ui";
import { getAPIUrl } from "@snailycad/utils/api-url";
import Link from "next/link";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { SettingsTabHeader } from "components/admin/cad-settings/settings-tab-header";
import { Controller } from "react-bootstrap-icons";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import useFetch from "lib/useFetch";

type Target = "CALL_911_LEO" | "CALL_911_EMS_FD" | "TOW" | "IGNORE";
type TeamMap = Record<string, Target>;

export type ErlcState =
  | "starting"
  | "featureOff"
  | "disabled"
  | "notConfigured"
  | "paused"
  | "online"
  | "offline"
  | "rateLimited"
  | "error";

export interface ErlcStatus {
  state: ErlcState;
  lastPollAt: string | null;
  lastSuccessAt: string | null;
  nextPollAt: string | null;
  lastError: { status: number | null; code: number | null; message: string } | null;
}

interface ErlcSettingsData {
  id: string;
  enabled: boolean;
  serverKeySet: boolean;
  apiKeySet: boolean;
  pollSeconds: number;
  create911Calls: boolean;
  teamMap: TeamMap;
  pausedReason: string | null;
  pausedAt: string | null;
  status: ErlcStatus;
}

type TestResult =
  | { result: "ok"; name: string | null; players: number | null; maxPlayers: number | null }
  | { result: "rejected"; code: number | null; message: string | null }
  | { result: "rateLimited"; retryInSeconds: number }
  | { result: "error"; status: number; code: number | null; message: string | null }
  | { result: "unreachable"; message: string }
  | { result: "offline" | "moduleOutdated" | "noKey" };

const TARGETS: Target[] = ["CALL_911_LEO", "CALL_911_EMS_FD", "TOW", "IGNORE"];
const QUERY_KEY = ["admin", "erlc"];
const BASE_PATH = "/admin/manage/cad-settings/erlc";

function formatTime(value: string | null) {
  return value ? new Date(value).toLocaleTimeString() : "—";
}

/** ER:LC (Roblox) private server: server key, teams, webhook and the poller's status */
export function ErlcTab() {
  const t = useTranslations("Erlc");
  const common = useTranslations("Common");
  const { ERLC } = useFeatureEnabled();
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState<{
    enabled: boolean;
    serverKey: string;
    apiKey: string;
    pollSeconds: string;
    create911Calls: boolean;
    teamMap: TeamMap;
  } | null>(null);
  const [newTeam, setNewTeam] = React.useState("");
  const [testResult, setTestResult] = React.useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [copied, setCopied] = React.useState(false);

  const settings = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { json } = await execute<ErlcSettingsData>({ path: BASE_PATH, noToast: true });
      return json.id ? json : null;
    },
    // keeps the status card current
    refetchInterval: 10_000,
  });
  const data = settings.data;

  // only fill the form once (and after a save), so the status refresh doesn't wipe typing
  const loadedId = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (!data || loadedId.current === data.id) return;
    loadedId.current = data.id;
    setForm({
      enabled: data.enabled,
      serverKey: "",
      apiKey: "",
      pollSeconds: String(data.pollSeconds),
      create911Calls: data.create911Calls,
      teamMap: data.teamMap,
    });
  }, [data]);

  function update(patch: Partial<NonNullable<typeof form>>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function addTeam() {
    const team = newTeam.trim();
    if (!team || !/^[\w &/-]+$/.test(team) || !form || form.teamMap[team]) return;
    update({ teamMap: { ...form.teamMap, [team]: "CALL_911_LEO" } });
    setNewTeam("");
  }

  function saved(json: ErlcSettingsData) {
    if (!json.id) return;
    queryClient.setQueryData(QUERY_KEY, json);
    setForm((prev) => (prev ? { ...prev, serverKey: "", apiKey: "" } : prev));
  }

  async function handleSave() {
    if (!form) return;
    const pollSeconds = Math.min(300, Math.max(10, Number(form.pollSeconds) || 15));
    const { json } = await execute<ErlcSettingsData>({
      path: BASE_PATH,
      method: "PUT",
      data: {
        enabled: form.enabled,
        // an empty field keeps the stored key
        serverKey: form.serverKey.trim() ? form.serverKey.trim() : undefined,
        apiKey: form.apiKey.trim() ? form.apiKey.trim() : undefined,
        pollSeconds,
        create911Calls: form.create911Calls,
        teamMap: form.teamMap,
      },
    });
    update({ pollSeconds: String(pollSeconds) });
    saved(json);
  }

  async function handleRemoveApiKey() {
    const { json } = await execute<ErlcSettingsData>({
      path: BASE_PATH,
      method: "PUT",
      data: { apiKey: null },
    });
    saved(json);
  }

  async function handleResume() {
    const { json } = await execute<ErlcSettingsData>({
      path: `${BASE_PATH}/resume`,
      method: "POST",
    });
    saved(json);
  }

  async function handleTest() {
    setIsTesting(true);
    setTestResult(null);
    const { json } = await execute<TestResult>({
      path: `${BASE_PATH}/test`,
      method: "POST",
      noToast: true,
    });
    setIsTesting(false);
    if (typeof json === "object" && "result" in json) setTestResult(json);
  }

  async function copy(text: string) {
    try {
      // the Clipboard API is only available in secure contexts (HTTPS/localhost)
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        return;
      }
    } catch {
      // fall back below
    }
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      setCopied(true);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  const webhookUrl = `${getAPIUrl()}/integrations/erlc/webhook`;
  const isHttps = webhookUrl.startsWith("https://");
  const targetOptions = TARGETS.map((target) => ({ value: target, label: t(`target_${target}`) }));
  const status = data?.status;

  return (
    <TabsContent value={SettingsTabs.Erlc} className="mt-3">
      <header className="mb-4">
        <SettingsTabHeader icon={<Controller size={16} />}>{t("erlc")}</SettingsTabHeader>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("intro")}</p>
      </header>

      {ERLC ? null : (
        <Alert className="mb-4" type="warning" title={t("featureOffTitle")}>
          <p>{t("featureOffMessage")}</p>
        </Alert>
      )}

      {settings.isPending ? <Loader /> : null}

      {data && form ? (
        <>
          {status ? (
            <section className="card p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-lg">{t("status")}</h3>
                <StatusBadge state={status.state} label={t(`state_${status.state}`)} />
              </div>
              <p className="mt-1 text-sm text-neutral-600 dark:text-gray-400">
                {t(`state_${status.state}Details`)}
              </p>
              <dl className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-neutral-500 dark:text-gray-400">{t("lastCheck")}</dt>
                  <dd>{formatTime(status.lastPollAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-gray-400">{t("lastSuccess")}</dt>
                  <dd>{formatTime(status.lastSuccessAt)}</dd>
                </div>
                <div>
                  <dt className="text-neutral-500 dark:text-gray-400">{t("nextCheck")}</dt>
                  <dd>{formatTime(status.nextPollAt)}</dd>
                </div>
              </dl>
              {status.lastError ? (
                <p className="mt-3 text-sm text-red-700 dark:text-red-400">
                  {t("lastError")}: {status.lastError.message}
                  {status.lastError.code !== null ? ` (${status.lastError.code})` : ""}
                </p>
              ) : null}
              {data.pausedReason ? (
                <Button className="mt-3" size="xs" onPress={handleResume}>
                  {t("resume")}
                </Button>
              ) : null}
              {status.state === "online" ? (
                <p className="mt-3 text-sm">
                  <Link
                    className="underline text-blue-600 dark:text-blue-400"
                    href="/dispatch/erlc"
                  >
                    {t("openDispatchPage")}
                  </Link>
                </p>
              ) : null}
            </section>
          ) : null}

          <section className="card p-4 mb-6">
            <SwitchField
              isSelected={form.enabled}
              onChange={(enabled) => update({ enabled })}
              description={t("enabledDescription")}
            >
              {t("enabled")}
            </SwitchField>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("serverKeyTitle")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">
              {t("serverKeyIntro")}
            </p>
            <TextField
              type="password"
              autoComplete="off"
              label={t("serverKey")}
              value={form.serverKey}
              onChange={(serverKey) => update({ serverKey })}
              placeholder={data.serverKeySet ? t("keySetPlaceholder") : t("serverKeyPlaceholder")}
              description={data.serverKeySet ? t("keySet") : t("keyNotSet")}
              maxLength={512}
            />
            <TextField
              type="password"
              autoComplete="off"
              label={t("apiKey")}
              value={form.apiKey}
              onChange={(apiKey) => update({ apiKey })}
              placeholder={data.apiKeySet ? t("keySetPlaceholder") : t("apiKeyPlaceholder")}
              description={t("apiKeyDescription")}
              maxLength={512}
            />
            <TextField
              type="number"
              label={t("pollSeconds")}
              value={form.pollSeconds}
              onChange={(pollSeconds) => update({ pollSeconds })}
              description={t("pollSecondsDescription")}
              className="w-full md:w-60"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                className="flex items-center gap-2"
                isDisabled={isTesting || !data.serverKeySet}
                onPress={handleTest}
              >
                {isTesting ? <Loader /> : null}
                {t("testConnection")}
              </Button>
              {data.apiKeySet ? (
                <Button variant="danger" size="xs" onPress={handleRemoveApiKey}>
                  {t("removeApiKey")}
                </Button>
              ) : null}
            </div>
            {testResult ? (
              <Alert
                className="mt-3"
                type={testResult.result === "ok" ? "success" : "error"}
                title={t(`test_${testResult.result}`)}
              >
                <p>
                  {testResult.result === "ok"
                    ? t("test_okDetails", {
                        name: testResult.name ?? "?",
                        players: testResult.players ?? 0,
                        maxPlayers: testResult.maxPlayers ?? "?",
                      })
                    : testResult.result === "rateLimited"
                      ? t("test_rateLimitedDetails", { seconds: testResult.retryInSeconds })
                      : testResult.result === "error" || testResult.result === "unreachable"
                        ? t(`test_${testResult.result}Details`, {
                            message: testResult.message ?? "",
                          })
                        : t(`test_${testResult.result}Details`)}
                </p>
              </Alert>
            ) : null}
            <p className="mt-3 text-sm text-neutral-600 dark:text-gray-400">{t("saveFirstHint")}</p>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("teams")}</h3>
            <SwitchField
              isSelected={form.create911Calls}
              onChange={(create911Calls) => update({ create911Calls })}
              description={t("create911CallsDescription")}
            >
              {t("create911Calls")}
            </SwitchField>
            <p className="text-sm text-neutral-600 dark:text-gray-400 my-3">{t("teamsIntro")}</p>
            <div className="grid gap-2">
              {Object.entries(form.teamMap).map(([team, target]) => (
                <div key={team} className="grid gap-x-3 md:grid-cols-[10rem_1fr] items-end">
                  <p className="font-medium pb-3">{team}</p>
                  <SelectField
                    label={t("creates")}
                    selectedKey={target}
                    onSelectionChange={(key) =>
                      update({ teamMap: { ...form.teamMap, [team]: key as Target } })
                    }
                    options={targetOptions}
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <TextField
                label={t("addTeam")}
                value={newTeam}
                onChange={setNewTeam}
                placeholder="Jail"
                maxLength={64}
                className="w-full md:w-72"
              />
              <Button className="mb-3" onPress={addTeam} isDisabled={!newTeam.trim()}>
                {t("add")}
              </Button>
            </div>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("webhook")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">{t("webhookIntro")}</p>
            <p className="text-sm font-medium mb-1">{t("webhookUrl")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="block flex-1 min-w-0 break-all rounded-md bg-gray-100 dark:bg-secondary px-2 py-1.5 text-sm">
                {webhookUrl}
              </code>
              <Button size="xs" onPress={() => void copy(webhookUrl)}>
                {copied ? t("copied") : t("copy")}
              </Button>
            </div>
            {isHttps ? null : (
              <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                {t("webhookNeedsHttps")}
              </p>
            )}
            <ol className="list-decimal ml-5 mt-3 text-sm grid gap-1">
              <li>{t("webhookStep1")}</li>
              <li>{t("webhookStep2")}</li>
            </ol>
          </section>

          <footer className="flex justify-end">
            <Button
              className="flex items-center gap-2"
              isDisabled={state === "loading"}
              onPress={handleSave}
            >
              {state === "loading" ? <Loader /> : null}
              {common("save")}
            </Button>
          </footer>
        </>
      ) : null}
    </TabsContent>
  );
}

export function StatusBadge(props: { state: ErlcState; label: string }) {
  const color =
    props.state === "online"
      ? "bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300"
      : props.state === "error" || props.state === "paused"
        ? "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300"
        : props.state === "offline" || props.state === "rateLimited"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-gray-100 dark:bg-quaternary";

  return (
    <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${color}`}>{props.label}</span>
  );
}
