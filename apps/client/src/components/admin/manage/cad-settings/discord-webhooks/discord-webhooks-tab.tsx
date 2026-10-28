import * as React from "react";
import { Alert, Button, Loader } from "@snailycad/ui";
import { Form, Formik, useFormikContext } from "formik";
import useFetch from "lib/useFetch";
import { useTranslations } from "next-intl";
import { useAuth } from "context/AuthContext";
import { type cad, DiscordWebhookType } from "@snailycad/types";
import { WebhookSettingsField } from "./WebhookSettingsField";
import { toastMessage } from "lib/toastMessage";
import type { GetCADDiscordWebhooksData, PostCADDiscordWebhooksData } from "@snailycad/types/api";
import { TabsContent } from "@radix-ui/react-tabs";
import { SettingsTabs } from "components/admin/cad-settings/layout";
import { SettingsTabHeader } from "components/admin/cad-settings/settings-tab-header";
import { Link45deg } from "react-bootstrap-icons";
import { Select } from "components/form/Select";
import { SettingsFormField } from "components/form/SettingsFormField";

/** extra (local) webhook types, rendered after the default types. */
const EXTRA_WEBHOOK_FIELDS = [
  { type: "USER_REGISTERED", label: "userRegistered", description: "userRegisteredInfo" },
  { type: "USER_BAN_STATUS", label: "userBanStatus", description: "userBanStatusInfo" },
  { type: "BOLO_UPDATED", label: "boloUpdated", description: "boloUpdatedInfo" },
  { type: "BOLO_DELETED", label: "boloDeleted", description: "boloDeletedInfo" },
  {
    type: "WARRANT_STATUS_CHANGED",
    label: "warrantStatusChanged",
    description: "warrantStatusChangedInfo",
  },
  { type: "CALL_911_ENDED", label: "call911Ended", description: "call911EndedInfo" },
  { type: "CITIZEN_CREATED", label: "citizenCreated", description: "citizenCreatedInfo" },
  { type: "CITIZEN_DELETED", label: "citizenDeleted", description: "citizenDeletedInfo" },
  {
    type: "EXPUNGEMENT_REQUEST_STATUS",
    label: "expungementRequestStatus",
    description: "expungementRequestStatusInfo",
  },
  { type: "TOW_CALL_CREATED", label: "towCallCreated", description: "towCallCreatedInfo" },
  { type: "TAXI_CALL_CREATED", label: "taxiCallCreated", description: "taxiCallCreatedInfo" },
] as const;

function getAllWebhookTypes() {
  const types = new Set<string>(Object.values(DiscordWebhookType));
  for (const field of EXTRA_WEBHOOK_FIELDS) {
    types.add(field.type);
  }
  return Array.from(types);
}

function createInitialValues(cad: cad | null) {
  const webhookTypes = getAllWebhookTypes();

  return webhookTypes.reduce(
    (obj, type) => ({
      ...obj,
      [type]: makeInitialValue(cad, type),
    }),
    {},
  );
}

