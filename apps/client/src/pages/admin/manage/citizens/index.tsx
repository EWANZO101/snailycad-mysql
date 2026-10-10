import { useTranslations } from "use-intl";
import * as React from "react";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import type { GetServerSideProps } from "next";
import { AdminLayout } from "components/admin/AdminLayout";
import { requestAll } from "lib/utils";
import { Title } from "components/shared/Title";
import { AllCitizensTab } from "components/admin/manage/citizens/all-citizens-tab";
import { Permissions } from "@snailycad/permissions";
import type { GetManageCitizensData } from "@snailycad/types/api";
import { Button } from "@snailycad/ui";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { usePermission } from "hooks/usePermission";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";

const PruneCitizensModal = dynamic(
  async () =>
    (await import("components/admin/manage/citizens/prune-citizens-modal")).PruneCitizensModal,
  { ssr: false },
);

interface Props {
  citizens: GetManageCitizensData;
}

export default function ManageCitizens({ citizens: data }: Props) {
  const [citizens, setCitizens] = React.useState(data.citizens);
  const t = useTranslations("Management");
  const tPrune = useTranslations("PruneCitizens");
  const { hasPermissions } = usePermission();
  const modalState = useModal();
  const router = useRouter();

  return (
    <AdminLayout
      permissions={{
        permissions: [
          Permissions.ViewCitizens,
          Permissions.DeleteCitizens,
          Permissions.ManageCitizens,
        ],
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <Title>{t("MANAGE_CITIZENS")}</Title>

        {hasPermissions([Permissions.DeleteCitizens]) ? (
          <Button variant="danger" onPress={() => modalState.openModal(ModalIds.PruneCitizens)}>
            {tPrune("pruneCitizens")}
          </Button>
        ) : null}
      </header>

      <AllCitizensTab totalCount={data.totalCount} setCitizens={setCitizens} citizens={citizens} />

      {hasPermissions([Permissions.DeleteCitizens]) ? (
        <PruneCitizensModal onPruned={() => router.reload()} />
      ) : null}
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ locale, req }) => {
  const user = await getSessionUser(req);
  const [citizens] = await requestAll(req, [
    ["/admin/manage/citizens", { citizens: [], totalCount: 0 }],
  ]);

  return {
    props: {
      citizens,
      session: user,
      messages: {
        ...(await getTranslations(
          ["citizen", "admin", "values", "common"],
          user?.locale ?? locale,
        )),
      },
    },
  };
};
