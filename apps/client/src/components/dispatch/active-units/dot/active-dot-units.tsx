import * as React from "react";
import { useTranslations } from "use-intl";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@snailycad/ui";
import { useActiveDotUnits } from "hooks/realtime/useActiveDotUnits";
import { formatUnitDivisions, makeUnitName } from "lib/utils";
import { useGenerateCallsign } from "hooks/useGenerateCallsign";
import type { CombinedDotUnit, DotWorker } from "@snailycad/types";
import { Table, useTableState } from "components/shared/Table";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { isUnitCombinedDot } from "@snailycad/utils";
import type { GetDotActiveWorkers } from "@snailycad/types/api";

interface Props {
  initialWorkers: (DotWorker | CombinedDotUnit)[];
}

function ActiveDotUnits({ initialWorkers }: Props) {
  const t = useTranslations();
  const common = useTranslations("Common");

  const tableState = useTableState({ tableId: "active-dot-units" });
  const { activeDotUnits: _activeDotUnits } = useActiveDotUnits();
  const { generateCallsign } = useGenerateCallsign();
  const { DIVISIONS, BADGE_NUMBERS } = useFeatureEnabled();

  const activeDotUnits: GetDotActiveWorkers = _activeDotUnits.length
    ? _activeDotUnits
    : initialWorkers;

  return (
    <div className="mb-3 rounded-md card">
      <header className="p-2 px-4 bg-gray-200 dark:bg-secondary flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("Dot.activeWorkers")}</h1>
      </header>

      {activeDotUnits.length <= 0 ? (
        <p className="px-4 py-2 text-neutral-700 dark:text-gray-300">{t("Dot.noActiveWorkers")}</p>
      ) : (
        <Table
          tableState={tableState}
          features={{ isWithinCardOrModal: true }}
          containerProps={{ className: "mb-3 px-4" }}
          data={activeDotUnits.map((worker) => {
            const nameAndCallsign = `${generateCallsign(worker)} ${makeUnitName(worker)}`;

            return {
              id: worker.id,
              name: nameAndCallsign,
              badgeNumberString: !isUnitCombinedDot(worker) && worker.badgeNumberString,
              department:
                (!isUnitCombinedDot(worker) && worker.department?.value.value) ?? common("none"),
              division: !isUnitCombinedDot(worker) && formatUnitDivisions(worker),
              rank: (!isUnitCombinedDot(worker) && worker.rank?.value) ?? common("none"),
              status: worker.status?.value?.value ?? common("none"),
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
            };
          })}
          columns={[
            { header: t("Dot.worker"), accessorKey: "name" },
            BADGE_NUMBERS
              ? { header: t("Leo.badgeNumber"), accessorKey: "badgeNumberString" }
              : null,
            { header: t("Leo.department"), accessorKey: "department" },
            DIVISIONS ? { header: t("Leo.division"), accessorKey: "division" } : null,
            { header: t("Leo.rank"), accessorKey: "rank" },
            { header: t("Leo.status"), accessorKey: "status" },
            { header: t("Ems.emergencyVehicle"), accessorKey: "vehicle" },
          ]}
        />
      )}
    </div>
  );
}

const ActiveDotUnitsMemoized = React.memo(ActiveDotUnits);
export { ActiveDotUnitsMemoized as ActiveDotUnits };
