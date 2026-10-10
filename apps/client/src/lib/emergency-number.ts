import * as React from "react";

export const DEFAULT_EMERGENCY_NUMBER = "911";
export const EMERGENCY_NUMBER_STORAGE_KEY = "snailycad_emergency_number";
export const EMERGENCY_NUMBER_CHANGED_EVENT = "snailycad:emergency-number-changed";

export const EMERGENCY_NUMBER_PRESETS = [
  { value: "911", label: "911 (US, Canada)" },
  { value: "999", label: "999 (UK)" },
  { value: "112", label: "112 (EU)" },
  { value: "000", label: "000 (Australia)" },
  { value: "111", label: "111 (New Zealand)" },
];

/** digits, letters, spaces and dashes only, so it's safe to show anywhere */
export function sanitizeEmergencyNumber(value: string) {
  return value.replace(/[^\p{L}\p{N} -]/gu, "").trim().slice(0, 12);
}

export function getSavedEmergencyNumber(): string {
  try {
    const value = window.localStorage.getItem(EMERGENCY_NUMBER_STORAGE_KEY);
    const sanitized = value ? sanitizeEmergencyNumber(value) : "";
    return sanitized || DEFAULT_EMERGENCY_NUMBER;
  } catch {
    return DEFAULT_EMERGENCY_NUMBER;
  }
}

export function saveEmergencyNumber(value: string) {
  const sanitized = sanitizeEmergencyNumber(value) || DEFAULT_EMERGENCY_NUMBER;
  try {
    window.localStorage.setItem(EMERGENCY_NUMBER_STORAGE_KEY, sanitized);
  } catch {
    // storage unavailable: only applies until the page is reloaded
  }
  window.dispatchEvent(new Event(EMERGENCY_NUMBER_CHANGED_EVENT));
}

function replaceInMessages(value: unknown, emergencyNumber: string): unknown {
  if (typeof value === "string") {
    return value.replace(/\b911\b/g, emergencyNumber);
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceInMessages(item, emergencyNumber));
  }
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      result[key] = replaceInMessages(item, emergencyNumber);
    }
    return result;
  }
  return value;
}

/**
 * replaces "911" in every translation with the user's chosen emergency number (e.g. 999 or 112).
 * The first render always uses the original messages so server and client markup match.
 */
export function useEmergencyNumberMessages<T>(messages: T): T {
  const [emergencyNumber, setEmergencyNumber] = React.useState(DEFAULT_EMERGENCY_NUMBER);

  React.useEffect(() => {
    setEmergencyNumber(getSavedEmergencyNumber());

    function handleChange() {
      setEmergencyNumber(getSavedEmergencyNumber());
    }

    window.addEventListener(EMERGENCY_NUMBER_CHANGED_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(EMERGENCY_NUMBER_CHANGED_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  return React.useMemo(() => {
    if (!messages || emergencyNumber === DEFAULT_EMERGENCY_NUMBER) return messages;
    return replaceInMessages(messages, emergencyNumber) as T;
  }, [messages, emergencyNumber]);
}
