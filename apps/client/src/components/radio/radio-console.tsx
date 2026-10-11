import * as React from "react";
import { useTranslations } from "use-intl";
import { Button } from "@snailycad/ui";
import type { RadioChannelInfo } from "@snailycad/radio/browser";
import {
  BoxArrowUpRight,
  BroadcastPin,
  ChevronDown,
  ChevronUp,
  Gear,
  MicFill,
  MicMuteFill,
  People,
  VolumeUpFill,
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
  const transmitName = channels.find((c) => c.id === transmitChannel)?.name ?? "";

  const pttLabel = transmitting
    ? t("transmitting")
    : transmitChannel
      ? t("holdToTalk", { channel: transmitName, key: keyLabel(preferences.pttKey) })
      : t("pickChannel");

  const header = (
    <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-quaternary">
      <h2 className="font-semibold text-sm flex items-center gap-2 min-w-0">
        <span
          className={classNames(
            "inline-block w-2 h-2 rounded-full shrink-0",
            connected
              ? "bg-emerald-500"
              : status === "closed"
                ? "bg-red-500"
                : "bg-amber-500 animate-pulse",
          )}
          title={statusLabel}
        />
        {t("radio")}
        {transmitting ? (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{t("tx")}</span>
        ) : null}
        {!runsHere && view?.leaderIsPopout && !hub.isPopout ? (
          <span className="text-xs font-normal text-neutral-500 dark:text-gray-400 truncate">
            {t("inPopout")}
          </span>
        ) : null}
      </h2>
      <div className="flex items-center gap-1 shrink-0">
        {hub.isPopout ? null : (
          <Button
            size="xs"
            variant="transparent"
            aria-label={t("popOut")}
            title={t("popOut")}
            onPress={hub.popOut}
          >
            <BoxArrowUpRight aria-hidden />
          </Button>
        )}
        <Button
          size="xs"
          variant="transparent"
          aria-label={t("settings")}
          onPress={() => setIsEditing((v) => !v)}
        >
          <Gear aria-hidden />
        </Button>
        {isDock ? (
          <Button
            size="xs"
            variant="transparent"
            aria-label={preferences.minimized ? t("expand") : t("minimize")}
            onPress={() => hub.updatePreferences({ minimized: !preferences.minimized })}
          >
            {preferences.minimized ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          </Button>
        ) : null}
      </div>
    </header>
  );

  const body = (
    <>
      {view && !view.audioReady ? (
        <button
          type="button"
          className="w-full mb-2 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 px-3 py-2 text-sm text-left"
          onClick={() => hub.send({ name: "resumeAudio" })}
        >
          <VolumeUpFill className="inline mr-2" aria-hidden />
          {runsHere ? t("enableAudio") : t("enableAudioElsewhere")}
        </button>
      ) : null}

      {hub.lastError ? (
        <div
          role="alert"
          className="mb-2 rounded-md bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200 px-3 py-2 text-sm flex justify-between gap-2"
        >
          <span>{hub.lastError}</span>
          <button
            type="button"
            className="font-semibold"
            onClick={hub.clearError}
            aria-label={t("dismiss")}
          >
            ×
          </button>
        </div>
      ) : null}

      {isEditing ? <RadioSettings hub={hub} /> : null}

      {channels.length <= 0 ? (
        <p className="text-sm text-neutral-600 dark:text-gray-400 py-2">
          {connected ? t("noChannels") : statusLabel}
        </p>
      ) : (
        <ul
          className={classNames(
            "flex flex-col gap-1.5",
            variant === "page" && "md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3",
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

      <PushToTalkButton
        hub={hub}
        disabled={!connected || !transmitChannel}
        transmitting={!!transmitting}
        label={pttLabel}
      />
      <div
        className="mt-1.5 h-1.5 rounded bg-gray-200 dark:bg-secondary overflow-hidden"
        aria-hidden
      >
        <div
          className={classNames(
            "h-full transition-[width] duration-75",
            transmitting ? "bg-red-500" : "bg-emerald-500",
          )}
          style={{ width: `${Math.round(hub.level * 100)}%` }}
        />
      </div>
    </>
  );

  if (!isDock) {
    return (
      <section className={classNames("card", variant === "popout" && "rounded-none min-h-screen")}>
        {header}
        <div className="p-3">{body}</div>
      </section>
    );
  }

  return (
    <aside
      aria-label={t("radio")}
      className={classNames(
        "fixed z-40 bottom-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg shadow-xl",
        "bg-white/95 dark:bg-tertiary/95 backdrop-blur border border-gray-200 dark:border-quaternary",
        preferences.position === "bottom-right" ? "right-4" : "left-4",
      )}
    >
      {header}
      {preferences.minimized ? (
        <MinimizedBar hub={hub} label={pttLabel} />
      ) : (
        <div className="p-3 max-h-[60vh] overflow-y-auto thin-scrollbar">{body}</div>
      )}
    </aside>
  );
}

function MinimizedBar({ hub, label }: { hub: RadioHub; label: string }) {
  const t = useTranslations("Radio");
  const view = hub.view;
  const talking = view
    ? Object.entries(view.joined).flatMap(([id, joined]) =>
        joined.talking.map((name) => ({
          name,
          channel: view.channels.find((c) => c.id === id)?.name ?? "",
        })),
      )
    : [];
  return (
    <div className="px-3 py-2 flex items-center gap-2">
      <p className="text-sm truncate flex-1 min-w-0">
        {talking.length ? (
          <span className="text-red-600 dark:text-red-400">
            {talking.map((entry) => `${entry.name} (${entry.channel})`).join(", ")}
          </span>
        ) : (
          <span className="text-neutral-500 dark:text-gray-400">{t("quiet")}</span>
        )}
      </p>
      <PushToTalkButton
        hub={hub}
        compact
        disabled={view?.status !== "connected" || !view.transmitChannel}
        transmitting={!!view?.transmitting}
        label={label}
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

  async function playTone(tone: "alert" | "panic") {
    await execute({ path: `/radio/channels/${channel.id}/tone`, method: "POST", data: { tone } });
  }

  return (
    <li
      className={classNames(
        "rounded-md border px-2.5 py-2 text-sm",
        talking.length
          ? "border-red-400 bg-red-50 dark:bg-red-500/10 dark:border-red-500/60"
          : isTransmitChannel
            ? "border-blue-400 dark:border-blue-500/60"
            : "border-gray-200 dark:border-quaternary",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="shrink-0"
          checked={!!joined}
          onChange={() => hub.send({ name: "toggleChannel", id: channel.id })}
          aria-label={t("listenTo", { channel: channel.name })}
        />
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={() => hub.send({ name: "selectTransmit", id: channel.id })}
          disabled={!channel.canTransmit}
          title={channel.canTransmit ? t("selectTransmit") : t("receiveOnly")}
        >
          <span className="font-medium block truncate">
            {channel.name}
            {channel.frequency ? (
              <span className="ml-1.5 font-normal text-neutral-500 dark:text-gray-400">
                {channel.frequency}
              </span>
            ) : null}
          </span>
          {talking.length ? (
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <BroadcastPin aria-hidden /> {talking.join(", ")}
            </span>
          ) : null}
        </button>
        {isTransmitChannel ? (
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">
            {t("tx")}
          </span>
        ) : channel.canTransmit ? null : (
          <span className="text-[11px] text-neutral-500 dark:text-gray-400">{t("rxOnly")}</span>
        )}
        {joined ? (
          <button
            type="button"
            className="text-neutral-500 dark:text-gray-400 flex items-center gap-0.5 text-xs"
            onClick={() => setShowMembers((v) => !v)}
            aria-label={t("members")}
            title={t("members")}
          >
            <People aria-hidden /> {members.length}
          </button>
        ) : null}
      </div>

      {joined ? (
        <div className="flex items-center gap-2 mt-1.5">
          <VolumeUpFill className="text-neutral-500 shrink-0" aria-hidden />
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
            className="flex-1 h-1"
            aria-label={t("volumeOf", { channel: channel.name })}
          />
          {canPlayTones ? (
            <>
              <Button size="xs" variant="amber" onPress={() => void playTone("alert")}>
                {t("alertTone")}
              </Button>
              <Button size="xs" variant="danger" onPress={() => void playTone("panic")}>
                {t("panicTone")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}

      {joined && showMembers ? (
        <ul className="mt-1.5 flex flex-wrap gap-1">
          {members.length ? (
            members.map((member) => (
              <li
                key={member.id}
                className={classNames(
                  "rounded px-1.5 py-0.5 text-xs",
                  member.talking
                    ? "bg-red-500 text-white"
                    : "bg-gray-100 dark:bg-secondary text-neutral-700 dark:text-gray-300",
                )}
                title={member.earpiece ? t("earpiece") : undefined}
              >
                {member.name}
                {member.earpiece ? " 🎧" : ""}
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
      className={classNames(
        "select-none touch-none rounded-lg font-semibold flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
        props.compact ? "shrink-0 px-3 py-1.5" : "mt-3 w-full py-3",
        props.transmitting
          ? "bg-red-600 text-white shadow-inner"
          : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
      )}
    >
      {props.transmitting ? <MicFill aria-hidden /> : <MicMuteFill aria-hidden />}
      {props.compact ? null : <span className="truncate">{props.label}</span>}
    </button>
  );
}

function RadioSettings({ hub }: { hub: RadioHub }) {
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

  return (
    <div className="mb-3 rounded-md border border-gray-200 dark:border-quaternary p-2.5 text-sm flex flex-col gap-2">
      <label className="flex items-center justify-between gap-2">
        <span>{t("pttKey")}</span>
        <Button size="xs" onPress={() => setListening(true)}>
          {listening ? t("pressAKey") : keyLabel(preferences.pttKey)}
        </Button>
      </label>
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
          className="w-32"
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t("microphone")}</span>
        <select
          className="max-w-[10rem] truncate rounded border border-gray-300 dark:border-quaternary bg-transparent px-1 py-0.5"
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
            className="rounded border border-gray-300 dark:border-quaternary bg-transparent px-1 py-0.5"
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
      <p className="text-xs text-neutral-500 dark:text-gray-400">{t("anyPageNote")}</p>
      <p className="text-xs text-neutral-500 dark:text-gray-400">{t("httpsNote")}</p>
    </div>
  );
}
