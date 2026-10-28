import * as React from "react";
import { useTranslations } from "use-intl";
import { Button } from "@snailycad/ui";
import formatDistanceToNow from "date-fns/formatDistanceToNow";
import type { DotWorkOrder } from "@snailycad/types";
import { classNames } from "lib/classNames";
import { ArrowRight, PencilFill, PersonFill, TrashFill } from "react-bootstrap-icons";

const PRIORITY_CLASSES = {
  LOW: "bg-gray-100 text-gray-700 dark:bg-quaternary dark:text-gray-300",
  MEDIUM: "bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300",
  HIGH: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  URGENT: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300",
} as const;

const PRIORITY_BORDER_CLASSES = {
  LOW: "border-l-gray-400 dark:border-l-gray-500",
  MEDIUM: "border-l-blue-500 dark:border-l-blue-400",
  HIGH: "border-l-amber-500 dark:border-l-amber-400",
  URGENT: "border-l-red-500 dark:border-l-red-400",
} as const;

interface Props {
  workOrder: DotWorkOrder;
  canManage: boolean;
  canClaim: boolean;
  isMine: boolean;
  onAdvance?(): void;
  onReopen?(): void;
  onClaim?(): void;
  onEdit?(): void;
  onDelete?(): void;
}

export function WorkOrderCard({
  workOrder,
  canManage,
  canClaim,
  isMine,
  onAdvance,
  onReopen,
  onClaim,
  onEdit,
  onDelete,
}: Props) {
  const t = useTranslations("Dot");

  return (
    <li
      className={classNames(
        "card p-3 border-l-[3px] flex flex-col gap-2",
        PRIORITY_BORDER_CLASSES[workOrder.priority],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium leading-snug">{workOrder.title}</p>
        <span
          className={classNames(
            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
            PRIORITY_CLASSES[workOrder.priority],
          )}
        >
          {t(`priority_${workOrder.priority}`)}
        </span>
      </div>

      <p className="text-sm text-neutral-600 dark:text-gray-400">
        {workOrder.location}
        {workOrder.postal ? ` (${t("workOrderPostalShort")} ${workOrder.postal})` : ""}
      </p>

      {workOrder.description ? (
        <p className="text-sm text-neutral-600 dark:text-gray-400 line-clamp-2">
          {workOrder.description}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-2 mt-1 text-xs text-neutral-500 dark:text-gray-400">
        <span className="flex items-center gap-1 min-w-0">
          <PersonFill className="shrink-0" />
          <span className="truncate">
            {workOrder.assignedWorker
              ? `${workOrder.assignedWorker.citizen.name} ${workOrder.assignedWorker.citizen.surname}`
              : t("unassigned")}
          </span>
        </span>
        <span className="shrink-0" title={new Date(workOrder.createdAt).toLocaleString()}>
          {formatDistanceToNow(new Date(workOrder.createdAt), { addSuffix: true })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-1">
        {canClaim && !workOrder.assignedWorker && workOrder.status !== "COMPLETED" ? (
          <Button size="xs" onPress={onClaim} className="flex items-center gap-1">
            <PersonFill /> {t("claimWorkOrder")}
          </Button>
        ) : null}

        {(canManage || isMine) && workOrder.status !== "COMPLETED" ? (
          <Button
            size="xs"
            variant="success"
            onPress={onAdvance}
            className="flex items-center gap-1"
          >
            {workOrder.status === "OPEN" ? t("startWorkOrder") : t("completeWorkOrder")}
            <ArrowRight />
          </Button>
        ) : null}

        {(canManage || isMine) && workOrder.status === "COMPLETED" ? (
          <Button size="xs" variant="amber" onPress={onReopen}>
            {t("reopenWorkOrder")}
          </Button>
        ) : null}

        {canManage ? (
          <>
            <Button size="xs" variant="cancel" onPress={onEdit} className="flex items-center gap-1">
              <PencilFill />
            </Button>
            <Button
              size="xs"
              variant="danger"
              onPress={onDelete}
              className="flex items-center gap-1"
            >
              <TrashFill />
            </Button>
          </>
        ) : null}
      </div>
    </li>
  );
}
