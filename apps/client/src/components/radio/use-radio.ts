import * as React from "react";

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
  position: "bottom-right",
};

function readStored(): RadioPreferences {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_RADIO_PREFERENCES, ...JSON.parse(stored) };
  } catch {
    // storage unavailable or corrupted: defaults
  }
  return DEFAULT_RADIO_PREFERENCES;
}

/**
 * per browser, like the mini CAD: each dispatcher sets up their own console. Kept in sync
 * between the browser's CAD tabs (and the pop-out window) through the storage event.
 */
export function useRadioPreferences() {
  const [preferences, setPreferences] = React.useState(DEFAULT_RADIO_PREFERENCES);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    setPreferences(readStored());
    setIsLoaded(true);

    function handleStorage(event: StorageEvent) {
      if (event.key === STORAGE_KEY) setPreferences(readStored());
    }
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
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
