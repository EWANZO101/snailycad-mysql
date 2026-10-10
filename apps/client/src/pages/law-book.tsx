import { Layout } from "components/Layout";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import type { GetServerSideProps } from "next";
import { useTranslations } from "use-intl";
import { requestAll } from "lib/utils";
import { Title } from "components/shared/Title";
import { useValues } from "context/ValuesContext";
import { GroupedPenalCodeList } from "components/penal-codes/grouped-penal-code-list";

export default function LawBook() {
  const t = useTranslations("LawBook");
  const { penalCode } = useValues();

  return (
    <Layout className="dark:text-white">
      <header className="flex items-center justify-between mb-5">
        <Title>{t("lawBook")}</Title>
      </header>

      {penalCode.values.length <= 0 ? (
        <p className="mt-5">{t("noPenalCodes")}</p>
      ) : (
        <GroupedPenalCodeList penalCodes={penalCode.values} />
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale, req }) => {
  const user = await getSessionUser(req);
  const [values] = await requestAll(req, [["/admin/values/penal_code", []]]);

  return {
    props: {
      values,
      session: user,
      messages: {
        ...(await getTranslations(["citizen"], user?.locale ?? locale)),
      },
    },
  };
};
