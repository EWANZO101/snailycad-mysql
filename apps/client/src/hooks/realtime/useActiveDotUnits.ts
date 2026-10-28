import * as React from "react";
import { useAuth } from "context/AuthContext";
import useFetch from "lib/useFetch";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { useDotState } from "state/dot-state";
import type { CombinedDotUnit, DotWorker } from "@snailycad/types";
import type { GetDotActiveWorkers } from "@snailycad/types/api";
import { isUnitCombinedDot } from "@snailycad/utils";
import { useQuery } from "@tanstack/react-query";

/**
 * polling, not socket-based: DOT doesn't emit real-time unit-status events yet (see the comment
 * on `DotController.updateDotWorkerStatus`), so this just refetches on an interval.
 */
export function useActiveDotUnits() {
  const { user } = useAuth();
  const { activeDotUnits, setActiveDotUnits } = useDispatchState((state) => ({
    activeDotUnits: state.activeDotUnits,
    setActiveDotUnits: state.setActiveDotUnits,
  }));
  const { execute } = useFetch();
  const setActiveWorker = useDotState((state) => state.setActiveWorker);

  const handleState = React.useCallback(
    (data: (DotWorker | CombinedDotUnit)[]) => {
      setActiveDotUnits(data);

      const activeWorker = data.find((v) => {
        if (isUnitCombinedDot(v)) {
          return v.workers.some((w) => w.userId === user?.id);
        }

        return (v as DotWorker).userId === user?.id;
      });

      if (activeWorker) {
        setActiveWorker(activeWorker);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );

  const query = useQuery({
    queryKey: ["dot-active-workers"],
    refetchInterval: 15_000,
    queryFn: async () => {
      const { json } = await execute<GetDotActiveWorkers>({
        path: "/dot/active-dot-workers",
        noToast: true,
      });

      if (json && Array.isArray(json)) {
        handleState(json);
        return json;
      }

      return [];
    },
  });

  return { activeDotUnits, setActiveDotUnits, isLoading: query.isPending };
}
