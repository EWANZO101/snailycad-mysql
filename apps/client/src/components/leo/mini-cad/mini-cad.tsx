import * as React from "react";
import { Button } from "@snailycad/ui";
import type { Post911CallAssignUnAssign } from "@snailycad/types/api";
import { ChevronLeft, ChevronRight, Gear, X } from "react-bootstrap-icons";
import { useTranslations } from "use-intl";
import { classNames } from "lib/classNames";
import useFetch from "lib/useFetch";
import { type Full911Call, useCall911State } from "state/dispatch/call-911-state";

type Position = "bottom-right" | "bottom-left" | "top-right" | "top-left";

interface MiniCadSettings {
  isEnabled: boolean;
  position: Position;
  keys: { previous: string; next: string; attach: string };
}

const DEFAULT_SETTINGS: MiniCadSettings = {
  isEnabled: false,
  position: "bottom-right",
  keys: { previous: "ArrowLeft", next: "ArrowRight", attach: "ArrowUp" },
};

const STORAGE_KEY = "snailycad.mini-cad";

const POSITION_CLASSES: Record<Position, string> = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-right": "top-20 right-4",
  "top-left": "top-20 left-4",
};

/** settings are per browser (e.g. the in-game browser), so each player can set their own keys */
function useMiniCadSettings() {
  const [settings, setSettings] = React.useState<MiniCadSettings>(DEFAULT_SETTINGS);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<MiniCadSettings>;
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          keys: { ...DEFAULT_SETTINGS.keys, ...parsed.keys },
        });
      }
    } catch {
      // storage unavailable or corrupted: use the defaults
    }
  }, []);

  const update = React.useCallback((patch: Partial<MiniCadSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable: the setting only lasts for this page
      }
      return next;
    });
  }, []);

  return [settings, update] as const;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
    Boolean(target.closest("[role='dialog']"))
  );
}

function formatKey(key: string) {
  const names: Record<string, string> = {
    ArrowLeft: "←",
    ArrowRight: "→",
    ArrowUp: "↑",
    ArrowDown: "↓",
    " ": "Space",
  };
  return names[key] ?? (key.length === 1 ? key.toUpperCase() : key);
}

interface Props {
  /** the active officer, deputy or combined unit */
  unitId: string;
}

/**
 * a compact panel with the latest 911 calls, for use next to the game. Toggle it from the dashboard;
 * navigate with the arrow keys (editable) and attach to the shown call.
 */
export function MiniCad({ unitId }: Props) {
  const t = useTranslations("MiniCad");
  const [settings, updateSettings] = useMiniCadSettings();
  const [isEditing, setIsEditing] = React.useState(false);

  return (
    <>
      <Button
        size="sm"
        className="h-8"
        variant={settings.isEnabled ? "blue" : "default"}
        onPress={() => updateSettings({ isEnabled: !settings.isEnabled })}
      >
        {t("miniCad")}
      </Button>

      {settings.isEnabled ? (
        <MiniCadPanel
          unitId={unitId}
          settings={settings}
          updateSettings={updateSettings}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
        />
      ) : null}
    </>
  );
}

interface PanelProps {
  unitId: string;
  settings: MiniCadSettings;
  updateSettings(patch: Partial<MiniCadSettings>): void;
  isEditing: boolean;
  setIsEditing(value: boolean): void;
}

