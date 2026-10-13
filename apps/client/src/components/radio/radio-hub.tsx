import * as React from "react";
import { useRouter } from "next/router";
import type {
  ChannelMode,
  RadioChannelInfo,
  RadioClient,
  RadioMember,
  RadioStatus,
  RadioTokenResponse,
} from "@snailycad/radio/browser";
import { Permissions } from "@snailycad/permissions";
import { useAuth } from "context/AuthContext";
import { useFeatureEnabled } from "hooks/useFeatureEnabled";
import { usePermission } from "hooks/usePermission";
import useFetch from "lib/useFetch";
import { useLeoState } from "state/leo-state";
import { useEmsFdState } from "state/ems-fd-state";
import { type RadioPreferences, useRadioPreferences } from "./use-radio";

/**
 * One radio per browser. The CAD's tabs (and the pop-out window) agree on one "leader" with a Web
 * Lock: only the leader connects and plays audio; the other tabs mirror its state over a
 * BroadcastChannel and send it their commands (push-to-talk included). The pop-out window takes
 * the lead from a tab; when the leader closes, another tab takes over.
 * Without Web Locks / BroadcastChannel (old browsers, http pages) every tab has its own radio.
 */

const LOCK_NAME = "snailycad-radio-leader";
const CHANNEL_NAME = "snailycad-radio";
export const POPOUT_PATH = "/radio/popout";

export type RadioRole = "off" | "single" | "leader" | "remote";

export interface RadioView {
  status: RadioStatus;
  channels: RadioChannelInfo[];
  joined: Record<string, { mode: ChannelMode; members: RadioMember[]; talking: string[] }>;
  transmitChannel: string | null;
  /** extra channels push-to-talk also goes out on */
  simulcast: string[];
  transmitting: string | null;
  /** every channel transmitting on right now */
  transmittingOn: string[];
  listenMode: RadioPreferences["listenMode"];
  /** who was last heard on each channel, and when (ms since epoch) */
  lastHeard: Record<string, { name: string; at: number }>;
  audioReady: boolean;
  volumes: Record<string, number>;
  masterVolume: number;
  /** where the radio runs: this tab, another tab, or the pop-out window */
  leaderIsPopout: boolean;
}

type Command =
  | { name: "toggleChannel"; id: string }
  | { name: "listenAll" }
  | { name: "listenNone" }
  | { name: "setListenMode"; mode: RadioPreferences["listenMode"] }
  | { name: "selectTransmit"; id: string }
  | { name: "toggleSimulcast"; id: string }
  | { name: "clearSimulcast" }
  | { name: "setChannelVolume"; id: string; volume: number }
  | { name: "setMasterVolume"; volume: number }
  | { name: "startTransmit" }
  | { name: "stopTransmit" }
  | { name: "resumeAudio" };

type HubMessage =
  | { type: "hello" }
  | { type: "state"; view: RadioView }
  | { type: "level"; level: number }
  | { type: "error"; message: string | null }
  | { type: "cmd"; command: Command };

export interface RadioHub {
  role: RadioRole;
  isPopout: boolean;
  view: RadioView | null;
  level: number;
  lastError: string | null;
  preferences: RadioPreferences;
  updatePreferences(patch: Partial<RadioPreferences>): void;
  send(command: Command): void;
  clearError(): void;
  popOut(): void;
}

const RadioHubContext = React.createContext<RadioHub | null>(null);

export function useRadioHub() {
  return React.useContext(RadioHubContext);
}

/**
 * is the radio shown to this user: signed in, the RADIO feature on, and a dispatcher or an admin
 * (Owner / Admin rank or Manage CAD Settings). Units use the radio in game.
 */
export function useRadioAvailable() {
  const { user } = useAuth();
  const { RADIO } = useFeatureEnabled();
  const { hasPermissions } = usePermission();
  if (!user || !RADIO) return false;
  // the same check as the API's radio token (the owner has every permission); an "ADMIN" rank
  // without these permissions would only get a permissions error
  return hasPermissions([Permissions.ManageCADSettings, Permissions.Dispatch]);
}

/**
 * joins the channels the preferences ask for and leaves the others: every channel in "all" mode,
 * else the selected ones; the transmit channel and the simulcast are always joined as a member
 */
