import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import Link from "next/link";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Loader, SelectField, TextField } from "@snailycad/ui";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import useFetch from "lib/useFetch";
import { classNames } from "lib/classNames";
import { toastMessage } from "lib/toastMessage";

export interface LocaleFolderInfo {
  name: string;
  files: string[];
}

interface Props {
  localeFolders: LocaleFolderInfo[];
}

interface LocaleInfo {
  code: string;
  hasFolder: boolean;
  isRegistered: boolean;
  isDefault: boolean;
  isBuiltIn: boolean;
  fileCount: number;
  totalFiles: number;
  missingFiles: string[];
}

interface LocalesData {
  locales: LocaleInfo[];
  defaultLocale: string;
  rebuildPending: boolean;
  canRebuild: boolean;
  readOnly: boolean;
  manualRebuildCommands: string[];
}

const DOCS_URL =
  "https://docs.snailycad.org/docs/guides/product/how-to-translate#adding-a-new-custom-locale";
const LOCALE_CODE_REGEX = /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/;
const QUERY_KEY = ["admin", "locales"];

function languageName(code: string) {
  try {
    const names = new Intl.DisplayNames(["en"], { type: "language" });
    return names.of(code === "cn" ? "zh-Hans" : code === "tc" ? "zh-Hant" : code) ?? code;
  } catch {
    return code;
  }
}

/**
 * manage the CAD's languages without touching the server: add a language (copied from an existing
 * one), fill in missing files, set the default, remove custom languages and rebuild.
 */
