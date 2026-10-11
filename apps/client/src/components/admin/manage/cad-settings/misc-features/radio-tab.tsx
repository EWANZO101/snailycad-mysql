import * as React from "react";
import { TabsContent } from "@radix-ui/react-tabs";
import { useTranslations } from "use-intl";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DepartmentValue } from "@snailycad/types";
import { Alert, Button, Loader, SelectField, SwitchField, TextField } from "@snailycad/ui";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import useFetch from "lib/useFetch";

type Transport = "BUILTIN" | "LIVEKIT";

interface AdminRadioChannel {
  id: string;
  name: string;
  frequency: string | null;
  description: string | null;
  position: number;
  allowExternal: boolean;
  receiveOnly: boolean;
  departments: { id: string; value: { value: string } }[];
}

interface AdminRadioData {
  channels: AdminRadioChannel[];
  settings: { id: string; transport: Transport };
  livekitConfigured: boolean;
  livekitUrl: string | null;
  wsUrl: string;
  transport: "builtin" | "livekit";
}

const EMPTY_FORM = {
  name: "",
  frequency: "",
  description: "",
  position: 0,
  departments: [] as string[],
  allowExternal: true,
  receiveOnly: false,
};

const QUERY_KEY = ["admin", "radio"];

/** admins create the radio channels and pick how audio travels (built-in or LiveKit) */
export function RadioTab() {
  const t = useTranslations("Radio");
  const common = useTranslations("Common");
  const { RADIO } = useFeatureEnabled();
  const { execute, state } = useFetch();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState(EMPTY_FORM);

  const radio = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { json } = await execute<AdminRadioData>({
        path: "/admin/manage/cad-settings/radio",
        noToast: true,
      });
      return Array.isArray(json.channels) ? json : null;
    },
  });

  const departments = useQuery({
    queryKey: ["admin", "values", "department"],
    queryFn: async () => {
      const { json } = await execute<{ values: DepartmentValue[] }[]>({
        path: "/admin/values/department?includeAll=true",
        noToast: true,
      });
      return Array.isArray(json) ? (json[0]?.values ?? []) : [];
    },
  });

  function update(patch: Partial<typeof EMPTY_FORM>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function handleEdit(channel: AdminRadioChannel) {
    setEditingId(channel.id);
    setForm({
      name: channel.name,
      frequency: channel.frequency ?? "",
      description: channel.description ?? "",
      position: channel.position,
      departments: channel.departments.map((d) => d.id),
      allowExternal: channel.allowExternal,
      receiveOnly: channel.receiveOnly,
    });
  }

  function handleCancel() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    const { json } = await execute<AdminRadioChannel>({
      path: editingId
        ? `/admin/manage/cad-settings/radio/channels/${editingId}`
        : "/admin/manage/cad-settings/radio/channels",
      method: editingId ? "PUT" : "POST",
      data: {
        name: form.name.trim(),
        frequency: form.frequency.trim() || null,
        description: form.description.trim() || null,
        position: form.position,
        departments: form.departments,
        allowExternal: form.allowExternal,
        receiveOnly: form.receiveOnly,
      },
    });
    if (json.id) {
      handleCancel();
      await refresh();
    }
  }

  async function handleDelete(channel: AdminRadioChannel) {
    if (!window.confirm(t("confirmDeleteChannel", { name: channel.name }))) return;
    const { json } = await execute<boolean>({
      path: `/admin/manage/cad-settings/radio/channels/${channel.id}`,
      method: "DELETE",
    });
    if (json) {
      if (editingId === channel.id) handleCancel();
      await refresh();
    }
  }

  async function setTransport(transport: Transport) {
    await execute({
      path: "/admin/manage/cad-settings/radio/settings",
      method: "PUT",
      data: { transport },
    });
    await refresh();
  }

  const data = radio.data;
  const departmentOptions = (departments.data ?? []).map((department) => ({
    value: department.id,
    label: department.value.value,
  }));

  return (
    <TabsContent value={SettingsTabs.Radio} className="mt-3">
      <header className="mb-4">
        <h2 className="text-2xl font-semibold">{t("radio")}</h2>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("adminIntro")}</p>
      </header>

      {RADIO ? null : (
        <Alert className="mb-4" type="warning" title={t("radioDisabledTitle")}>
          <p>{t("radioDisabledMessage")}</p>
        </Alert>
      )}

      {radio.isPending ? <Loader /> : null}

      {data ? (
        <>
          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">{t("audioServer")}</h3>
            <p className="text-sm text-neutral-600 dark:text-gray-400 mb-3">
              {t("audioServerIntro")}
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <TransportOption
                title={t("builtin")}
                description={t("builtinDescription")}
                isSelected={data.settings.transport === "BUILTIN"}
                onSelect={() => void setTransport("BUILTIN")}
              />
              <TransportOption
                title={t("livekit")}
                description={
                  data.livekitConfigured
                    ? t("livekitDescription", { url: data.livekitUrl ?? "" })
                    : t("livekitNotConfigured")
                }
                isSelected={data.settings.transport === "LIVEKIT"}
                isDisabled={!data.livekitConfigured}
                onSelect={() => void setTransport("LIVEKIT")}
              />
            </div>
            {data.settings.transport === "LIVEKIT" && data.transport !== "livekit" ? (
              <Alert className="mt-3" type="warning" title={t("livekitFallbackTitle")}>
                <p>{t("livekitFallback")}</p>
              </Alert>
            ) : null}
            <dl className="mt-4 text-sm grid gap-1">
              <div className="flex flex-wrap gap-2">
                <dt className="font-medium">{t("radioAddress")}</dt>
                <dd>
                  <code>{data.wsUrl}</code>
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-sm text-neutral-600 dark:text-gray-400">
              {t("integrationsHint")}
            </p>
          </section>

          <section className="card p-4 mb-6">
            <h3 className="font-semibold text-lg mb-2">
              {editingId ? t("editChannel") : t("addChannel")}
            </h3>
            <div className="grid gap-x-3 md:grid-cols-2">
              <TextField
                label={common("name")}
                value={form.name}
                onChange={(name) => update({ name })}
                maxLength={255}
                isRequired
              />
              <TextField
                label={t("frequency")}
                value={form.frequency}
                onChange={(frequency) => update({ frequency })}
                maxLength={64}
                isOptional
                placeholder="154.430"
              />
              <div className="md:col-span-2">
                <TextField
                  label={t("description")}
                  value={form.description}
                  onChange={(description) => update({ description })}
                  maxLength={1000}
                  isOptional
                />
              </div>
              <SelectField
                label={t("departments")}
                isOptional
                selectionMode="multiple"
                selectedKeys={form.departments}
                onSelectionChange={(keys) =>
                  update({ departments: [...(keys as Iterable<React.Key>)].map(String) })
                }
                options={departmentOptions}
              />
              <TextField
                label={t("order")}
                value={String(form.position)}
                onChange={(value) => update({ position: Math.max(0, Number(value) || 0) })}
                inputMode="numeric"
              />
            </div>
            <p className="-mt-1 mb-3 text-sm text-neutral-600 dark:text-gray-400">
              {t("departmentsDescription")}
            </p>
            <SwitchField
              isSelected={form.allowExternal}
              onChange={(allowExternal) => update({ allowExternal })}
              description={t("allowExternalDescription")}
            >
              {t("allowExternal")}
            </SwitchField>
            <SwitchField
              isSelected={form.receiveOnly}
              onChange={(receiveOnly) => update({ receiveOnly })}
              description={t("receiveOnlyDescription")}
            >
              {t("receiveOnlyChannel")}
            </SwitchField>

            <footer className="flex flex-wrap justify-end gap-2 mt-2">
              {editingId ? (
                <Button variant="cancel" onPress={handleCancel}>
                  {common("cancel")}
                </Button>
              ) : null}
              <Button
                className="flex items-center gap-2"
                isDisabled={!form.name.trim() || state === "loading"}
                onPress={handleSave}
              >
                {state === "loading" ? <Loader /> : null}
                {editingId ? common("save") : t("addChannel")}
              </Button>
            </footer>
          </section>

          {data.channels.length <= 0 ? (
            <p className="text-neutral-600 dark:text-gray-400">{t("noChannelsAdmin")}</p>
          ) : (
            <ul className="grid gap-3 grid-cols-1 lg:grid-cols-2">
              {data.channels.map((channel) => (
                <li key={channel.id} className="card p-4 flex flex-col gap-2">
                  <div>
                    <h4 className="font-semibold">
                      {channel.name}
                      {channel.frequency ? (
                        <span className="ml-2 font-normal text-neutral-500 dark:text-gray-400">
                          {channel.frequency}
                        </span>
                      ) : null}
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-gray-400">
                      {channel.departments.length
                        ? channel.departments.map((d) => d.value.value).join(", ")
                        : t("everyone")}
                      {channel.allowExternal ? "" : ` · ${t("cadOnly")}`}
                      {channel.receiveOnly ? ` · ${t("receiveOnly")}` : ""}
                    </p>
                    {channel.description ? (
                      <p className="text-sm mt-1">{channel.description}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="xs" onPress={() => handleEdit(channel)}>
                      {common("edit")}
                    </Button>
                    <Button size="xs" variant="danger" onPress={() => handleDelete(channel)}>
                      {common("delete")}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : null}
    </TabsContent>
  );
}

function TransportOption(props: {
  title: string;
  description: string;
  isSelected: boolean;
  isDisabled?: boolean;
  onSelect(): void;
}) {
  return (
    <button
      type="button"
      disabled={props.isDisabled}
      onClick={props.onSelect}
      className={`text-left rounded-lg border p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        props.isSelected
          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
          : "border-gray-200 dark:border-quaternary hover:bg-gray-50 dark:hover:bg-secondary/60"
      }`}
    >
      <span className="font-semibold block">{props.title}</span>
      <span className="text-sm text-neutral-600 dark:text-gray-400">{props.description}</span>
    </button>
  );
}