function syncChannels(client: RadioClient, prefs: RadioPreferences) {
  const visible = new Set(client.channels.map((c) => c.id));
  const targets = new Set(client.transmitTargets);
  const wanted = new Set(
    prefs.listenMode === "all"
      ? visible
      : [...prefs.channels, ...targets].filter((id) => visible.has(id)),
  );
  for (const id of [...client.joined.keys()]) {
    if (!wanted.has(id) && !targets.has(id)) client.leave(id);
  }
  for (const id of wanted) {
    if (!client.joined.has(id)) client.join(id, targets.has(id) ? "member" : "listen");
    client.setChannelVolume(id, prefs.volumes[id] ?? 1);
  }
}

function buildView(
  client: RadioClient,
  preferences: RadioPreferences,
  audioReady: boolean,
  leaderIsPopout: boolean,
  lastHeard: RadioView["lastHeard"] = {},
): RadioView {
  const joined: RadioView["joined"] = {};
  for (const [id, channel] of client.joined) {
    joined[id] = {
      mode: channel.mode,
      members: channel.members,
      talking: [...channel.talking.values()],
    };
  }
  return {
    status: client.status,
    channels: client.channels,
    joined,
    transmitChannel: client.transmitChannel,
    simulcast: [...client.simulcast],
    transmitting: client.transmitting,
    transmittingOn: [...client.transmittingOn],
    listenMode: preferences.listenMode,
    lastHeard,
    audioReady,
    volumes: preferences.volumes,
    masterVolume: preferences.masterVolume,
    leaderIsPopout,
  };
}

