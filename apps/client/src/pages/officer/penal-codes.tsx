import { Layout } from "components/Layout";
import { Title } from "components/shared/Title";
import { Permissions } from "@snailycad/permissions";
import { useTranslations } from "next-intl";
import type { GetServerSideProps } from "next";
import { requestAll } from "lib/utils";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { useValues } from "context/ValuesContext";
import { GroupedPenalCodeList } from "components/penal-codes/grouped-penal-code-list";

export default function PenalCodesPage() {
  const t = useTranslations("Leo");
  const { penalCode } = useValues();

  return (
    <Layout permissions={{ permissions: [Permissions.Leo] }} className="dark:text-white">
      <Title>{t("penalCodes")}</Title>

      {penalCode.values.length <= 0 ? (
        <p className="mt-5">{t("noPenalCodes")}</p>
      ) : (
        <GroupedPenalCodeList penalCodes={penalCode.values} />
      )}
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, locale }) => {
  const user = await getSessionUser(req);
  const [values] = await requestAll(req, [["/admin/values/penal_code", []]]);

  return {
    props: {
      session: user,
      values,
      messages: {
        ...(await getTranslations(["leo", "citizen", "common"], user?.locale ?? locale)),
      },
    },
  };
};
