import * as React from "react";
import { useImageUrl } from "hooks/useImageUrl";
import { useValues } from "context/ValuesContext";
import { useUnitStatusChange } from "hooks/shared/useUnitsStatusChange";
import {
  Draggable,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@snailycad/ui";
import { DndActions } from "types/dnd-actions";
import { ActiveUnitsQualificationsCard } from "components/leo/qualifications/ActiveUnitsQualificationsCard";
import { useActiveDotUnits } from "hooks/realtime/useActiveDotUnits";
import { useActiveDispatchers } from "hooks/realtime/use-active-dispatchers";
import type { CombinedDotUnit, DotWorker } from "@snailycad/types";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { isUnitCombinedDot } from "@snailycad/utils";
import { useRouter } from "next/router";
import { type ActiveDotWorker, useDotState } from "state/dot-state";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import { useTranslations } from "use-intl";
import type { PostDispatchStatusUnmergeUnitById } from "@snailycad/types/api";
import useFetch from "lib/useFetch";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import { makeUnitName } from "lib/utils";
import { ArrowRight } from "react-bootstrap-icons";
import { darkenColor, generateContrastColor } from "lib/table/get-contrasting-text-color";
import { classNames } from "lib/classNames";
import { ImageWrapper } from "components/shared/image-wrapper";

interface Props {
  isDispatch: boolean;
  nameAndCallsign: string;
  worker: DotWorker | CombinedDotUnit;
  setTempUnit: React.Dispatch<React.SetStateAction<ActiveDotWorker["id"] | null>>;
  textColor?: string | null;
  useDot: boolean;
}

export function DotWorkerColumn({
  worker,
  isDispatch,
  nameAndCallsign,
  textColor: statusTextColor,
  setTempUnit,
  useDot,
}: Props) {
  const router = useRouter();
  const isDotPage = router.pathname.includes("/dot");
  const isEligiblePage = isDispatch || isDotPage;

  const { activeDotUnits, setActiveDotUnits } = useActiveDotUnits();
  const { hasActiveDispatchers } = useActiveDispatchers();
  const { execute } = useFetch();

  const { setStatus } = useUnitStatusChange({ setUnits: setActiveDotUnits, units: activeDotUnits });
  const { makeImageUrl } = useImageUrl();
  const { codes10 } = useValues();
  const modalState = useModal();
  const { generateCallsign } = useGenerateCallsign();

  const t = useTranslations("Leo");
  const setDraggingUnit = useDispatchState((state) => state.setDraggingUnit);
  const activeWorker = useDotState((state) => state.activeWorker);

  const codesMapped = codes10.values
    .filter((v) => v.type === "STATUS_CODE")
    .map((v) => ({
      name: v.value.value,
      onClick: () => setStatus(worker.id, v),
      "aria-label": `Set status to ${v.value.value}`,
      title: `Set status to ${v.value.value}`,
    }));

  const dispatchCodes = isDispatch ? codesMapped : [];
  const shouldShowSplit = isDispatch
    ? isUnitCombinedDot(worker)
    : isUnitCombinedDot(worker) && worker.id === activeWorker?.id;

  const isCurrentWorker =
    activeWorker &&
    !isUnitCombinedDot(activeWorker) &&
    !isUnitCombinedDot(worker) &&
    activeWorker.id === worker.id;

  const canBeOpened = (isDispatch && hasActiveDispatchers) || !isCurrentWorker || shouldShowSplit;
  const unitStatusColor = worker.status?.color ?? undefined;
  const darkenedUnitStatusColor = unitStatusColor && darkenColor(unitStatusColor, 0.3);
  const textColor = statusTextColor ?? (unitStatusColor && generateContrastColor(unitStatusColor));
  const canDrag = hasActiveDispatchers && isDispatch;

  function handleMerge(worker: ActiveDotWorker) {
    setTempUnit(worker.id);
    modalState.openModal(ModalIds.MergeUnit);
  }

  async function handleunMerge(id: string) {
    const { json } = await execute<PostDispatchStatusUnmergeUnitById>({
      path: `/dispatch/status/unmerge/${id}`,
      data: { id },
      method: "POST",
    });

    if (json) {
      router.replace({
        pathname: router.pathname,
        query: router.query,
      });
    }
  }

  const contextMenuActions = [
    {
      name: shouldShowSplit ? t("unmerge") : t("merge"),
      onClick: () => {
        shouldShowSplit ? void handleunMerge(worker.id) : handleMerge(worker);
      },
    },
    {
      name: t("privateMessage"),
      onClick: () => modalState.openModal(ModalIds.PrivateMessage, worker),
    },
    ...dispatchCodes,
  ];

  const canContextMenuBeOpened = isEligiblePage ? (canBeOpened ?? false) : false;

  return (
    <ContextMenu>
      <ContextMenuTrigger disabled={!canContextMenuBeOpened} asChild>
        <span>
          <Draggable
            onDrag={(isDragging) => setDraggingUnit(isDragging ? "move" : null)}
            canDrag={canDrag}
            item={worker}
            type={DndActions.MoveUnitTo911CallOrIncident}
          >
            {({ isDragging }) => (
              <ActiveUnitsQualificationsCard canBeOpened={!isDragging} unit={worker}>
                <span // * 9 to fix overlapping issues with next table column
                  style={{ minWidth: nameAndCallsign.length * 9 }}
                  className={classNames("capitalize", canDrag ? "cursor-grab" : "cursor-default")}
                >
                  {!isUnitCombinedDot(worker) && worker.imageId ? (
                    <ImageWrapper
                      quality={70}
                      className="rounded-md w-[30px] h-[30px] object-cover mr-2 inline-block"
                      draggable={false}
                      src={makeImageUrl("units", worker.imageId)!}
                      loading="lazy"
                      width={30}
                      height={30}
                      alt={nameAndCallsign}
                    />
                  ) : null}
                  {isUnitCombinedDot(worker) ? (
                    <div className="flex items-center">
                      <span
                        style={{
                          backgroundColor: useDot ? unitStatusColor : darkenedUnitStatusColor,
                          color: textColor,
                        }}
                        className="px-1.5 py-0.5 rounded-md dark:bg-secondary"
                      >
                        {generateCallsign(worker, "pairedUnitTemplate")}
                      </span>
                      <span className="mx-4">
                        <ArrowRight />
                      </span>
                      {worker.workers.map((worker) => (
                        <React.Fragment key={worker.id}>
                          {generateCallsign(worker)} {makeUnitName(worker)} <br />
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <span
                      style={{
                        backgroundColor: useDot ? unitStatusColor : darkenedUnitStatusColor,
                        color: textColor,
                      }}
                      className="px-1.5 py-0.5 rounded-md dark:bg-secondary"
                    >
                      {nameAndCallsign}
                    </span>
                  )}
                </span>
              </ActiveUnitsQualificationsCard>
            )}
          </Draggable>
        </span>
      </ContextMenuTrigger>

      <ContextMenuContent>
        {contextMenuActions.map((action, idx) => (
          <ContextMenuItem key={`${action.name}-${idx}`} onClick={action.onClick}>
            {action.name}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}
