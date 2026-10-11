import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";
import { useTranslations } from "use-intl";
import { Permissions } from "@snailycad/permissions";
import { Alert } from "@snailycad/ui";
import { Layout } from "components/Layout";
import { Title } from "components/shared/Title";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { usePermission } from "hooks/usePermission";

const RadioConsole = dynamic(
  async () => (await import("components/radio/radio-console")).RadioConsole,
  { ssr: false },
);

/** a full-page radio console: a dispatcher only needs a browser, no game */
export default function RadioPage() {
  const t = useTranslations("Radio");
  const { RADIO } = useFeatureEnabled();
  const { hasPermissions } = usePermission();

  return (
    <Layout
      permissions={{ permissions: [Permissions.Dispatch, Permissions.ManageCADSettings] }}
      className="dark:text-white"
    >
      <header className="mb-5">
        <Title>{t("radioConsole")}</Title>
        <p className="mt-1 text-neutral-600 dark:text-gray-400">{t("radioConsoleIntro")}</p>
      </header>

      {RADIO ? (
        <RadioConsole variant="page" canPlayTones={hasPermissions([Permissions.Dispatch])} />
      ) : (
        <Alert type="warning" title={t("radioDisabledTitle")}>
          <p>{t("radioDisabledMessage")}</p>
        </Alert>
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  const user = await getSessionUser(req);

  return {
    props: {
      session: user,
      messages: {
        ...(await getTranslations(["radio", "leo"], user?.locale ?? locale)),
      },
    },
  };
};
