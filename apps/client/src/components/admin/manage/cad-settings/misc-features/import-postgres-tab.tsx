import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import Link from "next/link";
import { Rank } from "@snailycad/types";
import { Alert, Button, Loader, SelectField, SwitchField, TextField } from "@snailycad/ui";
import { getAPIUrl } from "@snailycad/utils/api-url";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { useAuth } from "context/AuthContext";
import useFetch from "lib/useFetch";

type SourceType = "env" | "fields" | "url";
type Mode = "values" | "replace";

interface CheckResult {
  postgresVersion: string;
  users: number;
  rows: number;
  tables: number;
  duplicateUsernames: string[];
  existingValues: number;
  encryptionToken: "matches" | "different" | "unknown";
  problems: string[];
  canImport: boolean;
}

interface ImportJob {
  state: "idle" | "running" | "done" | "failed";
  mode: Mode | null;
  lines: string[];
  error: string | null;
  needsRestart: boolean;
}

/** error keys the API returns; anything else is shown as-is (e.g. a psql connection error) */
const KNOWN_ERRORS = [
  "psqlNotInstalled",
  "envPathMustBeAbsoluteDotEnv",
  "envFileNotFound",
  "envFileHasNoPostgresDatabase",
  "databaseUrlNotMysql",
  "migrateScriptMissing",
  "onlyOwnerCanImport",
  "importAlreadyRunning",
  "typeReplaceToConfirm",
  "valuesNotEmpty",
];

/**
 * Admin > CAD Settings > Import from PostgreSQL: copy a PostgreSQL SnailyCAD into this MySQL /
 * MariaDB CAD, either just its values or everything (replacing this CAD's data).
 */
