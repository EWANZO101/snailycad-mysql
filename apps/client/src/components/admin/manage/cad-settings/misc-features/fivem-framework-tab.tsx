import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, FullDate, Loader, SelectField, SwitchField } from "@snailycad/ui";
import { getAPIUrl } from "@snailycad/utils/api-url";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { SettingsTabHeader } from "components/admin/cad-settings/settings-tab-header";
import { CpuFill } from "react-bootstrap-icons";
import useFetch from "lib/useFetch";

interface FivemFrameworkData {
  id: string;
  enabled: boolean;
  syncCitizens: boolean;
  syncVehicles: boolean;
  syncDuty: boolean;
  removedVehicles: "delete" | "unlink" | "keep";
  lastSyncAt: string | null;
  lastServerName: string | null;
  lastFramework: string | null;
  lastVersion: string | null;
  stats: {
    characters: number;
    linkedCharacters: number;
    unlinkedCharacters: number;
    vehicles: number;
  };
}

type Switches = Pick<
  FivemFrameworkData,
  "enabled" | "syncCitizens" | "syncVehicles" | "syncDuty" | "removedVehicles"
>;

const QUERY_KEY = ["admin", "fivem-framework"];
const BASE_PATH = "/admin/manage/cad-settings/fivem-framework";
const FRAMEWORK_NAMES: Record<string, string> = { esx: "ESX", qbcore: "QBCore", qbox: "Qbox" };

/** FiveM framework sync (snailycad-framework resource): last sync, counts and switches */
export function FivemFrameworkTab() {
  const t = useTranslations("FivemFramework");
  const common = useTranslations("Common");
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<Switches | null>(null);

  const settings = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { json } = await execute<FivemFrameworkData>({ path: BASE_PATH, noToast: true });
      return json.id ? json : null;
    },
  });
  const data = settings.data;

  React.useEffect(() => {
    if (!data) return;
    setForm({
      enabled: data.enabled,
      syncCitizens: data.syncCitizens,
      syncVehicles: data.syncVehicles,
      syncDuty: data.syncDuty,
      removedVehicles: data.removedVehicles,
    });
  }, [data]);

  function update(patch: Partial<Switches>) {
    setForm((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function handleSave() {
    if (!form) return;
    const { json } = await execute<FivemFrameworkData>({
      path: BASE_PATH,
      method: "PUT",
      data: form,
    });
    if (json.id) queryClient.setQueryData(QUERY_KEY, json);
  }

  const stats = data?.stats;
  const rows: [string, React.ReactNode][] = data
    ? [
        [t("server"), data.lastServerName || "-"],
        [t("framework"), data.lastFramework ? FRAMEWORK_NAMES[data.lastFramework] : "-"],
        [t("version"), data.lastVersion || "-"],
        [t("characters"), stats?.characters ?? 0],
        [t("linkedCharacters"), stats?.linkedCharacters ?? 0],
        [t("unlinkedCharacters"), stats?.unlinkedCharacters ?? 0],
        [t("vehicles"), stats?.vehicles ?? 0],
      ]
    : [];

  return (
    <TabsContent value={SettingsTabs.FivemFramework} className="mt-3">
      <header className="mb-4">
        <SettingsTabHeader icon={<CpuFill size={16} />}>{t("title")}</SettingsTabHeader>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("intro")}</p>
      </header>

      {settings.isPending ? <Loader /> : null}

      {data && form ? (
        <>
          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("lastSync")}</h3>
            {data.lastSyncAt ? (
              <p className="mb-3">
                <FullDate>{data.lastSyncAt}</FullDate>
              </p>
            ) : (
              <p className="mb-3 text-neutral-600 dark:text-gray-400">{t("never")}</p>
            )}
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm max-w-md">
              {rows.map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt className="text-neutral-600 dark:text-gray-400">{label}</dt>
                  <dd>{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </section>

          <section className="card p-4 mb-6 flex flex-col gap-3">
            <SwitchField
              isSelected={form.enabled}
              onChange={(enabled) => update({ enabled })}
              description={t("enabledDescription")}
            >
              {t("enabled")}
            </SwitchField>
            <SwitchField
              isDisabled={!form.enabled}
              isSelected={form.syncCitizens}
              onChange={(syncCitizens) => update({ syncCitizens })}
              description={t("syncCitizensDescription")}
            >
              {t("syncCitizens")}
            </SwitchField>
            <SwitchField
              isDisabled={!form.enabled}
              isSelected={form.syncVehicles}
              onChange={(syncVehicles) => update({ syncVehicles })}
              description={t("syncVehiclesDescription")}
            >
              {t("syncVehicles")}
            </SwitchField>
            <SelectField
              isDisabled={!form.enabled || !form.syncVehicles}
              label={t("removedVehicles")}
              description={t("removedVehiclesDescription")}
              selectedKey={form.removedVehicles}
              onSelectionChange={(value) =>
                update({ removedVehicles: (value ?? "delete") as Switches["removedVehicles"] })
              }
              options={[
                { value: "delete", label: t("removedVehiclesDelete") },
                { value: "unlink", label: t("removedVehiclesUnlink") },
                { value: "keep", label: t("removedVehiclesKeep") },
              ]}
            />
            <SwitchField
              isDisabled={!form.enabled}
              isSelected={form.syncDuty}
              onChange={(syncDuty) => update({ syncDuty })}
              description={t("syncDutyDescription")}
            >
              {t("syncDuty")}
            </SwitchField>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("setup")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">{t("setupInfo")}</p>
            <code className="block p-2 rounded-md bg-gray-100 dark:bg-quaternary text-sm break-all">
              snailyframework_setup {getAPIUrl()} YOUR_CAD_API_TOKEN
            </code>
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
