import * as React from "react";

export const DEFAULT_EMERGENCY_NUMBER = "911";

export const EMERGENCY_NUMBER_PRESETS = [
  { value: "911", label: "911 (US, Canada)" },
  { value: "999", label: "999 (UK)" },
  { value: "112", label: "112 (EU)" },
  { value: "000", label: "000 (Australia)" },
  { value: "111", label: "111 (New Zealand)" },
];

/** digits, letters, spaces and dashes only, so it's safe to show anywhere */
export function sanitizeEmergencyNumber(value: string) {
  return value
    .replace(/[^\p{L}\p{N} -]/gu, "")
    .trim()
    .slice(0, 12);
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
 * replaces "911" in every translation with the CAD's emergency number (e.g. 999 or 112).
 * It's a CAD-wide setting the owner sets in CAD Settings > General, so it's the same for every
 * user and the same on the server and the client.
 */
export function useEmergencyNumberMessages<T>(messages: T, cadEmergencyNumber?: string | null): T {
  const emergencyNumber =
    sanitizeEmergencyNumber(cadEmergencyNumber ?? "") || DEFAULT_EMERGENCY_NUMBER;

  return React.useMemo(() => {
    if (!messages || emergencyNumber === DEFAULT_EMERGENCY_NUMBER) return messages;
    return replaceInMessages(messages, emergencyNumber) as T;
  }, [messages, emergencyNumber]);
}
