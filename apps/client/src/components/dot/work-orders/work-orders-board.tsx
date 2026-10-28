import * as React from "react";
import { useTranslations } from "use-intl";
import { Button, Loader } from "@snailycad/ui";
import {
  PlusCircleFill,
  ExclamationTriangleFill,
  ClipboardCheckFill,
  ConeStriped,
} from "react-bootstrap-icons";
import { classNames } from "lib/classNames";
import { useModal } from "state/modalState";
import { ModalIds } from "types/modal-ids";
import { usePermission, Permissions } from "hooks/usePermission";
import { useDotState } from "state/dot-state";
import { useDotWorkOrders } from "hooks/dot/use-dot-work-orders";
import { ManageDotWorkOrderModal } from "./manage-work-order-modal";
import { WorkOrderCard } from "./work-order-card";
import useFetch from "lib/useFetch";
import type { DotWorkOrderStatus } from "@snailycad/types";
import type { GetDotWorkOrdersData, PutDotWorkOrderByIdData } from "@snailycad/types/api";

interface WorkOrderPatch {
  status?: DotWorkOrderStatus;
  assignedWorkerId?: string;
}

interface Props {
  initialWorkOrders?: GetDotWorkOrdersData;
}

const STATUS_COLUMNS = ["OPEN", "IN_PROGRESS", "COMPLETED"] as const;

export function WorkOrdersBoard({ initialWorkOrders }: Props) {
  const t = useTranslations("Dot");
  const modalState = useModal();
  const { execute } = useFetch();
  const { hasPermissions } = usePermission();
  const activeWorker = useDotState((state) => state.activeWorker);

  const canManage = hasPermissions([Permissions.ManageUnits, Permissions.Dispatch]);
  const canClaim = hasPermissions([Permissions.Dot]) && Boolean(activeWorker);

  const { workOrders, isLoading, refetchWorkOrders } = useDotWorkOrders({
    initialData: initialWorkOrders,
  });

  async function updateWorkOrder(id: string, data: WorkOrderPatch) {
    const { json } = await execute<PutDotWorkOrderByIdData>({
      path: `/dot/work-orders/${id}`,
      method: "PUT",
      data,
    });

    if (json.id) {
      refetchWorkOrders();
    }
  }

  async function deleteWorkOrder(id: string) {
    if (!window.confirm(t("alert_deleteWorkOrder"))) return;

    await execute({ path: `/dot/work-orders/${id}`, method: "DELETE" });
    refetchWorkOrders();
  }

  const openCount = workOrders.filter((w) => w.status === "OPEN").length;
  const inProgressCount = workOrders.filter((w) => w.status === "IN_PROGRESS").length;
  const urgentCount = workOrders.filter(
    (w) => w.priority === "URGENT" && w.status !== "COMPLETED",
  ).length;
  const completedTodayCount = workOrders.filter(
    (w) =>
      w.status === "COMPLETED" &&
      w.completedAt &&
      new Date(w.completedAt).toDateString() === new Date().toDateString(),
  ).length;

  return (
    <section className="card p-4 mt-3">
      <ManageDotWorkOrderModal
        onCreate={() => refetchWorkOrders()}
        onUpdate={() => refetchWorkOrders()}
      />

      <header className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="font-semibold text-xl">{t("workOrders")}</h2>
          <p className="text-sm text-neutral-600 dark:text-gray-400">{t("workOrdersIntro")}</p>
        </div>
        <Button
          onPress={() => modalState.openModal(ModalIds.ManageDotWorkOrder, null)}
          className="flex items-center gap-1.5"
        >
          <PlusCircleFill /> {t("createWorkOrder")}
        </Button>
      </header>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <MiniStat icon={<ConeStriped />} label={t("statusOpen")} value={openCount} accent="blue" />
        <MiniStat
          icon={<ConeStriped />}
          label={t("statusInProgress")}
          value={inProgressCount}
          accent="amber"
        />
        <MiniStat
          icon={<ExclamationTriangleFill />}
          label={t("priority_URGENT")}
          value={urgentCount}
          accent="red"
        />
        <MiniStat
          icon={<ClipboardCheckFill />}
          label={t("completedToday")}
          value={completedTodayCount}
          accent="green"
        />
      </div>

      {isLoading && workOrders.length <= 0 ? (
        <Loader />
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {STATUS_COLUMNS.map((status) => {
            const columnOrders = workOrders.filter((w) => w.status === status);

            return (
              <div key={status} className="min-w-0">
                <div className="flex items-center justify-between mb-2 px-0.5">
                  <h3 className="text-sm font-semibold text-neutral-600 dark:text-gray-400">
                    {t(`columnStatus_${status}`)}
                  </h3>
                  <span className="text-xs rounded-full bg-gray-100 dark:bg-quaternary px-2 py-0.5">
                    {columnOrders.length}
                  </span>
                </div>

                <ul className="flex flex-col gap-2 min-h-[4rem]">
                  {columnOrders.length <= 0 ? (
                    <li className="text-sm text-neutral-500 dark:text-gray-400 px-1 py-4 text-center border border-dashed border-gray-300 dark:border-quaternary rounded-lg">
                      {t("noWorkOrdersInColumn")}
                    </li>
                  ) : (
                    columnOrders.map((workOrder) => (
                      <WorkOrderCard
                        key={workOrder.id}
                        workOrder={workOrder}
                        canManage={canManage}
                        canClaim={canClaim}
                        isMine={
                          Boolean(activeWorker) && workOrder.assignedWorkerId === activeWorker?.id
                        }
                        onClaim={() =>
                          activeWorker &&
                          updateWorkOrder(workOrder.id, {
                            assignedWorkerId: activeWorker.id,
                            status: "IN_PROGRESS",
                          })
                        }
                        onAdvance={() =>
                          updateWorkOrder(workOrder.id, {
                            status: workOrder.status === "OPEN" ? "IN_PROGRESS" : "COMPLETED",
                          })
                        }
                        onReopen={() =>
                          updateWorkOrder(workOrder.id, {
                            status: "IN_PROGRESS",
                          })
                        }
                        onEdit={() => modalState.openModal(ModalIds.ManageDotWorkOrder, workOrder)}
                        onDelete={() => deleteWorkOrder(workOrder.id)}
                      />
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

const MINI_STAT_ACCENT_CLASSES = {
  blue: "border-l-blue-500 dark:border-l-blue-400 text-blue-600 dark:text-blue-400 bg-blue-500/10",
  amber:
    "border-l-amber-500 dark:border-l-amber-400 text-amber-600 dark:text-amber-400 bg-amber-500/10",
  red: "border-l-red-500 dark:border-l-red-400 text-red-600 dark:text-red-400 bg-red-500/10",
  green:
    "border-l-green-500 dark:border-l-green-400 text-green-600 dark:text-green-400 bg-green-500/10",
} as const;

function MiniStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: keyof typeof MINI_STAT_ACCENT_CLASSES;
}) {
  const accentClasses = MINI_STAT_ACCENT_CLASSES[accent];
  const [borderClasses, colorClasses] = [
    accentClasses.split(" ").slice(0, 2).join(" "),
    accentClasses.split(" ").slice(2).join(" "),
  ];

  return (
    <div
      className={classNames(
        "rounded-lg border-l-[3px] bg-gray-50 dark:bg-secondary p-3 flex items-center gap-3",
        borderClasses,
      )}
    >
      <span
        className={classNames(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          colorClasses,
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none">{value}</p>
        <p className="text-xs text-neutral-500 dark:text-gray-400 truncate">{label}</p>
      </div>
    </div>
  );
}
