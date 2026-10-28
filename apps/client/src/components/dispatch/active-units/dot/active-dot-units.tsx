import * as React from "react";
import { useTranslations } from "use-intl";
import { Button, HoverCard, HoverCardContent, HoverCardTrigger } from "@snailycad/ui";
import { ManageUnitModal } from "../modals/manage-unit-modal";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import { type ActiveDotWorker, useDotState } from "state/dot-state";
import { useActiveDotUnits } from "hooks/realtime/useActiveDotUnits";
import { useRouter } from "next/router";
import { formatUnitDivisions, makeUnitName } from "lib/utils";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { type CombinedDotUnit, type DotWorker, StatusViewMode } from "@snailycad/types";
import { useAuth } from "context/AuthContext";

import { Table, useAsyncTable, useTableState } from "components/shared/Table";
import { useActiveDispatchers } from "hooks/realtime/use-active-dispatchers";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { UnitRadioChannelModal } from "../modals/unit-radio-channel-modal";
import { useActiveUnitsState } from "state/active-unit-state";
import { ActiveUnitsSearch } from "../active-units-search";
import { ActiveCallColumn } from "../officers/columns/active-call-column";
import { ActiveIncidentColumn } from "../officers/columns/active-incident-column";
import { DotWorkerColumn } from "./dot-worker-column";
import { useTemporaryItem } from "hooks/shared/useTemporaryItem";
import { useMounted } from "@casperiv/useful";
import { generateContrastColor } from "lib/table/get-contrasting-text-color";
import { isUnitCombinedDot } from "@snailycad/utils";
import { MergeUnitModal } from "../modals/merge-unit-modal";
import type { GetDotActiveWorkers } from "@snailycad/types/api";
import { ActiveDotWorkersHeader } from "./dot-worker-header";

interface Props {
  initialWorkers: (DotWorker | CombinedDotUnit)[];
}