function MiniCadPanel({ unitId, settings, updateSettings, isEditing, setIsEditing }: PanelProps) {
  const t = useTranslations("MiniCad");
  const { execute, state } = useFetch();
  const { calls, setCalls } = useCall911State((state) => ({
    calls: state.calls,
    setCalls: state.setCalls,
  }));

  // oldest -> newest, so "previous" goes back in time
  const sortedCalls = React.useMemo(
    () =>
      calls
        .filter((call) => !call.ended)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [calls],
  );

  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const latestId = sortedCalls[sortedCalls.length - 1]?.id ?? null;
  const previousLatestId = React.useRef(latestId);

  // jump to a new call when it comes in
  React.useEffect(() => {
    if (latestId !== previousLatestId.current) {
      previousLatestId.current = latestId;
      setSelectedId(latestId);
    }
  }, [latestId]);

  const foundIndex = sortedCalls.findIndex((call) => call.id === selectedId);
  const index = foundIndex === -1 ? sortedCalls.length - 1 : foundIndex;
  const call = sortedCalls[index] as Full911Call | undefined;
  const isAttached = call?.assignedUnits.some((assigned) => assigned.unit?.id === unitId) ?? false;

  const goTo = React.useCallback(
    (offset: number) => {
      const target = sortedCalls[index + offset];
      if (target) setSelectedId(target.id);
    },
    [sortedCalls, index],
  );

  const setAttached = React.useCallback(
    async (attach: boolean) => {
      if (!call || state === "loading") return;

      const { json } = await execute<Post911CallAssignUnAssign>({
        path: `/911-calls/${attach ? "assign" : "unassign"}/${call.id}`,
        method: "POST",
        data: { unit: unitId },
      });

      if (json?.id) {
        setCalls(calls.map((c) => (c.id === json.id ? { ...c, ...json } : c)));
      }
    },
    [call, calls, execute, setCalls, state, unitId],
  );

  React.useEffect(() => {
    if (isEditing) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return;

      if (event.key === settings.keys.previous) {
        event.preventDefault();
        goTo(-1);
      } else if (event.key === settings.keys.next) {
        event.preventDefault();
        goTo(1);
      } else if (event.key === settings.keys.attach) {
        event.preventDefault();
        if (!isAttached) setAttached(true);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [settings.keys, goTo, setAttached, isAttached, isEditing]);

  return (
    <aside
      aria-label={t("miniCad")}
      className={classNames(
        "fixed z-40 w-80 max-w-[calc(100vw-2rem)] rounded-lg shadow-xl",
        "bg-white/95 dark:bg-tertiary/95 backdrop-blur border border-gray-200 dark:border-quaternary",
        POSITION_CLASSES[settings.position],
      )}
    >
      <header className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-quaternary">
        <h2 className="font-semibold text-sm">
          {t("miniCad")}
          {sortedCalls.length > 0 ? (
            <span className="ml-2 font-normal text-neutral-500 dark:text-gray-400">
              {index + 1}/{sortedCalls.length}
            </span>
          ) : null}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            size="xs"
            variant="transparent"
            aria-label={t("settings")}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Gear aria-hidden />
          </Button>
          <Button
            size="xs"
            variant="transparent"
            aria-label={t("close")}
            onPress={() => updateSettings({ isEnabled: false })}
          >
            <X aria-hidden />
          </Button>
        </div>
      </header>

      {isEditing ? (
        <MiniCadSettingsForm settings={settings} updateSettings={updateSettings} />
      ) : call ? (
        <div className="px-3 py-2 text-sm flex flex-col gap-1">
          <p className="flex items-center justify-between gap-2">
            <span className="font-semibold">#{call.caseNumber}</span>
            <span className="text-neutral-500 dark:text-gray-400">
              {new Date(call.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </p>
          {call.type?.value.value || call.situationCode?.value.value ? (
            <p className="font-medium">
              {[call.type?.value.value, call.situationCode?.value.value]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <p>
            {call.location}
            {call.postal ? ` (${call.postal})` : ""}
          </p>
          {call.description ? (
            <p className="text-neutral-600 dark:text-gray-400 line-clamp-2">{call.description}</p>
          ) : null}
          <p className="text-neutral-600 dark:text-gray-400">
            {t("unitsAttached", { count: call.assignedUnits.length })}
          </p>

          <footer className="flex items-center justify-between gap-2 mt-1">
            <Button
              size="xs"
              aria-label={t("previous")}
              onPress={() => goTo(-1)}
              isDisabled={index <= 0}
            >
              <ChevronLeft aria-hidden />
            </Button>
            <Button
              size="xs"
              variant={isAttached ? "danger" : "success"}
              onPress={() => setAttached(!isAttached)}
              isDisabled={state === "loading"}
            >
              {isAttached ? t("detach") : `${t("attach")} (${formatKey(settings.keys.attach)})`}
            </Button>
            <Button
              size="xs"
              aria-label={t("next")}
              onPress={() => goTo(1)}
              isDisabled={index >= sortedCalls.length - 1}
            >
              <ChevronRight aria-hidden />
            </Button>
          </footer>
        </div>
      ) : (
        <p className="px-3 py-3 text-sm text-neutral-600 dark:text-gray-400">{t("noCalls")}</p>
      )}
    </aside>
  );
}

function MiniCadSettingsForm({
  settings,
  updateSettings,
}: Pick<PanelProps, "settings" | "updateSettings">) {
  const t = useTranslations("MiniCad");
  const [listeningFor, setListeningFor] = React.useState<keyof MiniCadSettings["keys"] | null>(
    null,
  );

  React.useEffect(() => {
    if (!listeningFor) return;

    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      if (event.key !== "Escape") {
        updateSettings({ keys: { ...settings.keys, [listeningFor!]: event.key } });
      }
      setListeningFor(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listeningFor, settings.keys, updateSettings]);

  const positions: Position[] = ["top-left", "top-right", "bottom-left", "bottom-right"];

  return (
    <div className="px-3 py-2 text-sm flex flex-col gap-2">
      <p className="font-semibold">{t("keybinds")}</p>
      {(["previous", "next", "attach"] as const).map((action) => (
        <div key={action} className="flex items-center justify-between gap-2">
          <span>{t(action)}</span>
          <Button size="xs" onPress={() => setListeningFor(action)}>
            {listeningFor === action ? t("pressAKey") : formatKey(settings.keys[action])}
          </Button>
        </div>
      ))}

      <p className="font-semibold mt-1">{t("position")}</p>
      <div className="grid grid-cols-2 gap-1">
        {positions.map((position) => (
          <Button
            key={position}
            size="xs"
            variant={settings.position === position ? "blue" : "default"}
            onPress={() => updateSettings({ position })}
          >
            {t(position)}
          </Button>
        ))}
      </div>

      <Button
        size="xs"
        variant="transparent"
        className="self-start"
        onPress={() => updateSettings({ keys: DEFAULT_SETTINGS.keys })}
      >
        {t("resetKeybinds")}
      </Button>
    </div>
  );
}
