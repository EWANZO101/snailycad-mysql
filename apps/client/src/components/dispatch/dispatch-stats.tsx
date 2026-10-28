import * as React from "react";
import {
  BroadcastPin,
  ExclamationTriangleFill,
  HeartPulseFill,
  MegaphoneFill,
  ShieldFill,
  TelephoneFill,
} from "react-bootstrap-icons";
import { useDispatchState } from "state/dispatch/dispatch-state";
import { useCall911State } from "state/dispatch/call-911-state";
import { useActiveDispatchers } from "hooks/realtime/use-active-dispatchers";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { classNames } from "lib/classNames";

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: "blue" | "red" | "amber" | "green" | "purple" | "gray";
}

const ACCENT_CLASSES: Record<StatTileProps["accent"], string> = {
  blue: "text-blue-600 dark:text-blue-400 bg-blue-500/10",
  red: "text-red-600 dark:text-red-400 bg-red-500/10",
  amber: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  green: "text-green-600 dark:text-green-400 bg-green-500/10",
  purple: "text-purple-600 dark:text-purple-400 bg-purple-500/10",
  gray: "text-neutral-600 dark:text-gray-300 bg-neutral-500/10",
};

function StatTile({ icon, label, value, accent }: StatTileProps) {
  return (
    <div className="dispatch-stat-tile">
      <div className="flex items-center justify-between">
        <span className="dispatch-stat-label">{label}</span>
        <span
          className={classNames(
            "flex items-center justify-center w-7 h-7 rounded-lg shrink-0",
            ACCENT_CLASSES[accent],
          )}
        >
          {icon}
        </span>
      </div>
      <span className="dispatch-stat-value">{value}</span>
    </div>
  );
}

export function DispatchStats() {
  const { CALLS_911, ACTIVE_INCIDENTS, ACTIVE_DISPATCHERS } = useFeatureEnabled();

  const calls = useCall911State((state) => state.calls);
  const dispatchState = useDispatchState((state) => ({
    activeIncidents: state.activeIncidents,
    activeOfficers: state.activeOfficers,
    activeDeputies: state.activeDeputies,
    bolos: state.bolos,
  }));
  const { activeDispatchersCount } = useActiveDispatchers();

  return (
    <div className="dispatch-stats">
      {CALLS_911 ? (
        <StatTile
          icon={<TelephoneFill size={14} />}
          label="Active Calls"
          value={calls.length}
          accent="blue"
        />
      ) : null}
      {ACTIVE_INCIDENTS ? (
        <StatTile
          icon={<ExclamationTriangleFill size={14} />}
          label="Active Incidents"
          value={dispatchState.activeIncidents.length}
          accent="red"
        />
      ) : null}
      <StatTile
        icon={<ShieldFill size={14} />}
        label="Active Officers"
        value={dispatchState.activeOfficers.length}
        accent="green"
      />
      <StatTile
        icon={<HeartPulseFill size={14} />}
        label="Active EMS/FD"
        value={dispatchState.activeDeputies.length}
        accent="purple"
      />
      <StatTile
        icon={<MegaphoneFill size={14} />}
        label="Open BOLOs"
        value={dispatchState.bolos.length}
        accent="amber"
      />
      {ACTIVE_DISPATCHERS ? (
        <StatTile
          icon={<BroadcastPin size={14} />}
          label="Active Dispatchers"
          value={activeDispatchersCount}
          accent="gray"
        />
      ) : null}
    </div>
  );
}
