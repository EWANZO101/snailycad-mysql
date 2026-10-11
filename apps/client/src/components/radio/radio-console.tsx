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

const METER_SEGMENTS = 16;

export function RadioConsole({ variant, canPlayTones }: RadioConsoleProps) {
  const t = useTranslations("Radio");
  const hub = useRadioHub();
  const [isEditing, setIsEditing] = React.useState(false);

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
  const transmitting = view?.transmitting ?? null;
  const transmitInfo = channels.find((c) => c.id === transmitChannel) ?? null;
  const talking = activeTalkers(view);

  const pttLabel = transmitting
    ? t("transmitting")
    : transmitInfo
      ? t("holdToTalk", { channel: transmitInfo.name, key: keyLabel(preferences.pttKey) })
      : t("pickChannel");

  const header = (
    <header className="flex items-center justify-between gap-2 px-3 py-2.5 border-b border-gray-200 dark:border-quaternary">
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className={classNames(
            "grid place-items-center w-7 h-7 rounded-md shrink-0 transition-colors",
            transmitting
              ? "bg-red-600 text-white"
              : "bg-gray-100 text-neutral-700 dark:bg-secondary dark:text-gray-200",
          )}
          aria-hidden
        >
          <Broadcast className="w-3.5 h-3.5" />
        </span>
        <div className="min-w-0 leading-tight">
          <h2 className="font-semibold text-sm">{t("radio")}</h2>
          <p className="flex items-center gap-1.5 text-[11px] text-neutral-500 dark:text-gray-400">
            <span
              className={classNames(
                "inline-block w-1.5 h-1.5 rounded-full shrink-0",
                connected
                  ? "bg-emerald-500"
                  : status === "closed"
                    ? "bg-red-500"
                    : "bg-amber-500 animate-pulse",
              )}
              title={statusLabel}
            />
            <span className="truncate">
              {statusLabel}
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
            "w-full mb-3 rounded-md px-3 py-2 text-sm text-left flex items-center gap-2",
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
          className="mb-3 rounded-md px-3 py-2 text-sm flex items-start justify-between gap-2 bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200"
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

  const display = (
    <div
      className={classNames(
        "rounded-lg border px-3 py-2.5 mb-3 transition-colors",
        transmitting
          ? "border-red-500/60 bg-red-50 dark:bg-red-500/10"
          : "border-gray-200 bg-gray-50 dark:border-quaternary dark:bg-black/20",
      )}
    >
      <div className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
        <span>{t("talkChannel")}</span>
        {transmitting ? (
          <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {t("tx")}
          </span>
        ) : view ? (
          <span>{t("listeningCount", { count: Object.keys(view.joined).length })}</span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2 min-w-0">
        <p className="font-semibold text-base truncate">
          {transmitInfo ? transmitInfo.name : t("noTalkChannel")}
        </p>
        {transmitInfo?.frequency ? (
          <span className="font-mono text-sm tabular-nums text-neutral-600 dark:text-gray-300 shrink-0">
            {transmitInfo.frequency}
          </span>
        ) : null}
      </div>
      <p
        className={classNames(
          "mt-0.5 text-xs truncate h-4",
          talking.length ? "text-red-600 dark:text-red-400" : "text-neutral-500 dark:text-gray-400",
        )}
      >
        {talking.length
          ? talking.map((entry) => `${entry.name} · ${entry.channel}`).join(", ")
          : t("quiet")}
      </p>
      <LevelMeter level={hub.level} transmitting={!!transmitting} />
    </div>
  );

  const channelList = (
    <>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-gray-400">
          {t("channels")}
        </h3>
        {channels.length > 1 ? (
          <span className="flex gap-0.5 shrink-0 text-xs">
            <TextButton onClick={() => hub.send({ name: "listenAll" })}>
              {t("listenAll")}
            </TextButton>
            <TextButton onClick={() => hub.send({ name: "listenNone" })}>
              {t("listenNone")}
            </TextButton>
          </span>
        ) : null}
      </div>

      {channels.length <= 0 ? (
        <p className="text-sm text-neutral-600 dark:text-gray-400 py-2">
          {connected ? t("noChannels") : statusLabel}
        </p>
      ) : (
        <ul
          className={classNames(
            "flex flex-col gap-1",
            variant === "page" && "md:grid md:grid-cols-2 md:gap-2",
          )}
        >
          {channels.map((channel) => (
            <ChannelRow
              key={channel.id}
              hub={hub}
              view={view!}
              channel={channel}
              isTransmitChannel={transmitChannel === channel.id}
              canPlayTones={!!canPlayTones}
            />
          ))}
        </ul>
      )}
      <p className="mt-2 text-[11px] text-neutral-500 dark:text-gray-400">{t("channelsHint")}</p>
    </>
  );

  const ptt = (
    <PushToTalkButton
      hub={hub}
      disabled={!connected || !transmitChannel}
      transmitting={!!transmitting}
      label={pttLabel}
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
          <div className="md:grid md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:gap-4">
            <div>
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
      aria-label={t("radio")}
      className={classNames(
        "fixed z-40 bottom-4 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden",
        "bg-white/95 dark:bg-tertiary/95 backdrop-blur border shadow-2xl shadow-black/20 transition-colors",
        transmitting ? "border-red-500/70" : "border-gray-200 dark:border-quaternary",
        preferences.position === "bottom-right" ? "right-4" : "left-4",
      )}
    >
      {header}
      {preferences.minimized ? (
        <MinimizedBar hub={hub} label={pttLabel} channelName={transmitInfo?.name ?? null} />
      ) : (
        <>
          <div className="p-3 max-h-[min(60vh,32rem)] overflow-y-auto thin-scrollbar">
            {notices}
            {settings}
            {display}
            {channelList}
          </div>
          <div className="px-3 pb-3 pt-2.5 border-t border-gray-200 dark:border-quaternary">
            {ptt}
          </div>
        </>
      )}
    </aside>
  );
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
        "hover:bg-gray-100 dark:hover:bg-secondary [&>svg]:w-3.5 [&>svg]:h-3.5",
        focusRing,
        props.pressed && "bg-gray-100 dark:bg-secondary",
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
        "hover:bg-blue-50 dark:hover:bg-blue-500/10",
        focusRing,
      )}
    >
      {props.children}
    </button>
  );
}

