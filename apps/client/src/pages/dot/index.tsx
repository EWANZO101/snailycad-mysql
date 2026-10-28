import * as React from "react";
import { Layout } from "components/Layout";
import { ModalButtons } from "components/dot/ModalButtons";
import dynamic from "next/dynamic";
import type { GetServerSideProps } from "next";
import { getSessionUser } from "lib/auth";
import { getTranslations } from "lib/getTranslation";
import { useTranslations } from "use-intl";
import { StatusesArea } from "components/shared/utility-panel/statuses-area";
import { useDotState } from "state/dot-state";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { requestAll } from "lib/utils";
import { ActiveDotUnits } from "components/dispatch/active-units/dot/active-dot-units";
import { WorkOrdersBoard } from "components/dot/work-orders/work-orders-board";
import { Title } from "components/shared/Title";
import { UtilityPanel } from "components/shared/utility-panel/utility-panel";
import { ValueType } from "@snailycad/types";
import { defaultPermissions, Permissions } from "@snailycad/permissions";
import { useLoadValuesClientSide } from "hooks/useLoadValuesClientSide";
import type {
  GetDotActiveWorker,
  GetDotActiveWorkers,
  GetDotWorkOrdersData,
  GetUserData,
} from "@snailycad/types/api";
import { usePermission } from "hooks/usePermission";

interface Props {
  activeWorker: GetDotActiveWorker | null;
  activeDotUnits: GetDotActiveWorkers;
  workOrders: GetDotWorkOrdersData;
  session: GetUserData | null;
}

const NotepadModal = dynamic(
  async () => (await import("components/shared/NotepadModal")).NotepadModal,
  { ssr: false },
);

const SelectDotWorkerModal = dynamic(
  async () => (await import("components/dot/modals/select-dot-worker-modal")).SelectDotWorkerModal,
  { ssr: false },
);

const DepartmentInfoModal = dynamic(async () => {
  return (await import("components/leo/modals/department-info-modal")).DepartmentInformationModal;
});

export default function DotDashboard({ activeWorker, activeDotUnits, workOrders }: Props) {
  useLoadValuesClientSide({
    valueTypes: [ValueType.PENAL_CODE, ValueType.DEPARTMENT, ValueType.DIVISION],
  });

  const setActiveWorker = useDotState((state) => state.setActiveWorker);
  const dispatchState = useDispatchState((state) => ({
    setActiveDotUnits: state.setActiveDotUnits,
  }));
  const t = useTranslations();

  React.useEffect(() => {
    setActiveWorker(activeWorker);
    dispatchState.setActiveDotUnits(activeDotUnits);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDotUnits, activeWorker]);

  return (
    <Layout permissions={{ permissions: [Permissions.Dot] }} className="dark:text-white">
      <Title renderLayoutTitle={false}>{t("Dot.dot")}</Title>

      <DotHeader activeWorker={activeWorker} />

      <WorkOrdersBoard initialWorkOrders={workOrders} />

      <ActiveDotUnits initialWorkers={activeDotUnits} />

      <SelectDotWorkerModal />
      <DotModals />
    </Layout>
  );
}

function DotHeader(props: Pick<Props, "activeWorker">) {
  const state = useDotState();

  const dispatchState = useDispatchState((state) => ({
    activeDotUnits: state.activeDotUnits,
    setActiveDotUnits: state.setActiveDotUnits,
  }));

  return (
    <UtilityPanel>
      <div className="px-4">
        <ModalButtons initialActiveWorker={props.activeWorker} />
      </div>

      <StatusesArea
        setUnits={dispatchState.setActiveDotUnits}
        units={dispatchState.activeDotUnits}
        setActiveUnit={state.setActiveWorker}
        activeUnit={state.activeWorker}
        initialData={props.activeWorker}
      />
    </UtilityPanel>
  );
}

function DotModals() {
  const dotState = useDotState();
  const { hasPermissions } = usePermission();
  const isAdmin = hasPermissions(defaultPermissions.allDefaultAdminPermissions);

  const showModals = isAdmin ? true : dotState.activeWorker;
  if (!showModals) {
    return null;
  }

  return (
    <>
      <NotepadModal />
      <DepartmentInfoModal />
    </>
  );
}

export const getServerSideProps: GetServerSideProps<Props> = async ({ req, locale }) => {
  const user = await getSessionUser(req);
  const [values, activeDotUnits, activeWorker, workOrders] = await requestAll(req, [
    ["/admin/values/codes_10", []],
    ["/dot/active-dot-workers", []],
    ["/dot/active-dot-worker", null],
    ["/dot/work-orders", []],
  ]);

  return {
    props: {
      session: user,
      activeWorker,
      activeDotUnits,
      workOrders,
      values,
      messages: {
        ...(await getTranslations(
          ["leo", "dot", "ems-fd", "citizen", "calls", "common"],
          user?.locale ?? locale,
        )),
      },
    },
  };
};