export function ImportPostgresTab() {
  const t = useTranslations("ImportPostgres");
  const { user } = useAuth();
  const { execute, state } = useFetch();

  const [sourceType, setSourceType] = React.useState<SourceType>("env");
  const [envPath, setEnvPath] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [fields, setFields] = React.useState({
    host: "localhost",
    port: "5432",
    user: "",
    password: "",
    database: "",
  });
  const [mode, setMode] = React.useState<Mode>("values");
  const [check, setCheck] = React.useState<CheckResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmation, setConfirmation] = React.useState("");
  const [copyToken, setCopyToken] = React.useState(true);
  const [job, setJob] = React.useState<ImportJob | null>(null);
  const [signedOut, setSignedOut] = React.useState(false);

  const isOwner = user?.rank === Rank.OWNER;
  const isRunning = job?.state === "running";

  function getSource() {
    if (sourceType === "env") return { type: "env", path: envPath.trim() };
    if (sourceType === "url") return { type: "url", url: url.trim() };
    return { type: "fields", ...fields, port: Number(fields.port) || 5432 };
  }

  function translateError(message: string | null) {
    if (!message) return null;
    return KNOWN_ERRORS.includes(message) ? t(`error_${message}`) : message;
  }

  // settings changed: the previous check no longer applies
  React.useEffect(() => {
    setCheck(null);
    setError(null);
  }, [sourceType, envPath, url, fields, mode]);

  const pollStatus = React.useCallback(async () => {
    try {
      const response = await fetch(`${getAPIUrl()}/admin/import-postgres/status`, {
        credentials: "include",
      });
      // a full import replaces the accounts and sessions, so this session ends when it succeeds
      if (response.status === 401) {
        setSignedOut(true);
        return false;
      }
      const data = (await response.json()) as ImportJob;
      setJob(data);
      return data.state === "running";
    } catch {
      return true;
    }
  }, []);

  React.useEffect(() => {
    if (!isOwner) return;
    void pollStatus();
  }, [isOwner, pollStatus]);

  React.useEffect(() => {
    if (!isRunning) return;
    const interval = window.setInterval(async () => {
      const keepPolling = await pollStatus();
      if (!keepPolling) window.clearInterval(interval);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [isRunning, pollStatus]);

  async function handleCheck() {
    setError(null);
    setCheck(null);
    const { json, error } = await execute<CheckResult>({
      path: "/admin/import-postgres/check",
      method: "POST",
      data: { source: getSource(), mode },
      noToast: true,
    });

    if (error) setError(translateError(error));
    else if (json && "canImport" in json) setCheck(json);
  }

  async function handleStart() {
    setError(null);
    const { json, error } = await execute<{ started: boolean }>({
      path: "/admin/import-postgres/start",
      method: "POST",
      data: {
        source: getSource(),
        mode,
        confirmation,
        copyEncryptionToken:
          mode === "replace" && check?.encryptionToken === "different" && copyToken,
      },
      noToast: true,
    });

    if (error) {
      setError(translateError(error));
    } else if (json?.started) {
      setConfirmation("");
      setJob({ state: "running", mode, lines: [], error: null, needsRestart: false });
    }
  }

  const canStart =
    check?.canImport &&
    !isRunning &&
    state !== "loading" &&
    (mode === "values" || confirmation === "REPLACE");

  return (
    <TabsContent value={SettingsTabs.ImportPostgres} className="mt-3">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("intro")}</p>
      </header>

      {!isOwner ? (
        <Alert type="warning" title={t("ownerOnlyTitle")} message={t("ownerOnlyMessage")} />
      ) : signedOut ? (
        <Alert type="success" title={t("replacedTitle")}>
          <p>{t("replacedMessage")}</p>
          <Link href="/auth/login" className="underline font-medium mt-2 inline-block">
            {t("signIn")}
          </Link>
        </Alert>
      ) : (
        <>
          <section className="card p-4 mb-4">
            <h3 className="font-semibold text-lg mb-2">{t("source")}</h3>

            <SelectField
              label={t("connectWith")}
              selectedKey={sourceType}
              onSelectionChange={(value) => setSourceType((value as SourceType) ?? "env")}
              options={[
                { value: "env", label: t("sourceEnv") },
                { value: "fields", label: t("sourceFields") },
                { value: "url", label: t("sourceUrl") },
              ]}
            />

            {sourceType === "env" ? (
              <>
                <TextField
                  label={t("envPath")}
                  value={envPath}
                  onChange={setEnvPath}
                  placeholder="/home/user/snaily-cadv4/.env"
                />
                <p className="-mt-2 mb-3 text-sm text-neutral-600 dark:text-gray-400">
                  {t("envPathDescription")}
                </p>
              </>
            ) : sourceType === "url" ? (
              <TextField
                label={t("databaseUrl")}
                value={url}
                onChange={setUrl}
                placeholder="postgresql://user:password@localhost:5432/snaily-cad-v4"
              />
            ) : (
              <div className="grid gap-x-3 md:grid-cols-2">
                <TextField
                  label={t("host")}
                  value={fields.host}
                  onChange={(host) => setFields((prev) => ({ ...prev, host }))}
                />
                <TextField
                  label={t("port")}
                  value={fields.port}
                  onChange={(port) => setFields((prev) => ({ ...prev, port }))}
                />
                <TextField
                  label={t("user")}
                  value={fields.user}
                  onChange={(value) => setFields((prev) => ({ ...prev, user: value }))}
                />
                <TextField
                  label={t("password")}
                  type="password"
                  value={fields.password}
                  onChange={(password) => setFields((prev) => ({ ...prev, password }))}
                />
                <TextField
                  label={t("database")}
                  value={fields.database}
                  onChange={(database) => setFields((prev) => ({ ...prev, database }))}
                />
              </div>
            )}

            <SelectField
              label={t("whatToImport")}
              selectedKey={mode}
              onSelectionChange={(value) => setMode((value as Mode) ?? "values")}
              options={[
                { value: "values", label: t("modeValues") },
                { value: "replace", label: t("modeReplace") },
              ]}
            />
            <p className="-mt-2 mb-3 text-sm text-neutral-600 dark:text-gray-400">
              {mode === "values" ? t("modeValuesDescription") : t("modeReplaceDescription")}
            </p>

            <footer className="flex justify-end">
              <Button
                className="flex items-center gap-2"
                onPress={handleCheck}
                isDisabled={state === "loading" || isRunning}
              >
                {state === "loading" && !check ? <Loader /> : null}
                {t("check")}
              </Button>
            </footer>
          </section>

          {error ? (
            <Alert className="mb-4" type="error" title={t("errorTitle")} message={error} />
          ) : null}

          {check ? (
            <section className="card p-4 mb-4">
              <h3 className="font-semibold text-lg mb-2">{t("checkResult")}</h3>
              <ul className="text-sm flex flex-col gap-1 mb-3">
                <li>{t("postgresVersion", { version: check.postgresVersion })}</li>
                <li>{t("usersFound", { count: check.users })}</li>
                <li>{t("rowsToCopy", { rows: check.rows, tables: check.tables })}</li>
                {mode === "replace" ? (
                  <li>{t(`encryptionToken_${check.encryptionToken}`)}</li>
                ) : null}
              </ul>

              {check.problems.includes("duplicateUsernames") ? (
                <Alert className="mb-3" type="error" title={t("duplicateUsernamesTitle")}>
                  <p>{t("duplicateUsernamesMessage")}</p>
                  <ul className="list-disc pl-5 mt-1">
                    {check.duplicateUsernames.map((names) => (
                      <li key={names}>{names}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}

              {check.problems.includes("valuesNotEmpty") ? (
                <Alert
                  className="mb-3"
                  type="error"
                  title={t("valuesNotEmptyTitle")}
                  message={t("valuesNotEmptyMessage", { count: check.existingValues })}
                />
              ) : null}

              {check.canImport && mode === "replace" ? (
                <>
                  <Alert
                    className="mb-3"
                    type="warning"
                    title={t("replaceWarningTitle")}
                    message={t("replaceWarningMessage")}
                  />
                  {check.encryptionToken === "different" ? (
                    <SwitchField isSelected={copyToken} onChange={setCopyToken}>
                      {t("copyEncryptionToken")}
                    </SwitchField>
                  ) : null}
                  <TextField
                    className="mt-3"
                    label={t("typeReplace")}
                    value={confirmation}
                    onChange={setConfirmation}
                    placeholder="REPLACE"
                  />
                </>
              ) : null}

              {check.canImport ? (
                <footer className="flex justify-end">
                  <Button
                    variant={mode === "replace" ? "danger" : "blue"}
                    onPress={handleStart}
                    isDisabled={!canStart}
                  >
                    {mode === "replace" ? t("startReplace") : t("startValues")}
                  </Button>
                </footer>
              ) : null}
            </section>
          ) : null}

          {job && job.state !== "idle" ? (
            <section className="card p-4">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                {job.state === "running" ? <Loader /> : null}
                {t(`state_${job.state}`)}
              </h3>
              {job.state === "done" && job.mode === "values" ? (
                <p className="mb-2 text-sm">{t("valuesDone")}</p>
              ) : null}
              {job.needsRestart ? <p className="mb-2 text-sm">{t("restarting")}</p> : null}
              {job.error ? (
                <Alert className="mb-2" type="error" title={t("errorTitle")} message={job.error} />
              ) : null}
              <pre className="rounded-lg bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary px-3 py-2 text-sm max-h-72 overflow-auto thin-scrollbar">
                {job.lines.join("\n") || "…"}
              </pre>
            </section>
          ) : null}
        </>
      )}
    </TabsContent>
  );
}
