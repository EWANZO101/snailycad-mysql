import type { GetServerSideProps } from "next";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { requestAll } from "lib/utils";
import dynamic from "next/dynamic";
import { GeneralSettingsTab } from "components/admin/manage/cad-settings/general/general-settings-tab";
import { CadSettingsLayout } from "components/admin/cad-settings/layout";
import type { LocaleFolderInfo } from "components/admin/manage/cad-settings/misc-features/custom-locales-tab";

const Tabs = {
  WhitelistTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/general/whitelist-tab")).WhitelistTab,
    { ssr: false },
  ),
  CADFeaturesTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/general/cad-features-tab"))
        .CADFeaturesTab,
    { ssr: false },
  ),
  DefaultPermissionsTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/default-permissions-tab"))
        .DefaultPermissionsTab,
    { ssr: false },
  ),
  ApiTokenTab: dynamic(
    async () => (await import("components/admin/manage/cad-settings/api-token-tab")).ApiTokenTab,
    { ssr: false },
  ),
  DiscordRolesTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/discord-roles-tab")).DiscordRolesTab,
    { ssr: false },
  ),
  DiscordWebhooksTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/discord-webhooks/discord-webhooks-tab"))
        .DiscordWebhooksTab,
    { ssr: false },
  ),
  RawWebhooksTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/webhooks/raw-webhooks-tab"))
        .RawWebhooksTab,
    { ssr: false },
  ),
  LiveMapTab: dynamic(
    async () => (await import("components/admin/manage/cad-settings/live-map-tab")).LiveMapTab,
    { ssr: false },
  ),
  InactivityTimeoutTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/inactivity-timeout-tab"))
        .InactivityTimeoutTab,
    { ssr: false },
  ),
  CitizenLicenseNumbersTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/license-number-tab"))
        .LicenseNumbersTab,
    { ssr: false },
  ),
  MaxLicensePointsTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/max-license-points-tab"))
        .MaxLicensePointsSection,
    { ssr: false },
  ),
  TemplatesTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/template-tab")).TemplateTab,
    { ssr: false },
  ),
  LimitsTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/limits-tab")).LimitsTab,
    { ssr: false },
  ),
  OtherMiscTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/other-misc-tab"))
        .OtherMiscTab,
    { ssr: false },
  ),
  CustomLocalesTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/custom-locales-tab"))
        .CustomLocalesTab,
    { ssr: false },
  ),
  TonesTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/tones-tab")).TonesTab,
    { ssr: false },
  ),
  RadioTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/radio-tab")).RadioTab,
    { ssr: false },
  ),
  OpsPhoneTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/misc-features/ops-phone-tab"))
        .OpsPhoneTab,
    { ssr: false },
  ),
  BlacklistedWordsTab: dynamic(
    async () =>
      (await import("components/admin/manage/cad-settings/general/blacklisted-words-tab"))
        .BlacklistedWordsTab,
    { ssr: false },
  ),
};

interface Props {
  localeFolders?: LocaleFolderInfo[];
}

export default function CadSettings(props: Props) {
  return (
    <CadSettingsLayout>
      <GeneralSettingsTab />
      <Tabs.WhitelistTab />
      <Tabs.CADFeaturesTab />
      <Tabs.LimitsTab />
      <Tabs.OtherMiscTab />
      <Tabs.InactivityTimeoutTab />
      <Tabs.MaxLicensePointsTab />
      <Tabs.CitizenLicenseNumbersTab />
      <Tabs.TemplatesTab />
      <Tabs.DefaultPermissionsTab />
      <Tabs.LiveMapTab />
      <Tabs.ApiTokenTab />
      <Tabs.OpsPhoneTab />
      <Tabs.DiscordRolesTab />
      <Tabs.DiscordWebhooksTab />
      <Tabs.RawWebhooksTab />
      <Tabs.BlacklistedWordsTab />
      <Tabs.CustomLocalesTab localeFolders={props.localeFolders ?? []} />
      <Tabs.TonesTab />
      <Tabs.RadioTab />
    </CadSettingsLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, res, req }) => {
  const user = await getSessionUser(req);
  const [data] = await requestAll(req, [["/admin/manage/cad-settings", []]]);
  const localeFolders = await getLocaleFolders();

  // https://nextjs.org/docs/going-to-production#caching
  res.setHeader("Cache-Control", "public, s-maxage=10, stale-while-revalidate=59");

  return {
    props: {
      cad: data,
      localeFolders,
      session: user,
      messages: {
        ...(await getTranslations(
          ["admin", "values", "common", "cad-settings", "radio", "ops-phone"],
          user?.locale ?? locale,
        )),
      },
    },
  };
};

/**
 * read-only: lists the locale folders in `apps/client/locales` (server side only) so the
 * "Custom Locales" tab can show which locales exist on disk vs. which are registered.
 */
async function getLocaleFolders(): Promise<LocaleFolderInfo[]> {
  try {
    const { readdir } = await import("node:fs/promises");
    const path = await import("node:path");
    const localesDir = path.join(process.cwd(), "locales");

    const entries = await readdir(localesDir, { withFileTypes: true });
    const folders = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

    return Promise.all(
      folders.sort().map(async (name) => {
        const files = await readdir(path.join(localesDir, name)).catch(() => [] as string[]);
        return { name, files: files.filter((file) => file.endsWith(".json")).sort() };
      }),
    );
  } catch {
    return [];
  }
}
