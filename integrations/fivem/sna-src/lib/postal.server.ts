/**
 * The nearest postal code to a position. Postal codes come from the sna-postals resource
 * (exports["sna-postals"].readPostalCodes) so servers can use their own map; the default list is
 * built in for when sna-postals isn't running.
 *
 * Originally created in Lua by nick-perry14 (https://github.com/nick-perry14).
 */
import defaultPostals from "./postals.json";

const fivemExports = (globalThis as any).exports;

interface Postal {
  x: number;
  y: number;
  code: string;
}

export function postalsEnabled() {
  return GetConvar("snailycad_use_postal", "false") === "true";
}

function getPostalCodes(): Postal[] {
  if (GetResourceState("sna-postals") === "started") {
    try {
      // globalThis: a bare `exports` would be the bundle's CommonJS exports
      const postals = fivemExports["sna-postals"].readPostalCodes();
      if (Array.isArray(postals) && postals.length) return postals as Postal[];
    } catch (error) {
      console.error(`[${GetCurrentResourceName()}] sna-postals:`, error);
    }
  }
  return defaultPostals as Postal[];
}

export function getPostal(position: { x: number; y: number }): string | null {
  let nearest: Postal | null = null;
  let minDistance = Infinity;

  for (const point of getPostalCodes()) {
    const distance = Math.hypot(point.x - position.x, point.y - position.y);
    if (distance < minDistance) {
      nearest = point;
      minDistance = distance;
    }
  }

  return nearest ? String(nearest.code) : null;
}

/** getPostal() if snailycad_use_postal is "true", else null */
export function postalFor(position: { x: number; y: number }) {
  return postalsEnabled() ? getPostal(position) : null;
}
