import * as React from "react";
import type { RadioClient, RadioTokenResponse } from "@snailycad/radio/browser";
import useFetch from "lib/useFetch";

export interface RadioPreferences {
  /** channels this browser keeps open */
  channels: string[];
  transmitChannel: string | null;
  volumes: Record<string, number>;
  masterVolume: number;
  /** KeyboardEvent.code of the push-to-talk key */
  pttKey: string;
  microphoneDeviceId: string | null;
  minimized: boolean;
  position: "bottom-left" | "bottom-right";
}

const STORAGE_KEY = "snailycad.radio";

export const DEFAULT_RADIO_PREFERENCES: RadioPreferences = {
  channels: [],
  transmitChannel: null,
  volumes: {},
  masterVolume: 0.8,
  pttKey: "Backquote",
  microphoneDeviceId: null,
  minimized: false,
  position: "bottom-left",
};

/** per browser, like the mini CAD: each dispatcher sets up their own console */
export function useRadioPreferences() {
  const [preferences, setPreferences] = React.useState(DEFAULT_RADIO_PREFERENCES);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setPreferences({ ...DEFAULT_RADIO_PREFERENCES, ...JSON.parse(stored) });
    } catch {
      // storage unavailable or corrupted: defaults
    }
    setIsLoaded(true);
  }, []);

  const update = React.useCallback((patch: Partial<RadioPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...patch };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage unavailable: only for this page
      }
      return next;
    });
  }, []);

  return { preferences, update, isLoaded };
}

/**
 * One RadioClient for the page. The client is created on mount (it only connects; audio starts
 * after the first click because browsers block it until then) and closed on unmount.
 */
export function useRadioClient() {
  const { execute } = useFetch();
  const executeRef = React.useRef(execute);
  executeRef.current = execute;

  const [client, setClient] = React.useState<RadioClient | null>(null);
  const [, rerender] = React.useReducer((n: number) => n + 1, 0);
  const [level, setLevel] = React.useState(0);
  const [lastError, setLastError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let disposed = false;
    let radio: RadioClient | null = null;
    const cleanups: (() => void)[] = [];

    void import("@snailycad/radio/browser").then(({ RadioClient }) => {
      if (disposed) return;
      radio = new RadioClient({
        clientName: "snailycad-web",
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
        cleanups.push(radio.on(event, () => rerender()));
      }
      let lastLevelUpdate = 0;
      cleanups.push(
        radio.on("level", (value) => {
          const now = performance.now();
          if (now - lastLevelUpdate < 80) return;
          lastLevelUpdate = now;
          setLevel(value);
        }),
      );
      cleanups.push(radio.on("error", ({ message }) => setLastError(message)));
      cleanups.push(radio.on("ready", () => setLastError(null)));

      setClient(radio);
      void radio.connect();
    });

    return () => {
      disposed = true;
      for (const cleanup of cleanups) cleanup();
      radio?.disconnect();
      void radio?.output.context.close();
    };
  }, []);

  return { client, level, lastError, clearError: () => setLastError(null) };
}

const TYPING_ELEMENTS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

/** hold-to-talk on a keyboard key, anywhere on the page except while typing */
export function usePushToTalkKey(client: RadioClient | null, code: string, enabled: boolean) {
  React.useEffect(() => {
    if (!client || !enabled || !code) return;
    let held = false;

    function isTyping(target: EventTarget | null) {
      const element = target as HTMLElement | null;
      return !!element && (TYPING_ELEMENTS.has(element.tagName) || element.isContentEditable);
    }

    function handleDown(event: KeyboardEvent) {
      if (event.code !== code || event.repeat || isTyping(event.target)) return;
      event.preventDefault();
      held = true;
      void client!.startTransmit();
    }
    function handleUp(event: KeyboardEvent) {
      if (event.code !== code || !held) return;
      event.preventDefault();
      held = false;
      client!.stopTransmit();
    }
    // releasing the key in another window never sends keyup: stop when the page loses focus
    function handleBlur() {
      if (!held) return;
      held = false;
      client!.stopTransmit();
    }

    window.addEventListener("keydown", handleDown);
    window.addEventListener("keyup", handleUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleDown);
      window.removeEventListener("keyup", handleUp);
      window.removeEventListener("blur", handleBlur);
      if (held) client.stopTransmit();
    };
  }, [client, code, enabled]);
}

/** "Backquote" -> "`", "KeyT" -> "T", "F9" -> "F9" */
export function keyLabel(code: string) {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const names: Record<string, string> = {
    Backquote: "`",
    Space: "Space",
    CapsLock: "Caps Lock",
    ShiftLeft: "Left Shift",
    ShiftRight: "Right Shift",
    ControlLeft: "Left Ctrl",
    ControlRight: "Right Ctrl",
    AltLeft: "Left Alt",
    AltRight: "Right Alt",
  };
  return names[code] ?? code;
}
