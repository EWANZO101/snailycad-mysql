import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import Link from "next/link";
import { BoxArrowUpRight } from "react-bootstrap-icons";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { getNextI18nConfig } from "lib/i18n/getNextI18nConfig";

export interface LocaleFolderInfo {
  name: string;
  files: string[];
}

interface Props {
  localeFolders: LocaleFolderInfo[];
}

const DOCS_URL =
  "https://docs.snailycad.org/docs/guides/product/how-to-translate#adding-a-new-custom-locale";

/**
 * Informational, read-only tab. It lists the locales on disk (`apps/client/locales`) and the
 * locales registered in `apps/client/i18n.config.mjs`, and explains how to add a custom locale.
 * Nothing is written from the UI.
 */
export function CustomLocalesTab({ localeFolders }: Props) {
  const t = useTranslations("CustomLocales");
  const [config, setConfig] = React.useState<{ locales: string[]; defaultLocale: string } | null>(
    null,
  );

  React.useEffect(() => {
    getNextI18nConfig()
      .then((config) => setConfig({ locales: config.locales, defaultLocale: config.defaultLocale }))
      .catch(() => setConfig(null));
  }, []);

  const enFiles = localeFolders.find((folder) => folder.name === "en")?.files ?? [];
  const registered = config?.locales ?? [];
  const allNames = Array.from(
    new Set([...localeFolders.map((folder) => folder.name), ...registered]),
  ).sort();

  return (
    <TabsContent value={SettingsTabs.CustomLocales}>
      <h2 className="text-2xl font-semibold">{t("customLocales")}</h2>
      <p className="my-2 text-neutral-700 dark:text-gray-400 max-w-2xl">
        {t("customLocalesDescription")}
      </p>

      <h3 className="text-xl font-semibold mt-5 mb-2">{t("availableLocales")}</h3>
      <div className="overflow-x-auto">
        <table className="min-w-[500px] text-left">
          <thead>
            <tr className="border-b border-gray-300 dark:border-gray-700">
              <th className="py-2 pr-6">{t("locale")}</th>
              <th className="py-2 pr-6">{t("folderExists")}</th>
              <th className="py-2 pr-6">{t("registered")}</th>
              <th className="py-2 pr-6">{t("files")}</th>
            </tr>
          </thead>
          <tbody>
            {allNames.map((name) => {
              const folder = localeFolders.find((folder) => folder.name === name);
              const isRegistered = registered.includes(name);
              const missingFiles = folder ? enFiles.filter((f) => !folder.files.includes(f)) : [];

              return (
                <tr key={name} className="border-b border-gray-200 dark:border-gray-800">
                  <td className="py-2 pr-6 font-mono">
                    {name}
                    {config?.defaultLocale === name ? (
                      <span className="ml-2 text-sm text-neutral-500">({t("default")})</span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-6">{folder ? t("yes") : t("no")}</td>
                  <td className="py-2 pr-6">
                    {config ? (isRegistered ? t("yes") : t("notRegistered")) : "-"}
                  </td>
                  <td className="py-2 pr-6">
                    {folder ? `${folder.files.length}/${enFiles.length}` : "-"}
                    {missingFiles.length > 0 ? (
                      <span
                        className="block text-sm text-amber-600 dark:text-amber-400"
                        title={missingFiles.join(", ")}
                      >
                        {t("missingFiles", { files: missingFiles.join(", ") })}
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mt-6 mb-2">{t("howToAdd")}</h3>
      <ol className="list-decimal pl-6 flex flex-col gap-2 max-w-3xl">
        <li>{t("step1")}</li>
        <li>
          {t("step2")}
          <pre className="mt-1 p-2 rounded-md bg-gray-200 dark:bg-secondary overflow-x-auto text-sm">
            cp -r apps/client/locales/en apps/client/locales/xx-XX
          </pre>
        </li>
        <li>{t("step3")}</li>
        <li>
          {t("step4")}
          <pre className="mt-1 p-2 rounded-md bg-gray-200 dark:bg-secondary overflow-x-auto text-sm">
            {`export const i18n = {\n  locales: [/* the previous locales */ "xx-XX"],\n  defaultLocale: "en", // or "xx-XX"\n};`}
          </pre>
        </li>
        <li>
          {t("step5")}
          <pre className="mt-1 p-2 rounded-md bg-gray-200 dark:bg-secondary overflow-x-auto text-sm">
            pnpm run build
          </pre>
        </li>
        <li>{t("step6")}</li>
      </ol>

      <p className="mt-4 text-sm text-neutral-700 dark:text-gray-400 max-w-3xl">{t("note")}</p>

      <Link
        className="mt-3 underline flex items-center gap-1 text-blue-500"
        target="_blank"
        href={DOCS_URL}
      >
        {t("readDocs")}
        <BoxArrowUpRight className="inline-block" />
      </Link>
    </TabsContent>
  );
}
