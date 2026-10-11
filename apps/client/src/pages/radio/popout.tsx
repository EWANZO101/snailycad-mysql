import dynamic from "next/dynamic";
import Head from "next/head";
import type { GetServerSideProps } from "next";
import { useTranslations } from "use-intl";
import { Permissions } from "@snailycad/permissions";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { usePermission } from "hooks/usePermission";
import { useRadioAvailable } from "components/radio/radio-hub";

const RadioConsole = dynamic(
  async () => (await import("components/radio/radio-console")).RadioConsole,
  { ssr: false },
);

/**
 * The pop-out radio window (opened from the radio's pop-out button). It takes over the
 * browser's radio: the CAD's tabs become remote controls (their push-to-talk key keeps working).
 */
export default function RadioPopout() {
  const t = useTranslations("Radio");
  const available = useRadioAvailable();
  const { hasPermissions } = usePermission();

  return (
    <div className="min-h-screen bg-white dark:bg-primary text-neutral-900 dark:text-white">
      <Head>
        <title>{t("radio")} - SnailyCAD</title>
      </Head>
      {available ? (
        <RadioConsole variant="popout" canPlayTones={hasPermissions([Permissions.Dispatch])} />
      ) : (
        <p className="p-4 text-sm">{t("radioDisabledMessage")}</p>
      )}
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  const user = await getSessionUser(req);

  if (!user) {
    return { redirect: { destination: "/auth/login", permanent: false } };
  }

  return {
    props: {
      session: user,
      messages: {
        ...(await getTranslations(["radio"], user.locale ?? locale)),
      },
    },
  };
};
