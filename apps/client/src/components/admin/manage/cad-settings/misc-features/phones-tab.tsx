import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Loader, SwitchField } from "@snailycad/ui";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import useFetch from "lib/useFetch";

interface FivemPhone {
  id: string;
  name: string;
  features: ("phoneNumber" | "calls")[];
  description: string;
  enabled: boolean;
  detected: boolean | null;
}

interface PhonesData {
  id: string;
  enabled: boolean;
  phones: FivemPhone[];
}

// shared with the FiveM framework tab: both read and save the same settings row
const QUERY_KEY = ["admin", "fivem-framework"];
const BASE_PATH = "/admin/manage/cad-settings/fivem-framework";

/** in-game phones the snailycad-framework resource reads phone numbers from, each switchable */
export function PhonesTab() {
  const t = useTranslations("FivemFramework");
  const common = useTranslations("Common");
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = React.useState<Record<string, boolean> | null>(null);

  const settings = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { json } = await execute<PhonesData>({ path: BASE_PATH, noToast: true });
      return json.id ? json : null;
    },
  });
  const data = settings.data;

  React.useEffect(() => {
    if (!data?.phones) return;
    setEnabled(Object.fromEntries(data.phones.map((phone) => [phone.id, phone.enabled])));
  }, [data]);

  async function handleSave() {
    if (!enabled) return;
    const disabledPhones = Object.entries(enabled)
      .filter(([, on]) => !on)
      .map(([id]) => id);
    const { json } = await execute<PhonesData>({
      path: BASE_PATH,
      method: "PUT",
      data: { disabledPhones },
    });
    if (json.id) queryClient.setQueryData(QUERY_KEY, json);
  }

  const phones = data?.phones ?? [];
  const reported = phones.some((phone) => phone.detected !== null);

  return (
    <TabsContent value={SettingsTabs.Phones} className="mt-3">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">{t("phonesTitle")}</h2>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("phonesIntro")}</p>
      </header>

      {settings.isPending ? <Loader /> : null}

      {data && enabled ? (
        <>
          {!data.enabled ? (
            <p className="card p-3 mb-4 text-sm text-amber-700 dark:text-amber-300">
              {t("phonesSyncOff")}
            </p>
          ) : null}

          <section className="card p-4 mb-6 flex flex-col gap-4">
            {phones.map((phone) => (
              <div key={phone.id} className="flex flex-col gap-1.5">
                <SwitchField
                  isSelected={enabled[phone.id] ?? true}
                  onChange={(on) => setEnabled((prev) => ({ ...prev, [phone.id]: on }))}
                  description={phone.description}
                >
                  <span className="font-medium">{phone.name}</span>
                  {phone.id !== "framework" ? (
                    <code className="ml-2 text-xs text-neutral-500 dark:text-gray-400">
                      {phone.id}
                    </code>
                  ) : null}
                </SwitchField>
                <div className="flex flex-wrap gap-1.5 ml-12 text-xs">
                  <span className="rounded-full px-2 py-0.5 bg-gray-100 dark:bg-quaternary">
                    {t("phoneFeatureNumber")}
                  </span>
                  {phone.features.includes("calls") ? (
                    <span className="rounded-full px-2 py-0.5 bg-gray-100 dark:bg-quaternary">
                      {t("phoneFeatureCalls")}
                    </span>
                  ) : null}
                  {phone.detected ? (
                    <span className="rounded-full px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-300">
                      {t("phoneDetected")}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <p className="mb-6 text-sm text-neutral-600 dark:text-gray-400">
            {reported ? t("phonesOrder") : t("phonesNotReported")}
          </p>

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