export function RadioHubProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isPopout = router.pathname === POPOUT_PATH;
  const available = useRadioAvailable();
  const { execute } = useFetch();
  const executeRef = React.useRef(execute);
  executeRef.current = execute;

  const { preferences, update: updatePreferences, isLoaded } = useRadioPreferences();
  const preferencesRef = React.useRef(preferences);
  preferencesRef.current = preferences;

  const activeOfficer = useLeoState((state) => state.activeOfficer);
  const activeDeputy = useEmsFdState((state) => state.activeDeputy);
  const unitChannel =
    (activeOfficer && "radioChannelId" in activeOfficer ? activeOfficer.radioChannelId : null) ??
    (activeDeputy && "radioChannelId" in activeDeputy ? activeDeputy.radioChannelId : null) ??
    null;
  const unitChannelRef = React.useRef(unitChannel);
  unitChannelRef.current = unitChannel;

  const [role, setRole] = React.useState<RadioRole>("off");
  const [view, setView] = React.useState<RadioView | null>(null);
  const [level, setLevel] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);
  const clientRef = React.useRef<RadioClient | null>(null);
  const lastHeardRef = React.useRef<RadioView["lastHeard"]>({});
  const busRef = React.useRef<BroadcastChannel | null>(null);
  const runsRadio = role === "leader" || role === "single";

  // --- who runs the radio ------------------------------------------------------------------
  React.useEffect(() => {
    if (!available || !isLoaded) {
      setRole("off");
      return;
    }
    const canShare =
      typeof BroadcastChannel !== "undefined" &&
      typeof navigator !== "undefined" &&
      "locks" in navigator &&
      window.isSecureContext;
    if (!canShare) {
      setRole("single");
      return;
    }

    let cancelled = false;
    let release: (() => void) | null = null;
    const request = (steal: boolean) => {
      navigator.locks
        .request(LOCK_NAME, steal ? { steal: true } : {}, () => {
          if (cancelled) return Promise.resolve();
          setRole("leader");
          return new Promise<void>((resolve) => {
            release = resolve;
          });
        })
        .catch(() => {
          // the pop-out took the radio: follow it, and queue up to take over when it closes
          if (cancelled) return;
          setRole("remote");
          request(false);
        });
    };
    setRole("remote");
    request(isPopout);

    return () => {
      cancelled = true;
      release?.();
    };
  }, [available, isLoaded, isPopout]);

  // --- the broadcast channel between tabs -----------------------------------------------------
  React.useEffect(() => {
    if (role !== "leader" && role !== "remote") return;
    const bus = new BroadcastChannel(CHANNEL_NAME);
    busRef.current = bus;
    if (role === "remote") bus.postMessage({ type: "hello" } satisfies HubMessage);
    return () => {
      bus.close();
      busRef.current = null;
    };
  }, [role]);

  // --- leader / single: the radio itself ---------------------------------------------------
  const applyCommand = React.useCallback(
    (command: Command) => {
      const client = clientRef.current;
      if (!client) return;
      const prefs = preferencesRef.current;
      switch (command.name) {
        // listening = a silent monitor ("listen" mode: not in the member list); the channel you
        // talk on is joined as a member
        case "toggleChannel": {
          // in "all" mode every channel is on: the selection is edited in "selected" mode
          if (prefs.listenMode === "all") break;
          if (client.joined.has(command.id)) {
            client.leave(command.id);
            updatePreferences({
              channels: prefs.channels.filter((id) => id !== command.id),
              simulcast: prefs.simulcast.filter((id) => id !== command.id),
              transmitChannel:
                prefs.transmitChannel === command.id
                  ? client.transmitChannel
                  : prefs.transmitChannel,
            });
          } else {
            client.join(command.id, client.transmitChannel === command.id ? "member" : "listen");
            client.setChannelVolume(command.id, prefs.volumes[command.id] ?? 1);
            updatePreferences({ channels: [...new Set([...prefs.channels, command.id])] });
          }
          break;
        }
        case "setListenMode": {
          const next = { ...prefs, listenMode: command.mode };
          syncChannels(client, next);
          updatePreferences({ listenMode: command.mode });
          break;
        }
        case "listenAll": {
          // selects every channel (in "selected" mode)
          const next = {
            ...prefs,
            listenMode: "selected" as const,
            channels: client.channels.map((c) => c.id),
          };
          syncChannels(client, next);
          updatePreferences({ listenMode: next.listenMode, channels: next.channels });
          break;
        }
        case "listenNone": {
          // clears the selection; keeps the channels you talk on
          const targets = client.transmitTargets;
          const next = { ...prefs, listenMode: "selected" as const, channels: targets };
          syncChannels(client, next);
          updatePreferences({ listenMode: next.listenMode, channels: targets });
          break;
        }
        case "selectTransmit": {
          const channel = client.channels.find((c) => c.id === command.id);
          if (!channel?.canTransmit) break;
          const previous = client.transmitChannel;
          client.setTransmitChannel(command.id); // joins it as a member
          client.setChannelVolume(command.id, prefs.volumes[command.id] ?? 1);
          // the channel you talked on before stays on as a silent monitor
          if (previous && previous !== command.id && client.joined.has(previous)) {
            client.join(previous, "listen");
          }
          updatePreferences({
            transmitChannel: command.id,
            simulcast: prefs.simulcast.filter((id) => id !== command.id),
            channels: [...new Set([...prefs.channels, command.id])],
          });
          break;
        }
        // simulcast: push-to-talk also goes out on these channels
        case "toggleSimulcast": {
          const channel = client.channels.find((c) => c.id === command.id);
          if (!channel?.canTransmit) break;
          if (!client.transmitChannel) {
            applyCommandRef.current?.({ name: "selectTransmit", id: command.id });
            break;
          }
          if (command.id === client.transmitChannel) {
            // the main channel hands over to the next simulcast channel, if there's one
            const [next, ...rest] = [...client.simulcast];
            if (!next) break;
            client.setSimulcastChannels([]);
            client.setTransmitChannel(next);
            client.setSimulcastChannels(rest);
            if (prefs.listenMode === "all" || prefs.channels.includes(command.id)) {
              client.join(command.id, "listen");
            } else {
              client.leave(command.id);
            }
            updatePreferences({ transmitChannel: next, simulcast: rest });
            break;
          }
          const simulcast = client.simulcast.has(command.id)
            ? [...client.simulcast].filter((id) => id !== command.id)
            : [...client.simulcast, command.id];
          client.setSimulcastChannels(simulcast);
          for (const id of simulcast) client.setChannelVolume(id, prefs.volumes[id] ?? 1);
          updatePreferences({
            simulcast,
            channels: [...new Set([...prefs.channels, ...simulcast])],
          });
          break;
        }
        case "clearSimulcast": {
          client.setSimulcastChannels([]);
          updatePreferences({ simulcast: [] });
          break;
        }
        case "setChannelVolume": {
          client.setChannelVolume(command.id, command.volume);
          updatePreferences({ volumes: { ...prefs.volumes, [command.id]: command.volume } });
          break;
        }
        case "setMasterVolume": {
          client.setVolume(command.volume);
          updatePreferences({ masterVolume: command.volume });
          break;
        }
        case "startTransmit": {
          void client.startTransmit();
          break;
        }
        case "stopTransmit": {
          client.stopTransmit();
          break;
        }
        case "resumeAudio": {
          void client.output.resume();
          break;
        }
        default: {
          break;
        }
      }
    },
    [updatePreferences],
  );
  const applyCommandRef = React.useRef<((command: Command) => void) | null>(null);
  applyCommandRef.current = applyCommand;

  React.useEffect(() => {
    if (!runsRadio) return;
    let disposed = false;
    let client: RadioClient | null = null;
    const cleanups: (() => void)[] = [];
    let lastLevel = 0;

    const publish = () => {
      if (!client) return;
      const context = client.output.context;
      const next = buildView(
        client,
        preferencesRef.current,
        context.state === "running",
        isPopout,
        lastHeardRef.current,
      );
      setView(next);
      busRef.current?.postMessage({ type: "state", view: next } satisfies HubMessage);
    };

    void import("@snailycad/radio/browser").then(({ RadioClient }) => {
      if (disposed) return;
      client = new RadioClient({
        clientName: isPopout ? "snailycad-web/popout" : "snailycad-web",
        microphoneDeviceId: preferencesRef.current.microphoneDeviceId ?? undefined,
        getToken: async () => {
          const { json, error } = await executeRef.current<RadioTokenResponse>({
            path: "/radio/token",
            method: "POST",
            noToast: true,
          });
          if (error || !json.token) {
            throw new Error(String(error ?? "Could not get a radio token."));
          }
          return json;
        },
      });
      clientRef.current = client;

      // open the saved channels (or the unit's) whenever the radio (re)connects
      const openSaved = () => {
        const prefs = preferencesRef.current;
        const visible = new Set(client!.channels.map((c) => c.id));
        let selected = prefs.channels.filter((id) => visible.has(id));
        const unit = unitChannelRef.current;
        if (!selected.length && unit && visible.has(unit)) selected = [unit];
        const canTransmit = (id: string) =>
          !!client!.channels.find((c) => c.id === id)?.canTransmit;
        const transmit =
          prefs.transmitChannel && visible.has(prefs.transmitChannel)
            ? prefs.transmitChannel
            : selected.find(canTransmit);
        if (transmit) client!.setTransmitChannel(transmit);
        client!.setSimulcastChannels(
          prefs.simulcast.filter((id) => visible.has(id) && canTransmit(id)),
        );
        syncChannels(client!, { ...prefs, channels: selected });
        client!.setVolume(prefs.masterVolume);
      };
      cleanups.push(client.on("ready", openSaved));
      // new channels show up for everyone listening to all of them
      cleanups.push(
        client.on("channels", () => {
          if (preferencesRef.current.listenMode === "all") {
            syncChannels(client!, preferencesRef.current);
          }
        }),
      );
      cleanups.push(
        client.on("talk", ({ channel, name, on }) => {
          if (!on) return;
          lastHeardRef.current = { ...lastHeardRef.current, [channel]: { name, at: Date.now() } };
        }),
      );

      // dispatch moved this unit: remember the new channel
      cleanups.push(
        client.on("switch", ({ channel, from }) => {
          const prefs = preferencesRef.current;
          updatePreferences({
            channels: [...new Set([...prefs.channels.filter((id) => id !== from), channel])],
            transmitChannel: channel,
          });
        }),
      );

      for (const event of [
        "status",
        "ready",
        "channels",
        "joined",
        "left",
        "members",
        "talk",
        "transmit",
        "busy",
        "preempted",
        "switch",
      ] as const) {
        cleanups.push(client.on(event, publish));
      }
      cleanups.push(
        client.on("level", (value) => {
          const now = performance.now();
          if (now - lastLevel < 80) return;
          lastLevel = now;
          setLevel(value);
          busRef.current?.postMessage({ type: "level", level: value } satisfies HubMessage);
        }),
      );
      cleanups.push(
        client.on("error", ({ message }) => {
          setLastError(message);
          busRef.current?.postMessage({ type: "error", message } satisfies HubMessage);
        }),
      );
      cleanups.push(client.on("ready", () => setLastError(null)));

      const context = client.output.context;
      context.addEventListener("statechange", publish);
      cleanups.push(() => context.removeEventListener("statechange", publish));

      void client.connect();
      publish();
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
      clientRef.current = null;
      client?.disconnect();
      void client?.output.context.close();
      setView(null);
    };
  }, [runsRadio, isPopout, updatePreferences]);

  // re-publish when volumes change (they come from the preferences)
  React.useEffect(() => {
    const client = clientRef.current;
    if (!runsRadio || !client) return;
    const next = buildView(
      client,
      preferences,
      client.output.context.state === "running",
      isPopout,
      lastHeardRef.current,
    );
    setView(next);
    busRef.current?.postMessage({ type: "state", view: next } satisfies HubMessage);
  }, [runsRadio, preferences, isPopout]);

  // --- messages between tabs ---------------------------------------------------------------------
  React.useEffect(() => {
    const bus = busRef.current;
    if (!bus) return;
    bus.onmessage = (event: MessageEvent<HubMessage>) => {
      const message = event.data;
      if (role === "leader") {
        if (message.type === "hello" && clientRef.current) {
          const client = clientRef.current;
          bus.postMessage({
            type: "state",
            view: buildView(
              client,
              preferencesRef.current,
              client.output.context.state === "running",
              isPopout,
              lastHeardRef.current,
            ),
          } satisfies HubMessage);
        } else if (message.type === "cmd") {
          applyCommand(message.command);
        }
        return;
      }
      if (message.type === "state") setView(message.view);
      else if (message.type === "level") setLevel(message.level);
      else if (message.type === "error") setLastError(message.message);
    };
    return () => {
      bus.onmessage = null;
    };
  }, [role, applyCommand, isPopout]);

  const send = React.useCallback(
    (command: Command) => {
      if (role === "leader" || role === "single") applyCommand(command);
      else if (role === "remote") {
        busRef.current?.postMessage({ type: "cmd", command } satisfies HubMessage);
      }
    },
    [role, applyCommand],
  );

  // --- push-to-talk key, on every page of every tab ---------------------------------------------
  usePushToTalkKey(role !== "off" && !!view, preferences.pttKey, send);

  const popOut = React.useCallback(() => {
    window.open(
      POPOUT_PATH,
      "snailycad-radio",
      "popup=yes,width=400,height=680,menubar=no,toolbar=no,location=no,status=no",
    );
  }, []);

  const hub: RadioHub = {
    role,
    isPopout,
    view,
    level,
    lastError,
    preferences,
    updatePreferences,
    send,
    clearError: () => setLastError(null),
    popOut,
  };

  return <RadioHubContext.Provider value={hub}>{children}</RadioHubContext.Provider>;
}

const TYPING_ELEMENTS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** hold-to-talk on a keyboard key, anywhere on the page except while typing */
function usePushToTalkKey(enabled: boolean, code: string, send: (command: Command) => void) {
  React.useEffect(() => {
    if (!enabled || !code) return;
    let held = false;

    function isTyping(target: EventTarget | null) {
      const element = target as HTMLElement | null;
      return !!element && (TYPING_ELEMENTS.has(element.tagName) || element.isContentEditable);
    }
    function handleDown(event: KeyboardEvent) {
      if (event.code !== code || event.repeat || isTyping(event.target)) return;
      event.preventDefault();
      held = true;
      send({ name: "startTransmit" });
    }
    function handleUp(event: KeyboardEvent) {
      if (event.code !== code || !held) return;
      event.preventDefault();
      held = false;
      send({ name: "stopTransmit" });
    }
    // releasing the key in another window never sends keyup: stop when the page loses focus
    function handleBlur() {
      if (!held) return;
      held = false;
      send({ name: "stopTransmit" });
    }

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
      if (held) send({ name: "stopTransmit" });
    };
  }, [enabled, code, send]);
}
