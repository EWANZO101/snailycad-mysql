import * as React from "react";
import { useTranslations } from "use-intl";
import { Button } from "@snailycad/ui";
import type { RadioChannelInfo, RadioClient } from "@snailycad/radio/browser";
import {
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
import {
  keyLabel,
  type RadioPreferences,
  usePushToTalkKey,
  useRadioClient,
  useRadioPreferences,
} from "./use-radio";

interface RadioConsoleProps {
  variant: "dock" | "page";
  /** dispatchers can play tones on a channel */
  canPlayTones?: boolean;
  /** channel to open when the user hasn't picked any yet (e.g. the unit's radio channel) */
  defaultChannelId?: string | null;
}

export function RadioConsole({ variant, canPlayTones, defaultChannelId }: RadioConsoleProps) {
  const t = useTranslations("Radio");
  const { client, level, lastError, clearError } = useRadioClient();
  const { preferences, update, isLoaded } = useRadioPreferences();
  const [isEditing, setIsEditing] = React.useState(false);
  const [audioReady, setAudioReady] = React.useState(false);
  const isPage = variant === "page";

  usePushToTalkKey(client, preferences.pttKey, isLoaded);

  // open the saved channels (or the default one) whenever the radio (re)connects
  React.useEffect(() => {
    if (!client || !isLoaded) return;
    function openSaved() {
      const visible = new Set(client!.channels.map((c) => c.id));
      let wanted = preferences.channels.filter((id) => visible.has(id));
      if (!wanted.length && defaultChannelId && visible.has(defaultChannelId)) {
        wanted = [defaultChannelId];
      }
      for (const id of wanted) {
        if (!client!.joined.has(id)) client!.join(id, "member");
        client!.setChannelVolume(id, preferences.volumes[id] ?? 1);
      }
      const transmit =
        preferences.transmitChannel && wanted.includes(preferences.transmitChannel)
          ? preferences.transmitChannel
          : wanted[0];
      if (transmit) client!.setTransmitChannel(transmit);
      client!.setVolume(preferences.masterVolume);
    }
    if (client.status === "connected") openSaved();
    return client.on("ready", openSaved);
    // the saved channel list is read once per connection
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isLoaded, defaultChannelId]);

  // dispatch moved this unit: remember the new channel
  React.useEffect(() => {
    if (!client) return;
    return client.on("switch", ({ channel, from }) => {
      update({
        channels: [...new Set([...preferences.channels.filter((id) => id !== from), channel])],
        transmitChannel: channel,
      });
    });
  }, [client, preferences.channels, update]);

  React.useEffect(() => {
    if (!client) return;
    const context = client.output.context;
    const sync = () => setAudioReady(context.state === "running");
    sync();
    context.addEventListener("statechange", sync);
    return () => context.removeEventListener("statechange", sync);
  }, [client]);

  if (!client) return null;

  const channels = client.channels;
  const transmitChannel = client.transmitChannel;
  const transmitting = client.transmitting;
  const connected = client.status === "connected";

  function toggleChannel(channel: RadioChannelInfo) {
    if (!client) return;
    const open = client.joined.has(channel.id);
    if (open) {
      client.leave(channel.id);
      update({ channels: preferences.channels.filter((id) => id !== channel.id) });
    } else {
      client.join(channel.id, "member");
      client.setChannelVolume(channel.id, preferences.volumes[channel.id] ?? 1);
      update({ channels: [...new Set([...preferences.channels, channel.id])] });
    }
  }

  function selectTransmit(channel: RadioChannelInfo) {
    if (!client || !channel.canTransmit) return;
    client.setTransmitChannel(channel.id);
    update({
      transmitChannel: channel.id,
      channels: [...new Set([...preferences.channels, channel.id])],
    });
  }

  function setChannelVolume(id: string, volume: number) {
    client?.setChannelVolume(id, volume);
    update({ volumes: { ...preferences.volumes, [id]: volume } });
  }

  const statusLabel = connected
    ? t("connected")
    : client.status === "reconnecting"
      ? t("reconnecting")
      : client.status === "closed"
        ? t("disconnected")
        : t("connecting");

  const body = (
    <>
      {!audioReady ? (
        <button
          type="button"
          className="w-full mb-2 rounded-md bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 px-3 py-2 text-sm text-left"
          onClick={() => void client.output.resume()}
        >
          <VolumeUpFill className="inline mr-2" aria-hidden />
          {t("enableAudio")}
        </button>
      ) : null}

      {lastError ? (
        <div
          role="alert"
          className="mb-2 rounded-md bg-red-100 text-red-900 dark:bg-red-500/15 dark:text-red-200 px-3 py-2 text-sm flex justify-between gap-2"
        >
          <span>{lastError}</span>
          <button
            type="button"
            className="font-semibold"
            onClick={clearError}
            aria-label={t("dismiss")}
          >
            ×
          </button>
        </div>
      ) : null}

      {isEditing ? (
        <RadioSettings client={client} preferences={preferences} update={update} />
      ) : null}

      {channels.length <= 0 ? (
        <p className="text-sm text-neutral-600 dark:text-gray-400 py-2">
          {connected ? t("noChannels") : statusLabel}
        </p>
      ) : (
        <ul
          className={classNames(
            "flex flex-col gap-1.5",
            isPage && "md:grid md:grid-cols-2 xl:grid-cols-3 md:gap-3",
          )}
        >
          {channels.map((channel) => (
            <ChannelRow
              key={channel.id}
              client={client}
              channel={channel}
              isTransmitChannel={transmitChannel === channel.id}
              volume={preferences.volumes[channel.id] ?? 1}
              canPlayTones={!!canPlayTones}
              onToggle={() => toggleChannel(channel)}
              onSelectTransmit={() => selectTransmit(channel)}
              onVolume={(volume) => setChannelVolume(channel.id, volume)}
              isPage={isPage}
            />
          ))}
        </ul>
      )}

      <PushToTalkButton
        client={client}
        disabled={!connected || !transmitChannel}
        transmitting={!!transmitting}
        label={
          transmitting
            ? t("transmitting")
            : transmitChannel
              ? t("holdToTalk", {
                  channel: channels.find((c) => c.id === transmitChannel)?.name ?? "",
                  key: keyLabel(preferences.pttKey),
                })
              : t("pickChannel")
        }
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
          style={{ width: `${Math.round(level * 100)}%` }}
        />
      </div>
    </>
  );

  const header = (
    <header className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-quaternary">
      <h2 className="font-semibold text-sm flex items-center gap-2">
        <span
          className={classNames(
            "inline-block w-2 h-2 rounded-full",
            connected
              ? "bg-emerald-500"
              : client.status === "closed"
                ? "bg-red-500"
                : "bg-amber-500 animate-pulse",
          )}
          title={statusLabel}
        />
        {t("radio")}
        {transmitting ? (
          <span className="text-xs font-semibold text-red-600 dark:text-red-400">{t("tx")}</span>
        ) : null}
      </h2>
      <div className="flex items-center gap-1">
        <Button
          size="xs"
          variant="transparent"
          aria-label={t("settings")}
          onPress={() => setIsEditing((v) => !v)}
        >
          <Gear aria-hidden />
        </Button>
        {isPage ? null : (
          <Button
            size="xs"
            variant="transparent"
            aria-label={preferences.minimized ? t("expand") : t("minimize")}
            onPress={() => update({ minimized: !preferences.minimized })}
          >
            {preferences.minimized ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
          </Button>
        )}
      </div>
    </header>
  );

  if (isPage) {
    return (
      <section className="card">
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
        <MinimizedBar client={client} />
      ) : (
        <div className="p-3 max-h-[60vh] overflow-y-auto thin-scrollbar">{body}</div>
      )}
    </aside>
  );
}

function MinimizedBar({ client }: { client: RadioClient }) {
  const t = useTranslations("Radio");
  const talking = [...client.joined.values()].flatMap((joined) =>
    [...joined.talking.values()].map((name) => ({
      name,
      channel: client.channels.find((c) => c.id === joined.id)?.name ?? "",
    })),
  );
  return (
    <p className="px-3 py-2 text-sm truncate">
      {talking.length ? (
        <span className="text-red-600 dark:text-red-400">
          {talking.map((entry) => `${entry.name} (${entry.channel})`).join(", ")}
        </span>
      ) : (
        <span className="text-neutral-500 dark:text-gray-400">{t("quiet")}</span>
      )}
    </p>
  );
}

interface ChannelRowProps {
  client: RadioClient;
  channel: RadioChannelInfo;
  isTransmitChannel: boolean;
  volume: number;
  canPlayTones: boolean;
  isPage: boolean;
  onToggle(): void;
  onSelectTransmit(): void;
  onVolume(volume: number): void;
}

function ChannelRow(props: ChannelRowProps) {
  const t = useTranslations("Radio");
  const { execute } = useFetch();
  const [showMembers, setShowMembers] = React.useState(false);
  const joined = props.client.joined.get(props.channel.id);
  const talking = joined ? [...joined.talking.values()] : [];
  const members = joined?.members ?? [];

  async function playTone(tone: "alert" | "panic") {
    await execute({
      path: `/radio/channels/${props.channel.id}/tone`,
      method: "POST",
      data: { tone },
    });
  }

  return (
    <li
      className={classNames(
        "rounded-md border px-2.5 py-2 text-sm",
        talking.length
          ? "border-red-400 bg-red-50 dark:bg-red-500/10 dark:border-red-500/60"
          : props.isTransmitChannel
            ? "border-blue-400 dark:border-blue-500/60"
            : "border-gray-200 dark:border-quaternary",
      )}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          className="shrink-0"
          checked={!!joined}
          onChange={props.onToggle}
          aria-label={t("listenTo", { channel: props.channel.name })}
        />
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={props.onSelectTransmit}
          disabled={!props.channel.canTransmit}
          title={props.channel.canTransmit ? t("selectTransmit") : t("receiveOnly")}
        >
          <span className="font-medium block truncate">
            {props.channel.name}
            {props.channel.frequency ? (
              <span className="ml-1.5 font-normal text-neutral-500 dark:text-gray-400">
                {props.channel.frequency}
              </span>
            ) : null}
          </span>
          {talking.length ? (
            <span className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
              <BroadcastPin aria-hidden /> {talking.join(", ")}
            </span>
          ) : null}
        </button>
        {props.isTransmitChannel ? (
          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-300">
            {t("tx")}
          </span>
        ) : props.channel.canTransmit ? null : (
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
            value={props.volume}
            onChange={(event) => props.onVolume(Number(event.target.value))}
            className="flex-1 h-1"
            aria-label={t("volumeOf", { channel: props.channel.name })}
          />
          {props.canPlayTones ? (
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
  client: RadioClient;
  disabled: boolean;
  transmitting: boolean;
  label: string;
}) {
  const pressed = React.useRef(false);

  function start(event: React.PointerEvent<HTMLButtonElement>) {
    if (props.disabled) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pressed.current = true;
    void props.client.startTransmit();
  }
  function stop() {
    if (!pressed.current) return;
    pressed.current = false;
    props.client.stopTransmit();
  }

  return (
    <button
      type="button"
      disabled={props.disabled}
      onPointerDown={start}
      onPointerUp={stop}
      onPointerCancel={stop}
      onContextMenu={(event) => event.preventDefault()}
      className={classNames(
        "mt-3 w-full select-none touch-none rounded-lg py-3 font-semibold flex items-center justify-center gap-2",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
        props.transmitting
          ? "bg-red-600 text-white shadow-inner"
          : "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
      )}
    >
      {props.transmitting ? <MicFill aria-hidden /> : <MicMuteFill aria-hidden />}
      <span className="truncate">{props.label}</span>
    </button>
  );
}

function RadioSettings(props: {
  client: RadioClient;
  preferences: RadioPreferences;
  update(patch: Partial<RadioPreferences>): void;
}) {
  const t = useTranslations("Radio");
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
      if (event.code !== "Escape") props.update({ pttKey: event.code });
      setListening(false);
    }
    window.addEventListener("keydown", handle, { capture: true, once: true });
    return () => window.removeEventListener("keydown", handle, { capture: true });
  }, [listening, props]);

  return (
    <div className="mb-3 rounded-md border border-gray-200 dark:border-quaternary p-2.5 text-sm flex flex-col gap-2">
      <label className="flex items-center justify-between gap-2">
        <span>{t("pttKey")}</span>
        <Button size="xs" onPress={() => setListening(true)}>
          {listening ? t("pressAKey") : keyLabel(props.preferences.pttKey)}
        </Button>
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t("volume")}</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={props.preferences.masterVolume}
          onChange={(event) => {
            const volume = Number(event.target.value);
            props.client.setVolume(volume);
            props.update({ masterVolume: volume });
          }}
          className="w-32"
        />
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t("microphone")}</span>
        <select
          className="max-w-[10rem] truncate rounded border border-gray-300 dark:border-quaternary bg-transparent px-1 py-0.5"
          value={props.preferences.microphoneDeviceId ?? ""}
          onChange={(event) => props.update({ microphoneDeviceId: event.target.value || null })}
        >
          <option value="">{t("defaultMicrophone")}</option>
          {devices.map((device) => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || device.deviceId.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2">
        <span>{t("position")}</span>
        <select
          className="rounded border border-gray-300 dark:border-quaternary bg-transparent px-1 py-0.5"
          value={props.preferences.position}
          onChange={(event) =>
            props.update({ position: event.target.value as RadioPreferences["position"] })
          }
        >
          <option value="bottom-left">{t("bottomLeft")}</option>
          <option value="bottom-right">{t("bottomRight")}</option>
        </select>
      </label>
      <p className="text-xs text-neutral-500 dark:text-gray-400">{t("httpsNote")}</p>
    </div>
  );
}