function ActiveDotUnits({ initialWorkers }: Props) {
  const t = useTranslations();
  const common = useTranslations("Common");
  const dotSearch = useActiveUnitsState((state) => state.dotSearch);

  const asyncTable = useAsyncTable({
    search: dotSearch,
    fetchOptions: {
      refetchOnWindowFocus: false,
      pageSize: 12,
      requireFilterText: true,
      path: "/dot/active-dot-workers",
      onResponse: (json: GetDotActiveWorkers) => ({
        data: json,
        totalCount: json.length,
      }),
    },
    initialData: initialWorkers,
    totalCount: initialWorkers.length,
    scrollToTopOnDataChange: false,
  });

  const tableState = useTableState({
    tableId: "active-dot-workers",
    pagination: asyncTable.pagination,
  });

  const { activeDotUnits: _activeDotUnits, setActiveDotUnits } = useActiveDotUnits();
  const modalState = useModal();
  const { generateCallsign } = useGenerateCallsign();
  const { user } = useAuth();
  const { hasActiveDispatchers } = useActiveDispatchers();
  const { DIVISIONS, BADGE_NUMBERS, RADIO_CHANNEL_MANAGEMENT, ACTIVE_INCIDENTS } =
    useFeatureEnabled();

  const isMounted = useMounted();
  const router = useRouter();

  const activeDotUnits = isMounted ? _activeDotUnits : initialWorkers;
  const isDispatch = router.pathname === "/dispatch";

  const { activeWorker, setActiveWorker } = useDotState((state) => ({
    activeWorker: state.activeWorker,
    setActiveWorker: state.setActiveWorker,
  }));

  const [tempWorker, workerState] = useTemporaryItem(activeDotUnits);

  function handleEditClick(worker: ActiveDotWorker) {
    workerState.setTempId(worker.id);
    modalState.openModal(ModalIds.ManageUnit);
  }

  React.useEffect(() => {
    setActiveDotUnits(asyncTable.items);
  }, [asyncTable.items]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="mb-3 rounded-md card">
      <ActiveDotWorkersHeader />
      <ActiveUnitsSearch
        totalCount={initialWorkers.length}
        isLoading={asyncTable.isLoading}
        type="dot"
      />

      {activeDotUnits.length <= 0 ? (
        <p className="px-4 py-2 text-neutral-700 dark:text-gray-300">
          {t("Dot.noActiveWorkers")}
        </p>
      ) : (
        <Table
          tableState={tableState}
          features={{ isWithinCardOrModal: true }}
          containerProps={{ className: "mb-3 px-4" }}
          data={activeDotUnits.map((worker) => {
            const useDot = user?.statusViewMode === StatusViewMode.DOT_COLOR;
            const nameAndCallsign = `${generateCallsign(worker)} ${makeUnitName(worker)}`;

            const backgroundColor = worker.status?.color;
            const textColor = worker.status?.textColor;
            const color =
              backgroundColor && !useDot
                ? textColor || generateContrastColor(backgroundColor)
                : textColor;

            return {
              id: worker.id,
              rowProps: {
                style: {
                  backgroundColor: !useDot && backgroundColor ? backgroundColor : undefined,
                  color,
                },
              },
              name: nameAndCallsign,
              worker: (
                <DotWorkerColumn
                  useDot={useDot}
                  textColor={textColor}
                  worker={worker}
                  isDispatch={isDispatch}
                  nameAndCallsign={nameAndCallsign}
                  setTempUnit={workerState.setTempId}
                />
              ),
              badgeNumberString: !isUnitCombinedDot(worker) && worker.badgeNumberString,
              department:
                (!isUnitCombinedDot(worker) && worker.department?.value.value) ?? common("none"),
              division: !isUnitCombinedDot(worker) && formatUnitDivisions(worker),
              rank: (!isUnitCombinedDot(worker) && worker.rank?.value) ?? common("none"),
              status: (
                <span className="flex items-center">
                  {useDot && color ? (
                    <span
                      style={{ background: color }}
                      className="block w-3 h-3 mr-2 rounded-full"
                    />
                  ) : null}
                  {worker.status?.value?.value}
                </span>
              ),
              vehicle: worker.activeVehicle ? (
                <HoverCard>
                  <HoverCardTrigger>{worker.activeVehicle.value.value}</HoverCardTrigger>
                  <HoverCardContent>
                    {worker.activeVehicle.description ?? worker.activeVehicle.value.value}
                  </HoverCardContent>
                </HoverCard>
              ) : (
                common("none")
              ),
              incident: (
                <ActiveIncidentColumn
                  unitId={worker.id}
                  isDispatch={isDispatch}
                  incidentId={worker.activeIncidentId}
                />
              ),
              activeCall: (
                <ActiveCallColumn
                  unitId={worker.id}
                  isDispatch={isDispatch}
                  callId={worker.activeCallId}
                  size="sm"
                />
              ),
              radioChannel: <UnitRadioChannelModal type="dot" unit={worker} />,
              actions: isDispatch ? (
                <Button
                  disabled={!hasActiveDispatchers}
                  onPress={() => handleEditClick(worker)}
                  size="xs"
                  variant="success"
                >
                  {common("manage")}
                </Button>
              ) : null,
            };
          })}
          columns={[
            { header: t("Dot.worker"), accessorKey: "worker" },
            BADGE_NUMBERS
              ? { header: t("Leo.badgeNumber"), accessorKey: "badgeNumberString" }
              : null,
            { header: t("Leo.department"), accessorKey: "department" },
            DIVISIONS ? { header: t("Leo.division"), accessorKey: "division" } : null,
            { header: t("Leo.rank"), accessorKey: "rank" },
            { header: t("Leo.status"), accessorKey: "status" },
            { header: t("Ems.emergencyVehicle"), accessorKey: "vehicle" },
            ACTIVE_INCIDENTS ? { header: t("Leo.incident"), accessorKey: "incident" } : null,
            { header: t("Leo.activeCall"), accessorKey: "activeCall" },
            RADIO_CHANNEL_MANAGEMENT
              ? { header: t("Leo.radioChannel"), accessorKey: "radioChannel" }
              : null,
            isDispatch ? { header: common("actions"), accessorKey: "actions" } : null,
          ]}
        />
      )}

      {tempWorker ? (
        <ManageUnitModal type="dot" onClose={() => workerState.setTempId(null)} unit={tempWorker} />
      ) : null}
      {tempWorker && !isUnitCombinedDot(tempWorker) ? (
        <MergeUnitModal
          type="dot"
          isDispatch={isDispatch}
          unit={tempWorker}
          onClose={() => workerState.setTempId(null)}
          activeUnit={activeWorker}
          activeUnits={activeDotUnits}
          setActiveUnits={setActiveDotUnits}
          setActiveUnit={setActiveWorker}
        />
      ) : null}
    </div>
  );
}

const ActiveDotUnitsMemoized = React.memo(ActiveDotUnits);
export { ActiveDotUnitsMemoized as ActiveDotUnits };
