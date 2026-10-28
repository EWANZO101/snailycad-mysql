import * as React from "react";
import { useListener } from "@casperiv/use-socket.io";
import { SocketEvents } from "@snailycad/config";
import { useAuth } from "context/AuthContext";
import useFetch from "lib/useFetch";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { useDotState } from "state/dot-state";
import type { CombinedDotUnit, DotWorker } from "@snailycad/types";
import type { GetDotActiveWorkers } from "@snailycad/types/api";
import { useCall911State } from "state/dispatch/call-911-state";
import { isUnitCombinedDot } from "@snailycad/utils";
import { useActiveIncidents } from "./useActiveIncidents";
import { useMapPlayersStore } from "./use-map-players";
import { findPlayerFromUnit } from "lib/map/create-map-units-from-active-units.ts";
import { useQuery } from "@tanstack/react-query";

export function useActiveDotUnits() {
  const { user } = useAuth();
  const { activeDotUnits, setActiveDotUnits } = useDispatchState((state) => ({
    activeDotUnits: state.activeDotUnits,
    setActiveDotUnits: state.setActiveDotUnits,
  }));
  const { state, execute } = useFetch();
  const setActiveWorker = useDotState((state) => state.setActiveWorker);
  const playerState = useMapPlayersStore();

  const incidentsState = useActiveIncidents();
  const call911State = useCall911State((state) => ({
    calls: state.calls,
    setCalls: state.setCalls,
  }));

  const handleIncidentsState = React.useCallback(
    (data: DotWorker[]) => {
      const updatedIncidents = [...incidentsState.activeIncidents].map((incident) => {
        const newUnitsInvolved = [...incident.unitsInvolved].map((assignedUnit) => {
          const unitIds = [assignedUnit.dotWorkerId, assignedUnit.combinedDotId];
          const worker = data.find((v) => unitIds.includes(v.id));

          if (worker) {
            return {
              ...assignedUnit,
              unit: worker,
            };
          }

          return assignedUnit;
        });

        incident.unitsInvolved = newUnitsInvolved;

        return incident;
      });

      incidentsState.setActiveIncidents(updatedIncidents);
    },
    [incidentsState.activeIncidents], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleCallsState = React.useCallback(
    (data: DotWorker[]) => {
      const updatedCalls = [...call911State.calls].map((call) => {
        const newAssignedUnits = [...call.assignedUnits].map((assignedUnit) => {
          const unitIds = [assignedUnit.dotWorkerId, assignedUnit.combinedDotId];
          const worker = data.find((v) => unitIds.includes(v.id));

          if (worker) {
            return { ...assignedUnit, unit: worker };
          }

          return assignedUnit;
        });

        call.assignedUnits = newAssignedUnits;

        return call;
      });

      call911State.setCalls(updatedCalls);
    },
    [call911State.calls], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handleState = React.useCallback(
    (activeDotUnitsData: (DotWorker | CombinedDotUnit)[]) => {
      setActiveDotUnits(activeDotUnitsData);

      const activeWorker = activeDotUnitsData.find((v) => {
        if (isUnitCombinedDot(v)) {
          return v.workers.some((v) => v.userId === user?.id);
        }

        return v.userId === user?.id;
      });

      if (activeWorker) {
        setActiveWorker(activeWorker);
      }

      // update the player state with the unit
      const players = Array.from(playerState.players.values());
      const newPlayers = playerState.players;

      for (const player of players) {
        const worker = activeDotUnitsData.find((worker) => findPlayerFromUnit(player, worker));
        if (worker) {
          newPlayers.set(player.identifier, { ...player, unit: worker });
        }
      }

      playerState.setPlayers(newPlayers);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id],
  );

  const query = useQuery({
    queryKey: ["dot-active-workers"],
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

  useListener(SocketEvents.UpdateDotStatus, (data: DotWorker[] | null) => {
    if (data && Array.isArray(data)) {
      handleState(data);
      handleCallsState(data);
      handleIncidentsState(data);
    } else {
      query.refetch();
    }
  });

  return { activeDotUnits, setActiveDotUnits, state };
}
