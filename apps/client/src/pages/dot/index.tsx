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
import { ActiveOfficers } from "components/dispatch/active-units/officers/active-officers";
import { ActiveDeputies } from "components/dispatch/active-units/deputies/active-deputies";
import { ActiveDotUnits } from "components/dispatch/active-units/dot/active-dot-units";
import { WorkOrdersBoard } from "components/dot/work-orders/work-orders-board";
import { useSignal100 } from "hooks/shared/useSignal100";
import { Title } from "components/shared/Title";
import { UtilityPanel } from "components/shared/utility-panel/utility-panel";
import { ActiveToneType, DashboardLayoutCardType, ValueType } from "@snailycad/types";
import { defaultPermissions, Permissions } from "@snailycad/permissions";
import { usePanicButton } from "hooks/shared/usePanicButton";
import { useTones } from "hooks/global/use-tones";
import { useLoadValuesClientSide } from "hooks/useLoadValuesClientSide";
import type {
  Get911CallsData,
  GetActiveOfficersData,
  GetEmsFdActiveDeputies,
  GetDotActiveWorker,
  GetDotActiveWorkers,
  GetDotWorkOrdersData,
  GetUserData,
} from "@snailycad/types/api";
import { useCall911State } from "state/dispatch/call-911-state";
import { usePermission } from "hooks/usePermission";
import { useAuth } from "context/AuthContext";

interface Props {
  activeWorker: GetDotActiveWorker | null;
  activeDotUnits: GetDotActiveWorkers;
  activeDeputies: GetEmsFdActiveDeputies;
  activeOfficers: GetActiveOfficersData;
  workOrders: GetDotWorkOrdersData;
  calls: Get911CallsData;
  session: GetUserData | null;
}

const NotepadModal = dynamic(
  async () => (await import("components/shared/NotepadModal")).NotepadModal,
  { ssr: false },
);

const SelectDotWorkerModal = dynamic(
  async () => (await import("components/dot/modals/select-unit-modal")).SelectDotWorkerModal,
  { ssr: false },
);

const DepartmentInfoModal = dynamic(async () => {
  return (await import("components/leo/modals/department-info-modal")).DepartmentInformationModal;
});

export default function DotDashboard({
  activeWorker,
  calls,
  activeOfficers,
  activeDeputies,
  activeDotUnits,
  workOrders,
  session: _session,
}: Props) {
  useLoadValuesClientSide({
    valueTypes: [
      ValueType.PENAL_CODE,
      ValueType.IMPOUND_LOT,
      ValueType.DEPARTMENT,
      ValueType.DIVISION,
    ],
  });

  const setActiveWorker = useDotState((state) => state.setActiveWorker);
  const dispatchState = useDispatchState((state) => ({
    setBolos: state.setBolos,
    setActiveOfficers: state.setActiveOfficers,
    setActiveDeputies: state.setActiveDeputies,
    setActiveDotUnits: state.setActiveDotUnits,
  }));
  const set911Calls = useCall911State((state) => state.setCalls);
  const t = useTranslations();
  const { user } = useAuth();
  const session = user ?? _session;

  React.useEffect(() => {
    setActiveWorker(activeWorker);
    set911Calls(calls.calls);
    dispatchState.setActiveDotUnits(activeDotUnits);
    dispatchState.setActiveDeputies(activeDeputies);
    dispatchState.setActiveOfficers(activeOfficers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDotUnits, activeWorker, calls]);

  const cards = [
    {
      type: DashboardLayoutCardType.ACTIVE_DOT,
      isEnabled: true,
      children: <ActiveDotUnits initialWorkers={activeDotUnits} />,
    },
    {
      type: DashboardLayoutCardType.ACTIVE_DEPUTIES,
      isEnabled: true,
      children: <ActiveDeputies initialDeputies={activeDeputies} />,
    },
    {
      type: DashboardLayoutCardType.ACTIVE_OFFICERS,
      isEnabled: true,
      children: <ActiveOfficers initialOfficers={activeOfficers} />,
    },
  ];

  const layoutOrder = session?.dotLayoutOrder ?? [];
  const sortedCards = cards.sort((a, b) => {
    return layoutOrder.indexOf(a.type) - layoutOrder.indexOf(b.type);
  });

  return (
    <Layout permissions={{ permissions: [Permissions.Dot] }} className="dark:text-white">
      <Title renderLayoutTitle={false}>{t("Dot.dot")}</Title>

      <DotHeader activeWorker={activeWorker} />

      <WorkOrdersBoard initialWorkOrders={workOrders} />

      {sortedCards.map((card) =>
        card.isEnabled ? <React.Fragment key={card.type}>{card.children}</React.Fragment> : null,
      )}

      <SelectDotWorkerModal />
      <DotModals />
    </Layout>
  );
}

function DotHeader(props: Pick<Props, "activeWorker">) {
  const signal100 = useSignal100();
  const tones = useTones(ActiveToneType.SHARED);
  const panic = usePanicButton();
  const state = useDotState();

  const dispatchState = useDispatchState((state) => ({
    activeDotUnits: state.activeDotUnits,
    setActiveDotUnits: state.setActiveDotUnits,
  }));

  return (
    <>
      <signal100.Component enabled={signal100.enabled} audio={signal100.audio} />
      <panic.Component audio={panic.audio} unit={panic.unit} />
      <tones.Component audio={tones.audio} description={tones.description} user={tones.user} />

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
    </>
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
  const [values, calls, activeDeputies, activeOfficers, activeDotUnits, activeWorker, workOrders] =
    await requestAll(req, [
      ["/admin/values/codes_10", []],
      ["/911-calls", { calls: [], totalCount: 0 }],
      ["/ems-fd/active-deputies", []],
      ["/leo/active-officers", []],
      ["/dot/active-dot-workers", []],
      ["/dot/active-dot-worker", null],
      ["/dot/work-orders", []],
    ]);

  return {
    props: {
      session: user,
      activeWorker,
      activeDotUnits,
      activeDeputies,
      activeOfficers,
      workOrders,
      calls,
      values,
      messages: {
        ...(await getTranslations(
          ["leo", "dot", "ems-fd", "citizen", "calls", "common", "radio"],
          user?.locale ?? locale,
        )),
      },
    },
  };
};
