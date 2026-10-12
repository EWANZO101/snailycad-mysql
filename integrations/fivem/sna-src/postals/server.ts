/**
 * Postal codes for the other sna-* resources: exports["sna-postals"].readPostalCodes().
 * Edit postals.json in this resource to use your own map's postals.
 */

const RESOURCE = GetCurrentResourceName();
let cached: unknown = null;

// globalThis: a bare `exports` would be the bundle's CommonJS exports

(globalThis as any).exports("readPostalCodes", () => {
  if (cached) return cached;

  const fileData = LoadResourceFile(RESOURCE, "postals.json");
  try {
    const postals: unknown = fileData ? JSON.parse(fileData) : null;
    if (!Array.isArray(postals)) throw new Error("postals.json is not a list");
    cached = postals;
    return postals;
  } catch (error) {
    console.error(
      `[${RESOURCE}] could not read postals.json: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
    return null;
  }
});
