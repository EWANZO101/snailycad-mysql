import type { GetServerSideProps } from "next";
import { getTranslations } from "lib/getTranslation";
import { Title } from "components/shared/Title";
import { AuthScreenImages } from "components/auth/auth-screen-images";
import { LocalhostDetector } from "components/auth/localhost-detector";
import { DemoDetector, type DemoStatus } from "components/auth/demo-detector";
import { parseCookies } from "nookies";
import { VersionDisplay } from "components/shared/VersionDisplay";
import { useAuth } from "context/AuthContext";
import { useTranslations } from "next-intl";
import { LoginForm } from "components/auth/login/login-form";
import { useRouter } from "next/router";
import { requestAll } from "lib/utils";
import { ApiVerification } from "components/auth/api-verification";
import Link from "next/link";

interface Props {
  isLocalhost: boolean;
  isCORSError: boolean;
  CORS_ORIGIN_URL: string | null;
  demo: DemoStatus | null;
}

export default function Login(props: Props) {
  const { cad } = useAuth();
  const t = useTranslations("Auth");
  const recoveryT = useTranslations("Recovery");
  const router = useRouter();

  async function handleSubmit({ from }: { from: string }) {
    router.push(from);
  }

  return (
    <>
      <Title renderLayoutTitle={false}>{t("login")}</Title>

      <main className="flex flex-col items-center justify-center pt-20">
        <AuthScreenImages />
        <LocalhostDetector isLocalhost={props.isLocalhost} />
        <ApiVerification isCORSError={props.isCORSError} CORS_ORIGIN_URL={props.CORS_ORIGIN_URL} />
        <DemoDetector demo={props.demo} />

        <LoginForm onFormSubmitted={handleSubmit} />

        <Link
          href="/auth/recovery"
          className="mt-3 text-sm underline text-neutral-500 hover:text-neutral-700 dark:text-gray-500 dark:hover:text-gray-300"
        >
          {recoveryT("recoveryLink")}
        </Link>

        <VersionDisplay cad={cad} />

        <a
          rel="noreferrer"
          target="_blank"
          className="mt-3 md:mt-0 relative md:absolute md:bottom-10 md:left-1/2 md:-translate-x-1/2 underline text-lg transition-colors text-neutral-700 hover:text-neutral-900 dark:text-gray-400 dark:hover:text-white mx-2 block cursor-pointer z-50"
          href="https://snailycad.org"
        >
          SnailyCAD
        </a>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  const cookies = parseCookies({ req });
  const userSavedLocale = cookies.sn_locale ?? null;
  const userSavedIsDarkTheme = cookies.sn_isDarkTheme ?? null;

  const [data, demo] = await requestAll(req, [
    ["/admin/manage/cad-settings", null],
    ["/demo", null],
  ]);

  const CORS_ORIGIN_URL = process.env.CORS_ORIGIN_URL ?? null;
  const NEXT_PUBLIC_CLIENT_URL = process.env.NEXT_PUBLIC_CLIENT_URL ?? null;

  const isWildcard = CORS_ORIGIN_URL?.includes("*") ?? false;
  const isLocalhost =
    (CORS_ORIGIN_URL?.includes("localhost") || NEXT_PUBLIC_CLIENT_URL?.includes("localhost")) ??
    false;

  const isDefaultENvValue = CORS_ORIGIN_URL === "http://192.168.x.x:3000";
  // CORS_ORIGIN_URL may be a comma separated list (the API supports that too)
  const corsOrigins = (CORS_ORIGIN_URL ?? "").split(",").map((url) => toOrigin(url.trim()));
  const doURLsMatch = isWildcard
    ? true
    : corsOrigins.includes(toOrigin(NEXT_PUBLIC_CLIENT_URL ?? "")) && !isDefaultENvValue;

  return {
    props: {
      isLocalhost,
      isCORSError: !doURLsMatch,
      CORS_ORIGIN_URL,
      demo,
      cad: data,
      userSavedLocale,
      userSavedIsDarkTheme,
      messages: {
        ...(await getTranslations(["recovery"], "en")),
        ...(await getTranslations(["auth", "recovery"], userSavedLocale ?? locale)),
      },
    },
  };
};

function toOrigin(url: string) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return url;
  }
}
