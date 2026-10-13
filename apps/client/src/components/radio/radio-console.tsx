import * as React from "react";
import { useTranslations } from "use-intl";
import type { RadioChannelInfo } from "@snailycad/radio/browser";
import {
  BellFill,
  BoxArrowUpRight,
  Broadcast,
  ChevronDown,
  ChevronUp,
  ExclamationTriangleFill,
  Gear,
  Headphones,
  MicFill,
  People,
  Plus,
  VolumeUpFill,
  XLg,
} from "react-bootstrap-icons";
import { classNames } from "lib/classNames";
import useFetch from "lib/useFetch";
import { type RadioHub, type RadioView, useRadioHub } from "./radio-hub";
import { keyLabel } from "./use-radio";

interface RadioConsoleProps {
  variant: "dock" | "page" | "popout";
  /** dispatchers can play tones on a channel */
  canPlayTones?: boolean;
}

const METER_SEGMENTS = 20;

export function RadioConsole({ variant, canPlayTones }: RadioConsoleProps) {
  const t = useTranslations("Radio");
  const hub = useRadioHub();
  const [isEditing, setIsEditing] = React.useState(false);
  const dock = useDockDrag(hub, variant === "dock");
  const now = useNow(variant === "dock" && hub?.preferences.minimized ? 0 : 10_000);

  if (!hub || hub.role === "off") return null;
  const { view, preferences } = hub;
  const isDock = variant === "dock";
  const runsHere = hub.role === "leader" || hub.role === "single";

  const status = view?.status ?? "connecting";
  const connected = status === "connected";
  const statusLabel = !view
    ? t("connecting")
    : connected
      ? t("connected")
      : status === "reconnecting"
        ? t("reconnecting")
        : status === "closed"
          ? t("disconnected")
          : t("connecting");

  const channels = view?.channels ?? [];
  const transmitChannel = view?.transmitChannel ?? null;
  const simulcast = view?.simulcast ?? [];
  const transmittingOn = view?.transmittingOn ?? [];
  const transmitting = transmittingOn.length > 0;
  const transmitInfo = channels.find((c) => c.id === transmitChannel) ?? null;
  const targets = [transmitChannel, ...simulcast]
    .map((id) => channels.find((c) => c.id === id))
    .filter((c): c is RadioChannelInfo => !!c);
  const talking = activeTalkers(view);
  const listenMode = view?.listenMode ?? preferences.listenMode;
  const listeningCount = view ? Object.keys(view.joined).length : 0;

  const targetText = targets.length
    ? targets.length > 1
      ? t("holdToTalkMulti", { channel: targets[0]!.name, count: targets.length - 1 })
      : targets[0]!.name
    : null;
  const pttLabel = transmitting
    ? t("transmittingOn", { channels: channelNames(channels, transmittingOn) })
    : targetText
      ? t("holdToTalk", { channel: targetText, key: keyLabel(preferences.pttKey) })
      : t("pickChannel");
  const pttText = transmitting
    ? t("transmittingOn", { channels: channelNames(channels, transmittingOn) })
    : targetText
      ? t("holdToTalkOn", { channel: targetText })
      : t("pickChannel");

  const header = (
    <header
      {...(isDock ? dock.handlers : {})}
      title={isDock ? t("dragHint") : undefined}
      className={classNames(
        "flex items-center justify-between gap-2 px-3 py-2 border-b",
        "border-gray-200 dark:border-quaternary bg-gray-50/80 dark:bg-black/20",
        isDock && "select-none touch-none",
        isDock && (dock.dragging ? "cursor-grabbing" : "cursor-grab"),
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={classNames(
            "relative grid place-items-center w-8 h-8 rounded-lg shrink-0 transition-colors",
            transmitting
              ? "bg-red-600 text-white shadow-[0_0_0_3px_rgba(220,38,38,0.25)]"
              : "bg-neutral-900 text-emerald-400 dark:bg-black/60",
          )}
          aria-hidden
        >
          <Broadcast className="w-4 h-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <h2 className="font-semibold text-sm tracking-tight">{t("radio")}</h2>
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-gray-400">
            <span
              className={classNames(
                "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                connected
                  ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.9)]"
                  : status === "closed"
                    ? "bg-red-500"
                    : "bg-amber-500 animate-pulse",
              )}
              title={statusLabel}
            />
            <span className="truncate">
              {statusLabel}
              {connected ? ` · ${t("listeningCount", { count: listeningCount })}` : ""}
              {!runsHere && view?.leaderIsPopout && !hub.isPopout ? ` · ${t("inPopout")}` : ""}
            </span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        {hub.isPopout ? null : (
          <IconButton label={t("popOut")} onClick={hub.popOut}>
            <BoxArrowUpRight />
          </IconButton>
        )}
        <IconButton
          label={t("settings")}
          pressed={isEditing}
          onClick={() => setIsEditing((v) => !v)}
        >
          <Gear />
        </IconButton>
        {isDock ? (
          <IconButton
            label={preferences.minimized ? t("expand") : t("minimize")}
            onClick={() => hub.updatePreferences({ minimized: !preferences.minimized })}
          >
            {preferences.minimized ? <ChevronUp /> : <ChevronDown />}
          </IconButton>
        ) : null}
      </div>
    </header>
  );

  const notices = (
    <>
      {view && !view.audioReady ? (
        <button
          type="button"
          className={classNames(
            "w-full mb-3 rounded-lg px-3 py-2 text-sm text-left flex items-center gap-2",
            "bg-amber-100 text-amber-900 hover:bg-amber-200",
            "dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25",
          )}
          onClick={() => hub.send({ name: "resumeAudio" })}
        >
          <VolumeUpFill className="shrink-0" aria-hidden />
          {runsHere ? t("enableAudio") : t("enableAudioElsewhere")}
        </button>
      ) : null}

      {hub.lastError ? (
        <div
          role="alert"
          className="mb-3 rounded-lg px-3 py-2 text-sm flex items-start justify-between gap-2 bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200"
        >
          <span>{hub.lastError}</span>
          <button
            type="button"
            className="shrink-0 mt-0.5 opacity-70 hover:opacity-100"
            onClick={hub.clearError}
            aria-label={t("dismiss")}
          >
            <XLg className="w-3 h-3" aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );

  // the "screen" of the console: always dark, like the radio's display
  const display = (
    <div
      className={classNames(
        "rounded-xl px-3.5 py-3 mb-3 font-mono text-neutral-100 transition-shadow",
        "bg-gradient-to-b from-neutral-900 to-neutral-950 ring-1",
        transmitting
          ? "ring-red-500/70 shadow-[0_0_24px_-6px_rgba(239,68,68,0.6)]"
          : talking.length
            ? "ring-emerald-500/50"
            : "ring-black/40 dark:ring-white/10",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
        <span>{simulcast.length ? t("simulcast") : t("talkChannel")}</span>
        <span className="flex items-center gap-1.5">
          <StatusLamp label="RX" on={talking.length > 0} color="emerald" />
          <StatusLamp label={t("tx")} on={transmitting} color="red" />
        </span>
      </div>

      <div className="mt-1.5 flex items-baseline justify-between gap-2 min-w-0">
        <p className="font-semibold text-lg truncate tracking-tight text-white">
          {transmitInfo ? transmitInfo.name : t("noTalkChannel")}
        </p>
        {transmitInfo?.frequency ? (
          <span className="text-sm tabular-nums text-emerald-300/90 shrink-0">
            {transmitInfo.frequency}
          </span>
        ) : null}
      </div>
      {simulcast.length ? (
        <p className="mt-0.5 flex flex-wrap gap-1">
          {simulcast.map((id) => {
            const channel = channels.find((c) => c.id === id);
            if (!channel) return null;
            return (
              <span
                key={id}
                className={classNames(
                  "rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide",
                  transmittingOn.includes(id)
                    ? "bg-red-600 text-white"
                    : "bg-white/10 text-neutral-200",
                )}
              >
                + {channel.name}
              </span>
            );
          })}
        </p>
      ) : null}

      <p
        className={classNames(
          "mt-2 text-xs truncate h-4 flex items-center gap-1.5",
          talking.length ? "text-emerald-300" : "text-neutral-500",
        )}
      >
        {talking.length ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="truncate">
              {talking.map((entry) => `${entry.name} · ${entry.channel}`).join("  |  ")}
            </span>
          </>
        ) : (
          t("quiet")
        )}
      </p>
      <LevelMeter level={hub.level} transmitting={transmitting} />
    </div>
  );

  const channelList = (
    <>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500 dark:text-gray-400">
          {t("channels")}
        </h3>
        {channels.length > 1 ? (
          <span className="flex items-center gap-1.5 shrink-0 text-xs">
            <Segmented
              label={t("monitor")}
              value={listenMode}
              options={[
                { value: "all", label: t("listenModeAll") },
                { value: "selected", label: t("listenModeSelected") },
              ]}
              onChange={(mode) => hub.send({ name: "setListenMode", mode })}
            />
          </span>
        ) : null}
      </div>

      {listenMode === "selected" && channels.length > 1 ? (
        <div className="mb-2 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-gray-400">
          <span>{t("selectedCount", { count: listeningCount, total: channels.length })}</span>
          <span className="flex gap-0.5">
            <TextButton onClick={() => hub.send({ name: "listenAll" })}>
              {t("listenAll")}
            </TextButton>
            <TextButton onClick={() => hub.send({ name: "listenNone" })}>
              {t("listenNone")}
            </TextButton>
          </span>
        </div>
      ) : listenMode === "all" && channels.length > 1 ? (
        <p className="mb-2 text-xs text-neutral-500 dark:text-gray-400">{t("monitoringAll")}</p>
      ) : null}

      {simulcast.length ? (
        <div className="mb-2 flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs bg-blue-50 text-blue-900 dark:bg-blue-500/10 dark:text-blue-200">
          <span className="truncate">{t("simulcastOn", { count: targets.length })}</span>
          <TextButton onClick={() => hub.send({ name: "clearSimulcast" })}>
            {t("clearSimulcast")}
          </TextButton>
        </div>
      ) : null}

      {channels.length <= 0 ? (
        <p className="text-sm text-neutral-600 dark:text-gray-400 py-2">
          {connected ? t("noChannels") : statusLabel}
        </p>
      ) : (
        <ul
          className={classNames(
            "flex flex-col gap-1.5",
            variant === "page" && "md:grid md:grid-cols-2 md:gap-2 md:items-start",
          )}
        >
          {channels.map((channel) => (
            <ChannelRow
              key={channel.id}
              hub={hub}
              view={view!}
              now={now}
              channel={channel}
              isTransmitChannel={transmitChannel === channel.id}
              isSimulcast={simulcast.includes(channel.id)}
              canPlayTones={!!canPlayTones}
            />
          ))}
        </ul>
      )}
      <p className="mt-2.5 text-[11px] leading-relaxed text-neutral-500 dark:text-gray-400">
        {t("channelsHintSimulcast")}
      </p>
    </>
  );

  const ptt = (
    <PushToTalkButton
      hub={hub}
      disabled={!connected || !transmitChannel}
      transmitting={transmitting}
      label={pttLabel}
      text={pttText}
      keyName={transmitInfo ? keyLabel(preferences.pttKey) : null}
    />
  );

  const settings = isEditing ? (
    <RadioSettings hub={hub} onClose={() => setIsEditing(false)} />
  ) : null;

  if (variant === "popout") {
    return (
      <section className="flex flex-col h-screen bg-white dark:bg-tertiary">
        {header}
        <div className="flex-1 overflow-y-auto thin-scrollbar p-3">
          {notices}
          {settings}
          {display}
          {channelList}
        </div>
        <footer className="p-3 border-t border-gray-200 dark:border-quaternary">{ptt}</footer>
      </section>
    );
  }

  if (variant === "page") {
    return (
      <section className="card overflow-hidden">
        {header}
        <div className="p-4">
          {notices}
          {settings}
          <div className="md:grid md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)] md:gap-5">
            <div className="md:sticky md:top-4 md:self-start">
              {display}
              {ptt}
            </div>
            <div className="mt-4 md:mt-0">{channelList}</div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <aside
      ref={dock.ref}
      aria-label={t("radio")}
      style={dock.position ? { left: dock.position.x, top: dock.position.y } : undefined}
      className={classNames(
        "fixed z-40 w-[23rem] max-w-[calc(100vw-2rem)] rounded-2xl overflow-hidden",
        "bg-white/95 dark:bg-tertiary/95 backdrop-blur-md border shadow-2xl shadow-black/25 transition-colors",
        transmitting ? "border-red-500/70" : "border-gray-200 dark:border-quaternary",
        dock.dragging && "shadow-black/40 ring-2 ring-blue-500/40",
        !dock.position && "bottom-4",
        !dock.position && (preferences.position === "bottom-right" ? "right-4" : "left-4"),
      )}
    >
      {header}
      {preferences.minimized ? (
        <MinimizedBar hub={hub} label={pttLabel} channelName={targetText} />
      ) : (
        <>
          <div className="p-3 max-h-[min(62vh,34rem)] overflow-y-auto thin-scrollbar">
            {notices}
            {settings}
            {display}
            {channelList}
          </div>
          <div className="px-3 pb-3 pt-2.5 border-t border-gray-200 dark:border-quaternary bg-gray-50/80 dark:bg-black/20">
            {ptt}
          </div>
        </>
      )}
    </aside>
  );
}

/** space kept between the dragged dock and the window edges */
const DOCK_EDGE = 8;

/**
 * Drag the dock by its title bar. The spot is saved in the radio preferences (so every CAD tab
 * shows it there) and kept inside the window when it's resized or the dock grows. Double-click
 * the title bar to put it back in its corner.
 */
function useDockDrag(hub: RadioHub | null, enabled: boolean) {
  const ref = React.useRef<HTMLElement>(null);
  const start = React.useRef<{ pointerX: number; pointerY: number; x: number; y: number } | null>(
    null,
  );
  const [dragPosition, setDragPosition] = React.useState<{ x: number; y: number } | null>(null);
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);
  const saved = hub?.preferences.dockPosition ?? null;

  // re-clamp when the window or the dock changes size (expand, minimize, settings open)
  React.useEffect(() => {
    const element = ref.current;
    if (!enabled || !element) return;
    const handle = () => rerender();
    window.addEventListener("resize", handle);
    const observer = new ResizeObserver(handle);
    observer.observe(element);
    return () => {
      window.removeEventListener("resize", handle);
      observer.disconnect();
    };
  }, [enabled]);

  function clamp(position: { x: number; y: number }) {
    const width = ref.current?.offsetWidth ?? 352;
    const height = ref.current?.offsetHeight ?? 120;
    return {
      x: Math.round(
        Math.min(
          Math.max(DOCK_EDGE, position.x),
          Math.max(DOCK_EDGE, window.innerWidth - width - DOCK_EDGE),
        ),
      ),
      y: Math.round(
        Math.min(
          Math.max(DOCK_EDGE, position.y),
          Math.max(DOCK_EDGE, window.innerHeight - height - DOCK_EDGE),
        ),
      ),
    };
  }

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    if (!enabled || event.button !== 0 || !ref.current) return;
    // the title bar's buttons keep working
    if ((event.target as HTMLElement).closest("button, a, input, select")) return;
    const rect = ref.current.getBoundingClientRect();
    start.current = { pointerX: event.clientX, pointerY: event.clientY, x: rect.left, y: rect.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function onPointerMove(event: React.PointerEvent<HTMLElement>) {
    const from = start.current;
    if (!from) return;
    const dx = event.clientX - from.pointerX;
    const dy = event.clientY - from.pointerY;
    // a small wobble on click isn't a drag
    if (!dragPosition && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    setDragPosition(clamp({ x: from.x + dx, y: from.y + dy }));
  }

  function onPointerUp() {
    if (!start.current) return;
    start.current = null;
    if (dragPosition) hub?.updatePreferences({ dockPosition: dragPosition });
    setDragPosition(null);
  }

  return {
    ref,
    dragging: !!dragPosition,
    position: dragPosition ?? (saved && typeof window !== "undefined" ? clamp(saved) : null),
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onDoubleClick: (event: React.MouseEvent<HTMLElement>) => {
        if ((event.target as HTMLElement).closest("button, a, input, select")) return;
        hub?.updatePreferences({ dockPosition: null });
      },
    },
  };
}

/** re-renders every `interval` ms (0 = never), for the "last heard 2m ago" labels */
function useNow(interval: number) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!interval) return;
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

function channelNames(channels: RadioChannelInfo[], ids: string[]) {
  return ids
    .map((id) => channels.find((c) => c.id === id)?.name)
    .filter(Boolean)
    .join(", ");
}

function activeTalkers(view: RadioView | null) {
  if (!view) return [];
  return Object.entries(view.joined).flatMap(([id, joined]) =>
    joined.talking.map((name) => ({
      name,
      channel: view.channels.find((c) => c.id === id)?.name ?? "",
    })),
  );
}

function useAgo() {
  const t = useTranslations("Radio");
  return (at: number, now: number) => {
    const seconds = Math.max(0, Math.round((now - at) / 1000));
    if (seconds < 15) return t("justNow");
    if (seconds < 60) return t("secondsAgo", { count: seconds });
    if (seconds < 3600) return t("minutesAgo", { count: Math.floor(seconds / 60) });
    return t("hoursAgo", { count: Math.floor(seconds / 3600) });
  };
}

const focusRing = "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

function IconButton(props: {
  label: string;
  onClick(): void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.pressed}
      onClick={props.onClick}
      className={classNames(
        "grid place-items-center w-7 h-7 rounded-md text-neutral-600 dark:text-gray-300 transition-colors",
        "hover:bg-gray-200/70 dark:hover:bg-secondary [&>svg]:w-3.5 [&>svg]:h-3.5",
        focusRing,
        props.pressed && "bg-gray-200/70 dark:bg-secondary",
      )}
    >
      {props.children}
    </button>
  );
}

function TextButton(props: { onClick(): void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      className={classNames(
        "rounded px-1.5 py-0.5 font-medium text-blue-600 dark:text-blue-400 transition-colors",
        "hover:bg-blue-100/70 dark:hover:bg-blue-500/10",
        focusRing,
      )}
    >
      {props.children}
    </button>
  );
}

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange(value: T): void;
}) {
  return (
    <span
      role="radiogroup"
      aria-label={props.label}
      title={props.label}
      className="inline-flex rounded-md p-0.5 bg-gray-100 dark:bg-black/30 ring-1 ring-inset ring-gray-200 dark:ring-quaternary"
    >
      {props.options.map((option) => {
        const active = option.value === props.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => props.onChange(option.value)}
            className={classNames(
              "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
              focusRing,
              active
                ? "bg-white text-neutral-900 shadow-sm dark:bg-secondary dark:text-white"
                : "text-neutral-500 hover:text-neutral-800 dark:text-gray-400 dark:hover:text-gray-200",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </span>
  );
}

function StatusLamp(props: { label: string; on: boolean; color: "emerald" | "red" }) {
  return (
    <span
      className={classNames(
        "rounded px-1.5 py-px text-[9px] font-bold tracking-wider transition-colors",
        props.on
          ? props.color === "red"
            ? "bg-red-600 text-white shadow-[0_0_8px_rgba(239,68,68,0.8)]"
            : "bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.8)]"
          : "bg-white/5 text-neutral-500",
      )}
    >
      {props.label}
    </span>
  );
}

function LevelMeter({ level, transmitting }: { level: number; transmitting: boolean }) {
  const lit = Math.round(Math.min(1, Math.max(0, level)) * METER_SEGMENTS);
  return (
    <div className="mt-2.5 flex gap-[3px] h-2" aria-hidden>
      {Array.from({ length: METER_SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={classNames(
            "flex-1 rounded-[2px] transition-colors duration-75",
            index >= lit
              ? "bg-white/[0.07]"
              : transmitting || index >= METER_SEGMENTS - 3
                ? "bg-red-500"
                : index >= METER_SEGMENTS - 7
                  ? "bg-amber-400"
                  : "bg-emerald-400",
          )}
        />
      ))}
    </div>
  );
}

function MinimizedBar(props: { hub: RadioHub; label: string; channelName: string | null }) {
  const t = useTranslations("Radio");
  const view = props.hub.view;
  const talking = activeTalkers(view);
  const transmitting = !!view?.transmittingOn.length;
  return (
    <div className="px-3 py-2 flex items-center gap-2.5">
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-sm font-semibold truncate">{props.channelName ?? t("noTalkChannel")}</p>
        <p
          className={classNames(
            "text-xs truncate flex items-center gap-1",
            talking.length
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-neutral-500 dark:text-gray-400",
          )}
        >
          {talking.length ? (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          ) : null}
          <span className="truncate">
            {talking.length
              ? talking.map((entry) => `${entry.name} · ${entry.channel}`).join(", ")
              : t("quiet")}
          </span>
        </p>
      </div>
      <PushToTalkButton
        hub={props.hub}
        compact
        disabled={view?.status !== "connected" || !view.transmitChannel}
        transmitting={transmitting}
        label={props.label}
        keyName={null}
      />
    </div>
  );
}

interface ChannelRowProps {
  hub: RadioHub;
  view: RadioView;
  now: number;
  channel: RadioChannelInfo;
  isTransmitChannel: boolean;
  isSimulcast: boolean;
  canPlayTones: boolean;
}

function ChannelRow({
  hub,
  view,
  now,
  channel,
  isTransmitChannel,
  isSimulcast,
  canPlayTones,
}: ChannelRowProps) {
  const t = useTranslations("Radio");
  const ago = useAgo();
  const { execute } = useFetch();
  const [showMembers, setShowMembers] = React.useState(false);
  const joined = view.joined[channel.id];
  const talking = joined?.talking ?? [];
  const members = joined?.members ?? [];
  const volume = view.volumes[channel.id] ?? 1;
  const isBusy = talking.length > 0;
  const isTarget = isTransmitChannel || isSimulcast;
  const isSending = view.transmittingOn.includes(channel.id);
  const lockedOn = view.listenMode === "all";
  const lastHeard = view.lastHeard[channel.id];

  async function playTone(tone: "alert" | "panic") {
    await execute({ path: `/radio/channels/${channel.id}/tone`, method: "POST", data: { tone } });
  }

  return (
    <li
      className={classNames(
        "relative rounded-xl border text-sm transition-colors overflow-hidden",
        isSending
          ? "border-red-500/70 bg-red-50 dark:bg-red-500/10"
          : isBusy
            ? "border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-500/10"
            : isTarget
              ? "border-blue-500/50 bg-blue-50/50 dark:bg-blue-500/[0.07]"
              : joined
                ? "border-gray-200 bg-white dark:border-quaternary dark:bg-black/10"
                : "border-dashed border-gray-200 bg-gray-50/60 dark:border-quaternary dark:bg-white/[0.02]",
      )}
    >
      {/* left edge: the channel's state at a glance */}
      <span
        aria-hidden
        className={classNames(
          "absolute inset-y-0 left-0 w-1",
          isSending
            ? "bg-red-500"
            : isBusy
              ? "bg-emerald-500 animate-pulse"
              : isTransmitChannel
                ? "bg-blue-600"
                : isSimulcast
                  ? "bg-blue-400"
                  : "bg-transparent",
        )}
      />
      <div className="flex items-center gap-2 pl-3 pr-2 py-2">
        <button
          type="button"
          role="switch"
          aria-checked={!!joined}
          disabled={lockedOn}
          onClick={() => hub.send({ name: "toggleChannel", id: channel.id })}
          aria-label={t("listenTo", { channel: channel.name })}
          title={lockedOn ? t("monitoringAll") : t("listenTo", { channel: channel.name })}
          className={classNames(
            "grid place-items-center w-7 h-7 rounded-lg shrink-0 transition-colors",
            focusRing,
            joined
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
              : "text-neutral-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-secondary",
            joined && !lockedOn && "hover:bg-emerald-500/25",
            lockedOn && "cursor-default",
          )}
        >
          <Headphones className="w-3.5 h-3.5" aria-hidden />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <span
              className={classNames(
                "text-sm font-semibold truncate",
                !joined && "text-neutral-500 dark:text-gray-400 font-medium",
              )}
            >
              {channel.name}
            </span>
            {channel.frequency ? (
              <span className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-gray-400 shrink-0">
                {channel.frequency}
              </span>
            ) : null}
          </div>
          {isBusy ? (
            <div className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="truncate font-medium">{talking.join(", ")}</span>
            </div>
          ) : lastHeard ? (
            <div className="text-[11px] text-neutral-500 dark:text-gray-400 truncate">
              {t("lastHeard", { name: lastHeard.name, time: ago(lastHeard.at, now) })}
            </div>
          ) : null}
        </div>

        {joined ? (
          <button
            type="button"
            className={classNames(
              "flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs tabular-nums text-neutral-500 dark:text-gray-400",
              "hover:bg-gray-200 dark:hover:bg-secondary",
              focusRing,
              showMembers && "bg-gray-200 dark:bg-secondary",
            )}
            onClick={() => setShowMembers((v) => !v)}
            aria-label={t("members")}
            aria-expanded={showMembers}
            title={t("members")}
          >
            <People aria-hidden /> {members.length}
          </button>
        ) : null}

        {channel.canTransmit ? (
          <span className="flex shrink-0 rounded-md ring-1 ring-inset ring-gray-300 dark:ring-quaternary overflow-hidden">
            <button
              type="button"
              onClick={() => hub.send({ name: "selectTransmit", id: channel.id })}
              title={t("selectTransmit")}
              aria-pressed={isTransmitChannel}
              className={classNames(
                "px-2 py-1 text-[11px] font-bold uppercase tracking-wide transition-colors",
                focusRing,
                isTransmitChannel
                  ? "bg-blue-600 text-white"
                  : "text-neutral-600 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-300 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
              )}
            >
              {isTransmitChannel ? t("tx") : t("talk")}
            </button>
            {!isTransmitChannel ? (
              <button
                type="button"
                onClick={() => hub.send({ name: "toggleSimulcast", id: channel.id })}
                aria-pressed={isSimulcast}
                aria-label={
                  isSimulcast
                    ? t("simulcastRemove", { channel: channel.name })
                    : t("simulcastAdd", { channel: channel.name })
                }
                title={
                  isSimulcast
                    ? t("simulcastRemove", { channel: channel.name })
                    : t("simulcastAdd", { channel: channel.name })
                }
                className={classNames(
                  "grid place-items-center w-6 border-l border-gray-300 dark:border-quaternary transition-colors",
                  focusRing,
                  isSimulcast
                    ? "bg-blue-500 text-white"
                    : "text-neutral-500 hover:bg-blue-50 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-blue-500/10 dark:hover:text-blue-300",
                )}
              >
                <Plus className="w-3.5 h-3.5" aria-hidden />
              </button>
            ) : null}
          </span>
        ) : (
          <span className="rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-neutral-500 dark:text-gray-400 bg-gray-100 dark:bg-secondary shrink-0">
            {t("rxOnly")}
          </span>
        )}
      </div>

      {joined ? (
        <div className="flex items-center gap-2 pr-2 pb-2 pl-12">
          <VolumeUpFill className="w-3 h-3 text-neutral-400 shrink-0" aria-hidden />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(event) =>
              hub.send({
                name: "setChannelVolume",
                id: channel.id,
                volume: Number(event.target.value),
              })
            }
            className="flex-1 h-1 accent-blue-600 cursor-pointer"
            aria-label={t("volumeOf", { channel: channel.name })}
          />
          <span className="w-8 text-right font-mono text-[10px] tabular-nums text-neutral-500 dark:text-gray-400">
            {Math.round(volume * 100)}
          </span>
          {canPlayTones ? (
            <span className="flex gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => void playTone("alert")}
                title={t("alertTone")}
                aria-label={t("alertTone")}
                className={classNames(
                  "grid place-items-center w-6 h-6 rounded-md text-amber-600 dark:text-amber-400 hover:bg-amber-500/15",
                  focusRing,
                )}
              >
                <BellFill className="w-3 h-3" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => void playTone("panic")}
                title={t("panicTone")}
                aria-label={t("panicTone")}
                className={classNames(
                  "grid place-items-center w-6 h-6 rounded-md text-red-600 dark:text-red-400 hover:bg-red-500/15",
                  focusRing,
                )}
              >
                <ExclamationTriangleFill className="w-3 h-3" aria-hidden />
              </button>
            </span>
          ) : null}
        </div>
      ) : null}

      {joined && showMembers ? (
        <ul className="flex flex-wrap gap-1 pr-2 pb-2 pl-12">
          {members.length ? (
            members.map((member) => (
              <li
                key={member.id}
                className={classNames(
                  "rounded-full px-2 py-0.5 text-xs",
                  member.talking
                    ? "bg-emerald-500 text-white"
                    : "bg-gray-100 dark:bg-secondary text-neutral-700 dark:text-gray-300",
                )}
                title={member.earpiece ? t("earpiece") : undefined}
              >
                {member.name}
                {member.earpiece ? (
                  <Headphones className="inline ml-1 w-3 h-3 align-[-2px]" aria-hidden />
                ) : null}
              </li>
            ))
          ) : (
            <li className="text-xs text-neutral-500">{t("nobody")}</li>
          )}
        </ul>
      ) : null}
    </li>
  );
}

function PushToTalkButton(props: {
  hub: RadioHub;
  disabled: boolean;
  transmitting: boolean;
  label: string;
  /** visible text, when it differs from the label */
  text?: string;
  keyName: string | null;
  compact?: boolean;
}) {
  const pressed = React.useRef(false);

  function start(event: React.PointerEvent<HTMLButtonElement>) {
    if (props.disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pressed.current = true;
    props.hub.send({ name: "startTransmit" });
  }
  function stop() {
    if (!pressed.current) return;
    pressed.current = false;
    props.hub.send({ name: "stopTransmit" });
  }

  return (
    <button
      type="button"
      disabled={props.disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.transmitting}
      className={classNames(
        "select-none touch-none rounded-xl font-semibold flex items-center justify-center gap-2 transition-all",
        focusRing,
        "disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-neutral-500 disabled:shadow-none dark:disabled:bg-secondary dark:disabled:text-gray-400",
        props.compact ? "shrink-0 w-11 h-11" : "w-full py-3.5 px-3 text-sm",
        props.transmitting
          ? "bg-red-600 text-white ring-4 ring-red-500/30 scale-[0.99]"
          : "bg-gradient-to-b from-blue-500 to-blue-700 hover:from-blue-500 hover:to-blue-800 active:to-blue-900 text-white shadow-md shadow-blue-900/20",
      )}
    >
      <MicFill
        className={classNames("shrink-0", props.transmitting && "animate-pulse")}
        aria-hidden
      />
      {props.compact ? null : (
        <>
          <span className="truncate">{props.text ?? props.label}</span>
          {props.keyName && !props.transmitting ? (
            <kbd className="ml-1 rounded-md border border-white/30 bg-white/15 px-1.5 py-px font-mono text-[11px] font-medium">
              {props.keyName}
            </kbd>
          ) : null}
        </>
      )}
    </button>
  );
}

function RadioSettings({ hub, onClose }: { hub: RadioHub; onClose(): void }) {
  const t = useTranslations("Radio");
  const { preferences } = hub;
  const [listening, setListening] = React.useState(false);
  const [devices, setDevices] = React.useState<MediaDeviceInfo[]>([]);

  React.useEffect(() => {
    void navigator.mediaDevices
      ?.enumerateDevices()
      .then((list) => setDevices(list.filter((device) => device.kind === "audioinput")))
      .catch(() => setDevices([]));
  }, []);

  React.useEffect(() => {
    if (!listening) return;
    function handle(event: KeyboardEvent) {
      event.preventDefault();
      if (event.code !== "Escape") hub.updatePreferences({ pttKey: event.code });
      setListening(false);
    }
    window.addEventListener("keydown", handle, { capture: true, once: true });
    return () => window.removeEventListener("keydown", handle, { capture: true });
  }, [listening, hub]);

  const selectClassName = classNames(
    "w-40 truncate rounded-md border border-gray-300 dark:border-quaternary",
    "bg-white dark:bg-secondary px-2 py-1 text-sm",
    "focus:outline-none focus:ring-2 focus:ring-blue-500",
  );

  return (
    <div className="mb-3 rounded-lg border border-gray-200 dark:border-quaternary text-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 dark:border-quaternary">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
          {t("settings")}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("dismiss")}
          className={classNames("opacity-60 hover:opacity-100 rounded", focusRing)}
        >
          <XLg className="w-3 h-3" aria-hidden />
        </button>
      </div>
      <div className="p-3 flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <span>{t("pttKey")}</span>
          <button
            type="button"
            onClick={() => setListening(true)}
            className={classNames(
              "min-w-[4rem] rounded-md border px-2 py-1 font-mono text-xs transition-colors",
              focusRing,
              listening
                ? "border-blue-500 text-blue-600 dark:text-blue-300 animate-pulse"
                : "border-gray-300 dark:border-quaternary bg-gray-50 dark:bg-secondary hover:border-blue-500",
            )}
          >
            {listening ? t("pressAKey") : keyLabel(preferences.pttKey)}
          </button>
        </div>
        <label className="flex items-center justify-between gap-2">
          <span>{t("volume")}</span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={hub.view?.masterVolume ?? preferences.masterVolume}
            onChange={(event) =>
              hub.send({ name: "setMasterVolume", volume: Number(event.target.value) })
            }
            className="w-40 accent-blue-600 cursor-pointer"
          />
        </label>
        <label className="flex items-center justify-between gap-2">
          <span>{t("microphone")}</span>
          <select
            className={selectClassName}
            value={preferences.microphoneDeviceId ?? ""}
            onChange={(event) =>
              hub.updatePreferences({ microphoneDeviceId: event.target.value || null })
            }
          >
            <option value="">{t("defaultMicrophone")}</option>
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || device.deviceId.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        {hub.isPopout ? null : (
          <label className="flex items-center justify-between gap-2">
            <span>{t("position")}</span>
            <select
              className={selectClassName}
              value={preferences.dockPosition ? "custom" : preferences.position}
              onChange={(event) => {
                if (event.target.value === "custom") return;
                hub.updatePreferences({
                  position: event.target.value as typeof preferences.position,
                  dockPosition: null,
                });
              }}
            >
              <option value="bottom-left">{t("bottomLeft")}</option>
              <option value="bottom-right">{t("bottomRight")}</option>
              {preferences.dockPosition ? (
                <option value="custom">{t("positionCustom")}</option>
              ) : null}
            </select>
          </label>
        )}
        <p className="text-xs text-neutral-500 dark:text-gray-400 border-t border-gray-200 dark:border-quaternary pt-2.5">
          {t("anyPageNote")}
        </p>
        {hub.isPopout ? null : (
          <p className="text-xs text-neutral-500 dark:text-gray-400">{t("dragHint")}</p>
        )}
        <p className="text-xs text-neutral-500 dark:text-gray-400">{t("httpsNote")}</p>
      </div>
    </div>
  );
}