export function CustomLocalesTab(_props: Props) {
  const t = useTranslations("CustomLocales");
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();

  const [code, setCode] = React.useState("");
  const [copyFrom, setCopyFrom] = React.useState("en");
  const [isRestarting, setIsRestarting] = React.useState(false);

  const { data, isPending, error } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { json, error } = await execute<LocalesData>({
        path: "/admin/manage/locales",
        noToast: true,
      });
      if (error || !json) throw new Error(String(error ?? "unable to load locales"));
      return json;
    },
  });

  function setData(json: LocalesData | null | undefined) {
    if (json && "locales" in json) queryClient.setQueryData(QUERY_KEY, json);
  }

  const trimmedCode = code.trim();
  const isCodeValid = LOCALE_CODE_REGEX.test(trimmedCode);
  const codeExists = data?.locales.some((locale) => locale.code === trimmedCode) ?? false;

  async function handleAdd() {
    if (!isCodeValid || codeExists) return;
    const { json } = await execute<LocalesData>({
      path: "/admin/manage/locales",
      method: "POST",
      data: { code: trimmedCode, copyFrom },
    });

    if (json?.locales) {
      setData(json);
      setCode("");
      toastMessage({
        icon: "success",
        title: t("languageAdded"),
        message: t("languageAddedMessage", { code: trimmedCode }),
      });
    }
  }

  async function handleFillMissing(locale: string) {
    const { json } = await execute<LocalesData>({
      path: `/admin/manage/locales/${locale}/fill-missing`,
      method: "POST",
    });
    setData(json);
  }

  async function handleSetDefault(locale: string) {
    const { json } = await execute<LocalesData>({
      path: "/admin/manage/locales/default",
      method: "PUT",
      data: { code: locale },
    });
    setData(json);
  }

  async function handleRemove(locale: string) {
    if (!window.confirm(t("confirmRemove", { code: locale }))) return;
    const { json } = await execute<LocalesData>({
      path: `/admin/manage/locales/${locale}`,
      method: "DELETE",
    });
    setData(json);
  }

  async function handleRebuild() {
    if (!window.confirm(t("confirmRebuild"))) return;
    const { json } = await execute<{ restarting: boolean }>({
      path: "/admin/manage/locales/rebuild",
      method: "POST",
    });

    if (json?.restarting) {
      setIsRestarting(true);
    }
  }

  const isLoading = state === "loading";

  return (
    <TabsContent value={SettingsTabs.CustomLocales} className="mt-3">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">{t("customLocales")}</h2>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("customLocalesIntro")}</p>
      </header>

      {isRestarting ? (
        <Alert className="mb-4" type="success" title={t("rebuildStartedTitle")}>
          <p>{t("rebuildStartedMessage")}</p>
        </Alert>
      ) : data?.rebuildPending ? (
        <div className="card mb-4 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between !border-amber-400/60">
          <div>
            <p className="font-semibold">{t("rebuildNeededTitle")}</p>
            <p className="text-sm text-neutral-600 dark:text-gray-400">
              {t("rebuildNeededMessage")}
            </p>
            {data.canRebuild ? null : (
              <>
                <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
                  {t("rebuildManuallyMessage")}
                </p>
                <pre className="mt-2 rounded-lg bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary px-3 py-2 text-sm overflow-x-auto thin-scrollbar">
                  {data.manualRebuildCommands.join("\n")}
                </pre>
              </>
            )}
          </div>
          {data.canRebuild ? (
            <Button variant="amber" onPress={handleRebuild} disabled={isLoading}>
              {t("applyAndRebuild")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {data?.readOnly ? (
        <section className="card p-4 mb-6">
          <h3 className="font-semibold text-lg">{t("dockerReadOnlyTitle")}</h3>
          <p className="text-sm text-neutral-600 dark:text-gray-400">
            {t("dockerReadOnlyMessage")}
          </p>
          <pre className="mt-2 rounded-lg bg-gray-100 dark:bg-primary border border-gray-200 dark:border-quaternary px-3 py-2 text-sm overflow-x-auto thin-scrollbar">
            {data.manualRebuildCommands.join("\n")}
          </pre>
        </section>
      ) : (
        <section className="card p-4 mb-6">
          <h3 className="font-semibold text-lg">{t("addLanguage")}</h3>
          <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">
            {t("addLanguageDescription")}
          </p>

          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <TextField
              className="w-full md:max-w-xs"
              label={t("languageCode")}
              errorMessage={
                trimmedCode && !isCodeValid
                  ? t("invalidCode")
                  : codeExists
                    ? t("alreadyExists")
                    : undefined
              }
              value={code}
              onChange={setCode}
              placeholder="es-ES"
            />

            <SelectField
              className="w-full md:max-w-xs"
              label={t("copyFrom")}
              selectedKey={copyFrom}
              onSelectionChange={(value) => setCopyFrom((value as string | null) ?? "en")}
              options={(data?.locales ?? [])
                .filter((locale) => locale.hasFolder)
                .map((locale) => ({
                  value: locale.code,
                  label: `${languageName(locale.code)} (${locale.code})`,
                }))}
            />

            <Button
              variant="blue"
              className="flex items-center gap-2 md:mb-0.5 w-fit"
              onPress={handleAdd}
              disabled={!isCodeValid || codeExists || isLoading}
            >
              {isLoading ? <Loader /> : null}
              {t("addLanguage")}
            </Button>
          </div>

          <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
            {trimmedCode && isCodeValid
              ? t("willBeAddedAs", { name: languageName(trimmedCode) })
              : t("languageCodeExample")}
          </p>
        </section>
      )}

      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
        {t("availableLocales")}
      </h3>

      {isPending ? (
        <div className="grid place-content-center h-32">
          <Loader className="w-6 h-6" />
        </div>
      ) : error || !data ? (
        <Alert type="error" title={t("loadFailed")} message={String(error?.message ?? "")} />
      ) : (
        <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
          {data.locales.map((locale) => {
            const isComplete = locale.missingFiles.length <= 0;

            return (
              <article key={locale.code} className="card p-4 flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold">
                      {languageName(locale.code)}{" "}
                      <span className="font-mono text-sm text-neutral-500 dark:text-gray-400">
                        {locale.code}
                      </span>
                    </h4>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {locale.isDefault ? <Badge tone="blue">{t("default")}</Badge> : null}
                      {locale.isBuiltIn ? null : <Badge tone="gray">{t("custom")}</Badge>}
                      {locale.isRegistered ? null : (
                        <Badge tone="amber">{t("notRegistered")}</Badge>
                      )}
                      <Badge tone={isComplete ? "green" : "amber"}>
                        {t("filesCount", { count: locale.fileCount, total: locale.totalFiles })}
                      </Badge>
                    </div>
                  </div>
                </div>

                {isComplete ? null : (
                  <p className="text-sm text-neutral-600 dark:text-gray-400">
                    {t("missingFiles")}: {locale.missingFiles.join(", ")}
                  </p>
                )}

                {data.readOnly ? null : (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {isComplete ? null : (
                      <Button
                        size="xs"
                        onPress={() => handleFillMissing(locale.code)}
                        disabled={isLoading}
                      >
                        {t("fillMissing")}
                      </Button>
                    )}
                    {locale.isDefault || !locale.isRegistered ? null : (
                      <Button
                        size="xs"
                        onPress={() => handleSetDefault(locale.code)}
                        disabled={isLoading}
                      >
                        {t("makeDefault")}
                      </Button>
                    )}
                    {locale.isBuiltIn || locale.isDefault ? null : (
                      <Button
                        size="xs"
                        variant="danger"
                        onPress={() => handleRemove(locale.code)}
                        disabled={isLoading}
                      >
                        {t("remove")}
                      </Button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-6 text-sm text-neutral-600 dark:text-gray-400">
        {t("translateHint")}{" "}
        <Link
          href={DOCS_URL}
          target="_blank"
          className="underline inline-flex items-center gap-1 text-blue-600 dark:text-blue-400"
        >
          {t("readDocs")}
          <BoxArrowUpRight className="w-3 h-3" />
        </Link>
      </p>
    </TabsContent>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "blue" | "green" | "amber" | "gray";
  children: React.ReactNode;
}) {
  return (
    <span
      className={classNames(
        "text-xs font-medium px-2 py-0.5 rounded-md",
        tone === "blue" && "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200",
        tone === "green" &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200",
        tone === "amber" && "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200",
        tone === "gray" && "bg-gray-100 text-gray-700 dark:bg-secondary dark:text-gray-300",
      )}
    >
      {children}
    </span>
  );
}