export function DiscordWebhooksTab() {
  const [channels, setChannels] = React.useState<GetCADDiscordWebhooksData>([]);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const { state, execute } = useFetch();
  const tErrors = useTranslations("Errors");
  const common = useTranslations("Common");
  const { cad, setCad } = useAuth();
  const t = useTranslations("DiscordWebhooksTab");

  const INITIAL_VALUES = createInitialValues(cad);

  React.useEffect(() => {
    void refreshChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshChannels() {
    const { json, error } = await execute<GetCADDiscordWebhooksData>({
      path: "/admin/manage/cad-settings/discord/webhooks",
      method: "GET",
      noToast: true,
    });

    if (error) {
      setFetchError(error);
    }

    if (Array.isArray(json)) {
      setChannels(json);
    }
  }

  async function onSubmit(values: typeof INITIAL_VALUES) {
    const { json } = await execute<PostCADDiscordWebhooksData>({
      path: "/admin/manage/cad-settings/discord/webhooks",
      method: "POST",
      data: values,
    });

    if (json.id && cad) {
      setCad({ ...cad, miscCadSettingsId: json.id, miscCadSettings: json });
      toastMessage({
        icon: "success",
        title: common("success"),
        message: common("savedSettingsSuccess"),
      });
    }
  }

  return (
    <TabsContent value={SettingsTabs.DiscordWebhooks}>
      <header>
        <div className="flex items-center justify-between">
          <SettingsTabHeader icon={<Link45deg size={18} />}>
            {t("discordWebhooks")}
          </SettingsTabHeader>

          <Button onPress={refreshChannels} className="h-fit min-w-fit">
            {t("refreshChannels")}
          </Button>
        </div>

        <p className="my-3 text-neutral-700 dark:text-gray-400 max-w-2xl">
          {t("discordWebhooksInfo")}
        </p>
      </header>

      {fetchError ? (
        <Alert
          type="error"
          className="my-5"
          title={tErrors("unknown")}
          message={tErrors(fetchError)}
        />
      ) : null}

      <Formik onSubmit={onSubmit} initialValues={INITIAL_VALUES}>
        {() => (
          <Form className="mt-5 space-y-5">
            <EnableAllWebhooks disabled={Boolean(fetchError)} channels={channels} />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.CALL_911}
              channels={channels}
              description={t("calls911ChannelInfo")}
              label={t("calls911Channel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.UNIT_STATUS}
              channels={channels}
              description={t("statusUpdatesChannelInfo")}
              label={t("statusUpdatesChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.PANIC_BUTTON}
              channels={channels}
              description={t("panicButtonChannelInfo")}
              label={t("panicButtonChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.BOLO}
              channels={channels}
              description={t("bolosChannelInfo")}
              label={t("bolosChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.VEHICLE_IMPOUNDED}
              channels={channels}
              description={t("impoundedVehicleChannelInfo")}
              label={t("impoundedVehicleChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.CITIZEN_RECORD}
              channels={channels}
              description={t("citizenRecordsChannelInfo")}
              label={t("citizenRecordsChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.WARRANTS}
              channels={channels}
              description={t("warrantsChannelInfo")}
              label={t("warrantsChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.BLEETER_POST}
              channels={channels}
              description={t("bleeterPostChannelInfo")}
              label={t("bleeterPostChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.CITIZEN_DECLARED_DEAD}
              channels={channels}
              description={t("citizenDeclaredDeadChannelInfo")}
              label={t("citizenDeclaredDeadChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.DEPARTMENT_WHITELIST_STATUS}
              channels={channels}
              description={t("departmentWhitelistStatusChannelInfo")}
              label={t("departmentWhitelistStatusChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.USER_WHITELIST_STATUS}
              channels={channels}
              description={t("userWhitelistStatusChannelInfo")}
              label={t("userWhitelistStatusChannel")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.LEO_INCIDENT_CREATED}
              channels={channels}
              description={t("leoIncidentCreatedInfo")}
              label={t("leoIncidentCreated")}
            />

            <WebhookSettingsField
              disabled={Boolean(fetchError)}
              fieldName={DiscordWebhookType.EMS_FD_INCIDENT_CREATED}
              channels={channels}
              description={t("emsFdIncidentCreatedInfo")}
              label={t("emsFdIncidentCreated")}
            />

            {EXTRA_WEBHOOK_FIELDS.map((field) => (
              <WebhookSettingsField
                key={field.type}
                disabled={Boolean(fetchError)}
                fieldName={field.type}
                channels={channels}
                description={t(field.description)}
                label={t(field.label)}
              />
            ))}

            <Button
              className="flex items-center float-right"
              type="submit"
              disabled={state === "loading"}
            >
              {state === "loading" ? <Loader className="mr-3 border-red-300" /> : null}
              {common("save")}
            </Button>
          </Form>
        )}
      </Formik>
    </TabsContent>
  );
}

function makeInitialValue(cad: cad | null, type: string) {
  const webhook = cad?.miscCadSettings?.webhooks?.find((v) => v.type === type);
  if (!webhook) return { id: null, type, extraMessage: "" };

  return {
    id: webhook.channelId,
    extraMessage: webhook.extraMessage ?? "",
    type,
  };
}

function EnableAllWebhooks({
  channels,
  disabled,
}: {
  channels: GetCADDiscordWebhooksData;
  disabled?: boolean;
}) {
  const [channelId, setChannelId] = React.useState<string | null>(null);
  const { values, setFieldValue } = useFormikContext<Record<string, any>>();
  const t = useTranslations("DiscordWebhooksTab");

  function handleEnableAll() {
    if (!channelId) return;

    for (const type of getAllWebhookTypes()) {
      const current = values[type];
      if (current?.id) continue;
      setFieldValue(type, { extraMessage: "", ...current, type, id: channelId });
    }
  }

  function handleDisableAll() {
    for (const type of getAllWebhookTypes()) {
      const current = values[type];
      setFieldValue(type, { extraMessage: "", ...current, type, id: null });
    }
  }

  return (
    <SettingsFormField description={t("enableAllWebhooksInfo")} label={t("enableAllWebhooks")}>
      <Select
        disabled={disabled}
        isClearable
        values={channels.map((channel) => ({ value: channel.id, label: channel.name }))}
        value={channelId}
        name="enableAllChannelId"
        onChange={(event: any) => setChannelId(event.target.value ?? null)}
      />

      <div className="flex items-center gap-2 mt-2">
        <Button
          type="button"
          size="xs"
          isDisabled={disabled || !channelId}
          onPress={handleEnableAll}
        >
          {t("enableAllUnset")}
        </Button>
        <Button
          type="button"
          size="xs"
          variant="danger"
          isDisabled={disabled}
          onPress={handleDisableAll}
        >
          {t("disableAll")}
        </Button>
      </div>
    </SettingsFormField>
  );
}
