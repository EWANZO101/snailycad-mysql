import * as React from "react";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Loader, SelectField, SwitchField, TextField } from "@snailycad/ui";
import { getAPIUrl } from "@snailycad/utils/api-url";
import useFetch from "lib/useFetch";

type Target = "CALL_911_LEO" | "CALL_911_EMS_FD" | "TOW" | "TAXI" | "IGNORE";
type ServiceMap = Record<string, { target: Target; number: string }>;

interface OpsPhoneSettingsData {
  id: string;
  enabled: boolean;
  apiUrl: string | null;
  apiKeySet: boolean;
  webhookSecret: string;
  sendSms: boolean;
  serviceMap: ServiceMap;
}

type TestResult =
  | { result: "ok"; status: number; resource: string | null; version: string | null }
  | { result: "unauthorized" | "apiDisabled" | "error"; status: number }
  | { result: "unreachable"; error: string }
  | { result: "notConfigured" | "noKey" };

const TARGETS: Target[] = ["CALL_911_LEO", "CALL_911_EMS_FD", "TOW", "TAXI", "IGNORE"];
const QUERY_KEY = ["admin", "ops-phone"];
const BASE_PATH = "/admin/manage/cad-settings/ops-phone";

/** ops-phone (OpsLab Systems FiveM phone): Services app requests become CAD calls */
/** OPS Phone's settings, shown in CAD Settings > Integrations > Phones under OPS Phone */
export function OpsPhoneSettings() {
  const t = useTranslations("OpsPhone");
  const common = useTranslations("Common");
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();

  const [form, setForm] = React.useState<{
    enabled: boolean;
    apiUrl: string;
    apiKey: string;
    sendSms: boolean;
    serviceMap: ServiceMap;
  } | null>(null);
  const [newService, setNewService] = React.useState("");
  const [testResult, setTestResult] = React.useState<TestResult | null>(null);
  const [isTesting, setIsTesting] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  const settings = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { json } = await execute<OpsPhoneSettingsData>({ path: BASE_PATH, noToast: true });
      return json.id ? json : null;
    },
  });

  const data = settings.data;

  React.useEffect(() => {
    if (!data) return;
    setForm({
      enabled: data.enabled,
      apiUrl: data.apiUrl ?? "",
      apiKey: "",
      sendSms: data.sendSms,
      serviceMap: data.serviceMap,
    });
  }, [data]);

  function update(patch: Partial<NonNullable<typeof form>>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  function updateService(id: string, patch: Partial<ServiceMap[string]>) {
    if (!form) return;
    const current = form.serviceMap[id] ?? { target: "IGNORE" as Target, number: "" };
    update({ serviceMap: { ...form.serviceMap, [id]: { ...current, ...patch } } });
  }

  function addService() {
    const id = newService.trim();
    if (!id || !/^[\w-]+$/.test(id) || !form || form.serviceMap[id]) return;
    updateService(id, { target: "IGNORE", number: "" });
    setNewService("");
  }

  async function handleSave() {
    if (!form) return;
    const { json } = await execute<OpsPhoneSettingsData>({
      path: BASE_PATH,
      method: "PUT",
      data: {
        enabled: form.enabled,
        apiUrl: form.apiUrl.trim() || null,
        // an empty field keeps the stored key
        apiKey: form.apiKey.trim() ? form.apiKey.trim() : undefined,
        sendSms: form.sendSms,
        serviceMap: form.serviceMap,
      },
    });
    if (json.id) {
      queryClient.setQueryData(QUERY_KEY, json);
    }
  }

  async function handleRemoveKey() {
    const { json } = await execute<OpsPhoneSettingsData>({
      path: BASE_PATH,
      method: "PUT",
      data: { apiKey: null },
    });
    if (json.id) queryClient.setQueryData(QUERY_KEY, json);
  }

  async function handleRegenerate() {
    if (!window.confirm(t("regenerateConfirm"))) return;
    const { json } = await execute<OpsPhoneSettingsData>({
      path: `${BASE_PATH}/regenerate-secret`,
      method: "POST",
    });
    if (json.id) queryClient.setQueryData(QUERY_KEY, json);
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

  async function copy(key: string, text: string) {
    try {
      // the Clipboard API is only available in secure contexts (HTTPS/localhost)
      if (window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        setCopied(key);
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
      setCopied(key);
    } finally {
      document.body.removeChild(textarea);
    }
  }

  const webhookUrl = `${getAPIUrl()}/integrations/ops-phone/webhook`;
  const serverCfgLine = data ? `set opslabs_phone_webhook_secret "${data.webhookSecret}"` : "";
  const apiConfigLine = `'${webhookUrl}',`;
  const targetOptions = TARGETS.map((target) => ({ value: target, label: t(`target_${target}`) }));

  return (
    <div>
      <p className="mb-4 text-sm text-neutral-600 dark:text-gray-400">{t("intro")}</p>

      {settings.isPending ? <Loader /> : null}

      {data && form ? (
        <>
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
            <h3 className="font-semibold text-lg mb-2">{t("phoneApi")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">{t("phoneApiIntro")}</p>
            <TextField
              label={t("apiUrl")}
              value={form.apiUrl}
              onChange={(apiUrl) => update({ apiUrl })}
              placeholder="http://127.0.0.1:30120/opslabs-phone/api/v1"
              maxLength={512}
            />
            <TextField
              type="password"
              autoComplete="off"
              label={t("apiKey")}
              value={form.apiKey}
              onChange={(apiKey) => update({ apiKey })}
              placeholder={data.apiKeySet ? t("apiKeySetPlaceholder") : t("apiKeyPlaceholder")}
              description={data.apiKeySet ? t("apiKeySet") : t("apiKeyNotSet")}
              maxLength={512}
            />
            <div className="flex flex-wrap gap-2 items-center">
              <Button
                className="flex items-center gap-2"
                isDisabled={isTesting}
                onPress={handleTest}
              >
                {isTesting ? <Loader /> : null}
                {t("testConnection")}
              </Button>
              {data.apiKeySet ? (
                <Button variant="danger" size="xs" onPress={handleRemoveKey}>
                  {t("removeKey")}
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
                        resource: testResult.resource ?? "opslabs-phone",
                        version: testResult.version ?? "?",
                      })
                    : testResult.result === "unreachable"
                      ? t("test_unreachableDetails", { error: testResult.error })
                      : t(`test_${testResult.result}Details`)}
                </p>
              </Alert>
            ) : null}
            <p className="mt-3 text-sm text-neutral-600 dark:text-gray-400">{t("saveFirstHint")}</p>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("webhook")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">{t("webhookIntro")}</p>

            <CopyRow
              label={t("webhookUrl")}
              value={webhookUrl}
              copyLabel={copied === "url" ? t("copied") : t("copy")}
              onCopy={() => void copy("url", webhookUrl)}
            />
            <CopyRow
              label={t("webhookSecret")}
              value={data.webhookSecret}
              copyLabel={copied === "secret" ? t("copied") : t("copy")}
              onCopy={() => void copy("secret", data.webhookSecret)}
              extra={
                <Button size="xs" variant="danger" onPress={handleRegenerate}>
                  {t("regenerate")}
                </Button>
              }
            />

            <h4 className="font-semibold mt-4 mb-1">{t("serverOwnerSteps")}</h4>
            <ol className="list-decimal ml-5 text-sm grid gap-3">
              <li>
                <p>{t("stepServerCfg")}</p>
                <CopyRow
                  value={serverCfgLine}
                  copyLabel={copied === "cfg" ? t("copied") : t("copy")}
                  onCopy={() => void copy("cfg", serverCfgLine)}
                />
              </li>
              <li>
                <p>{t("stepApiConfig")}</p>
                <CopyRow
                  value={apiConfigLine}
                  copyLabel={copied === "apiConfig" ? t("copied") : t("copy")}
                  onCopy={() => void copy("apiConfig", apiConfigLine)}
                />
              </li>
              <li>
                <p>{t("stepApiKey")}</p>
              </li>
              <li>
                <p>{t("stepRestart")}</p>
              </li>
            </ol>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("services")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">{t("servicesIntro")}</p>
            <div className="grid gap-2">
              {Object.entries(form.serviceMap).map(([id, entry]) => (
                <div key={id} className="grid gap-x-3 md:grid-cols-[10rem_1fr_10rem] items-end">
                  <p className="font-mono pb-3">{id}</p>
                  <SelectField
                    label={t("sendTo")}
                    selectedKey={entry.target}
                    onSelectionChange={(key) => updateService(id, { target: key as Target })}
                    options={targetOptions}
                  />
                  <TextField
                    label={t("serviceNumber")}
                    value={entry.number}
                    onChange={(number) => updateService(id, { number })}
                    maxLength={32}
                    placeholder="911"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 items-end">
              <TextField
                label={t("addService")}
                value={newService}
                onChange={setNewService}
                placeholder="towing"
                maxLength={64}
                className="w-full md:w-72"
              />
              <Button className="mb-3" onPress={addService} isDisabled={!newService.trim()}>
                {t("add")}
              </Button>
            </div>

            <SwitchField
              isSelected={form.sendSms}
              onChange={(sendSms) => update({ sendSms })}
              description={t("sendSmsDescription")}
            >
              {t("sendSms")}
            </SwitchField>
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
    </div>
  );
}

function CopyRow(props: {
  label?: string;
  value: string;
  copyLabel: string;
  onCopy(): void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="mb-3">
      {props.label ? <p className="text-sm font-medium mb-1">{props.label}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <code className="block flex-1 min-w-0 break-all rounded-md bg-gray-100 dark:bg-secondary px-2 py-1.5 text-sm">
          {props.value}
        </code>
        <Button size="xs" onPress={props.onCopy}>
          {props.copyLabel}
        </Button>
        {props.extra}
      </div>
    </div>
  );
}