function LevelMeter({ level, transmitting }: { level: number; transmitting: boolean }) {
  const lit = Math.round(Math.min(1, Math.max(0, level)) * METER_SEGMENTS);
  return (
    <div className="mt-2 flex gap-0.5 h-1.5" aria-hidden>
      {Array.from({ length: METER_SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={classNames(
            "flex-1 rounded-sm transition-colors duration-75",
            index >= lit
              ? "bg-gray-200 dark:bg-white/10"
              : transmitting || index >= METER_SEGMENTS - 3
                ? "bg-red-500"
                : index >= METER_SEGMENTS - 6
                  ? "bg-amber-400"
                  : "bg-emerald-500",
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
  return (
    <div className="px-3 py-2 flex items-center gap-2">
      <div className="flex-1 min-w-0 leading-tight">
        <p className="text-sm font-medium truncate">{props.channelName ?? t("noTalkChannel")}</p>
        <p
          className={classNames(
            "text-xs truncate",
            talking.length
              ? "text-red-600 dark:text-red-400"
              : "text-neutral-500 dark:text-gray-400",
          )}
        >
          {talking.length
            ? talking.map((entry) => `${entry.name} · ${entry.channel}`).join(", ")
            : t("quiet")}
        </p>
      </div>
      <PushToTalkButton
        hub={props.hub}
        compact
        disabled={view?.status !== "connected" || !view.transmitChannel}
        transmitting={!!view?.transmitting}
        label={props.label}
        keyName={null}
      />
    </div>
  );
}

interface ChannelRowProps {
  hub: RadioHub;
  view: RadioView;
  channel: RadioChannelInfo;
  isTransmitChannel: boolean;
  canPlayTones: boolean;
}

function ChannelRow({ hub, view, channel, isTransmitChannel, canPlayTones }: ChannelRowProps) {
  const t = useTranslations("Radio");
  const { execute } = useFetch();
  const [showMembers, setShowMembers] = React.useState(false);
  const joined = view.joined[channel.id];
  const talking = joined?.talking ?? [];
  const members = joined?.members ?? [];
  const volume = view.volumes[channel.id] ?? 1;
  const isBusy = talking.length > 0;

  async function playTone(tone: "alert" | "panic") {
    await execute({ path: `/radio/channels/${channel.id}/tone`, method: "POST", data: { tone } });
  }

  return (
    <li
      className={classNames(
        "rounded-lg border text-sm transition-colors",
        isBusy
          ? "border-red-400/70 bg-red-50 dark:bg-red-500/10 dark:border-red-500/50"
          : isTransmitChannel
            ? "border-blue-500/60 bg-blue-50/60 dark:bg-blue-500/10"
            : joined
              ? "border-gray-200 dark:border-quaternary"
              : "border-transparent bg-gray-50 dark:bg-white/[0.03]",
      )}
    >
      <div className="flex items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          role="switch"
          aria-checked={!!joined}
          onClick={() => hub.send({ name: "toggleChannel", id: channel.id })}
          aria-label={t("listenTo", { channel: channel.name })}
          title={t("listenTo", { channel: channel.name })}
          className={classNames(
            "grid place-items-center w-7 h-7 rounded-md shrink-0 transition-colors",
            focusRing,
            joined
              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25"
              : "text-neutral-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-secondary",
          )}
        >
          <Headphones className="w-3.5 h-3.5" aria-hidden />
        </button>

        <div className="flex-1 min-w-0">
          <p className="flex items-baseline gap-1.5 min-w-0">
            <span
              className={classNames(
                "font-medium truncate",
                !joined && "text-neutral-600 dark:text-gray-400",
              )}
            >
              {channel.name}
            </span>
            {channel.frequency ? (
              <span className="font-mono text-[11px] tabular-nums text-neutral-500 dark:text-gray-400 shrink-0">
                {channel.frequency}
              </span>
            ) : null}
          </p>
          {isBusy ? (
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="truncate">{talking.join(", ")}</span>
            </p>
          ) : null}
        </div>

        {joined ? (
          <button
            type="button"
            className={classNames(
              "flex items-center gap-1 rounded px-1 py-0.5 text-xs text-neutral-500 dark:text-gray-400",
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
          <button
            type="button"
            onClick={() => hub.send({ name: "selectTransmit", id: channel.id })}
            title={t("selectTransmit")}
            aria-pressed={isTransmitChannel}
            className={classNames(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide shrink-0 transition-colors",
              focusRing,
              isTransmitChannel
                ? "bg-blue-600 text-white"
                : "border border-gray-300 text-neutral-600 hover:border-blue-500 hover:text-blue-600 dark:border-quaternary dark:text-gray-300 dark:hover:text-blue-300",
            )}
          >
            {isTransmitChannel ? t("tx") : t("talk")}
          </button>
        ) : (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-gray-400 bg-gray-100 dark:bg-secondary shrink-0">
            {t("rxOnly")}
          </span>
        )}
      </div>

      {joined ? (
        <div className="flex items-center gap-2 pr-2 pb-1.5 pl-11">
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
        <ul className="flex flex-wrap gap-1 pr-2 pb-2 pl-11">
          {members.length ? (
            members.map((member) => (
              <li
                key={member.id}
                className={classNames(
                  "rounded-full px-2 py-0.5 text-xs",
                  member.talking
                    ? "bg-red-500 text-white"
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
        "select-none touch-none rounded-lg font-semibold flex items-center justify-center gap-2 transition-all",
        focusRing,
        "disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-neutral-500 dark:disabled:bg-secondary dark:disabled:text-gray-400",
        props.compact ? "shrink-0 w-10 h-10" : "w-full py-3 px-3 text-sm",
        props.transmitting
          ? "bg-red-600 text-white ring-4 ring-red-500/30"
          : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm",
      )}
    >
      <MicFill
        className={classNames("shrink-0", props.transmitting && "animate-pulse")}
        aria-hidden
      />
      {props.compact ? null : (
        <>
          <span className="truncate">{props.label}</span>
          {props.keyName && !props.transmitting ? (
            <kbd className="ml-1 rounded border border-white/30 bg-white/15 px-1.5 py-px font-mono text-[11px] font-medium">
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
              value={preferences.position}
              onChange={(event) =>
                hub.updatePreferences({
                  position: event.target.value as typeof preferences.position,
                })
              }
            >
              <option value="bottom-left">{t("bottomLeft")}</option>
              <option value="bottom-right">{t("bottomRight")}</option>
            </select>
          </label>
        )}
        <p className="text-xs text-neutral-500 dark:text-gray-400 border-t border-gray-200 dark:border-quaternary pt-2.5">
          {t("anyPageNote")}
        </p>
        <p className="text-xs text-neutral-500 dark:text-gray-400">{t("httpsNote")}</p>
      </div>
    </div>
  );
}
