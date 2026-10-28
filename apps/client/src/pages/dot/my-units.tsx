import * as React from "react";
import { useTranslations } from "use-intl";
import dynamic from "next/dynamic";
import { Button } from "@snailycad/ui";
import { Layout } from "components/Layout";
import { useModal } from "state/modalState";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import type { GetServerSideProps } from "next";
import { ModalIds } from "types/modal-ids";
import useFetch from "lib/useFetch";
import { formatOfficerDepartment, makeUnitName, requestAll } from "lib/utils";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { useImageUrl } from "hooks/useImageUrl";
import { Table, useTableState } from "components/shared/Table";
import { Title } from "components/shared/Title";
import { Permissions } from "@snailycad/permissions";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { OfficerRank } from "components/leo/OfficerRank";
import { UnitDepartmentStatus } from "components/leo/UnitDepartmentStatus";
import type { DeleteMyDotWorkerByIdData, GetMyDotWorkersData } from "@snailycad/types/api";
import { useTemporaryItem } from "hooks/shared/useTemporaryItem";
import { ImageWrapper } from "components/shared/image-wrapper";

const AlertModal = dynamic(async () => (await import("components/modal/AlertModal")).AlertModal);
const ManageDotWorkerModal = dynamic(
  async () => (await import("components/dot/modals/manage-unit-modal")).ManageDotWorkerModal,
);

interface Props {
  workers: GetMyDotWorkersData["workers"];
}

export default function MyDotWorkers({ workers: data }: Props) {
  const common = useTranslations("Common");
  const t = useTranslations();
  const modalState = useModal();
  const { state, execute } = useFetch();
  const { generateCallsign } = useGenerateCallsign();
  const { makeImageUrl } = useImageUrl();
  const { DIVISIONS, BADGE_NUMBERS } = useFeatureEnabled();
  const tableState = useTableState();

  const [workers, setWorkers] = React.useState(data);
  const [tempWorker, workerState] = useTemporaryItem(workers);

  async function handleDeleteWorker() {
    if (!tempWorker) return;

    const { json } = await execute<DeleteMyDotWorkerByIdData>({
      path: `/dot/${tempWorker.id}`,
      method: "DELETE",
    });

    if (json) {
      modalState.closeModal(ModalIds.AlertDeleteDotWorker);
      setWorkers((p) => p.filter((v) => v.id !== tempWorker.id));
    }
  }

  function handleEditClick(worker: GetMyDotWorkersData["workers"][number]) {
    workerState.setTempId(worker.id);
    modalState.openModal(ModalIds.ManageDotWorker);
  }

  function handleDeleteClick(worker: GetMyDotWorkersData["workers"][number]) {
    workerState.setTempId(worker.id);
    modalState.openModal(ModalIds.AlertDeleteDotWorker);
  }

  return (
    <Layout permissions={{ permissions: [Permissions.Dot] }} className="dark:text-white">
      <header className="flex items-center justify-between">
        <Title className="!mb-0">{t("Dot.myWorkers")}</Title>

        <Button onPress={() => modalState.openModal(ModalIds.ManageDotWorker)}>
          {t("Dot.createWorker")}
        </Button>
      </header>

      {workers.length <= 0 ? (
        <p className="mt-5">{t("Dot.noWorkers")}</p>
      ) : (
        <Table
          tableState={tableState}
          data={workers.map((worker) => ({
            id: worker.id,
            worker: (
              <span className="flex items-center">
                {worker.imageId ? (
                  <ImageWrapper
                    quality={70}
                    className="rounded-md w-[30px] h-[30px] object-cover mr-2"
                    draggable={false}
                    src={makeImageUrl("units", worker.imageId)!}
                    loading="lazy"
                    width={30}
                    height={30}
                    alt={makeUnitName(worker)}
                  />
                ) : null}
                {makeUnitName(worker)}
              </span>
            ),
            callsign: generateCallsign(worker),
            badgeNumberString: worker.badgeNumberString,
            department: formatOfficerDepartment(worker) ?? common("none"),
            departmentStatus: <UnitDepartmentStatus unit={worker} />,
            division: worker.division?.value.value ?? common("none"),
            rank: <OfficerRank unit={worker} />,
            position: worker.position ?? common("none"),
            actions: (
              <>
                <Button size="xs" onPress={() => handleEditClick(worker)} variant="success">
                  {common("edit")}
                </Button>
                <Button
                  onPress={() => handleDeleteClick(worker)}
                  className="ml-2"
                  variant="danger"
                  size="xs"
                >
                  {common("delete")}
                </Button>
              </>
            ),
          }))}
          columns={[
            { header: t("Dot.worker"), accessorKey: "worker" },
            { header: t("Leo.callsign"), accessorKey: "callsign" },
            BADGE_NUMBERS
              ? { header: t("Leo.badgeNumber"), accessorKey: "badgeNumberString" }
              : null,
            { header: t("Leo.department"), accessorKey: "department" },
            DIVISIONS ? { header: t("Leo.division"), accessorKey: "division" } : null,
            { header: t("Leo.rank"), accessorKey: "rank" },
            { header: t("Leo.position"), accessorKey: "position" },
            { header: t("Leo.status"), accessorKey: "departmentStatus" },
            { header: common("actions"), accessorKey: "actions" },
          ]}
        />
      )}

      <ManageDotWorkerModal
        onCreate={(worker) => setWorkers((p) => [worker, ...p])}
        onUpdate={(old, newO) => {
          setWorkers((p) => {
            const idx = p.indexOf(old);
            p[idx] = newO;

            return p;
          });
        }}
        worker={tempWorker}
        onClose={() => workerState.setTempId(null)}
      />

      <AlertModal
        title={t("Dot.deleteWorker")}
        description={t.rich("Dot.alert_deleteWorker", {
          worker: tempWorker && makeUnitName(tempWorker),
        })}
        id={ModalIds.AlertDeleteDotWorker}
        onDeleteClick={handleDeleteWorker}
        onClose={() => workerState.setTempId(null)}
        state={state}
      />
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ req, locale }) => {
  const user = await getSessionUser(req);
  const [{ workers }, values] = await requestAll(req, [
    ["/dot", { workers: [] }],
    ["/admin/values/department?paths=division", []],
  ]);

  return {
    props: {
      session: user,
      workers,
      values,
      messages: {
        ...(await getTranslations(["dot", "leo", "common"], user?.locale ?? locale)),
      },
    },
  };
};
