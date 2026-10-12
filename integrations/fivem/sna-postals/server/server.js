// Built from integrations/fivem/sna-src by build-sna.mjs. Edit the sources, not this file.
"use strict";

// sna-src/postals/server.ts
var RESOURCE = GetCurrentResourceName();
var cached = null;
globalThis.exports("readPostalCodes", () => {
  if (cached)
    return cached;
  const fileData = LoadResourceFile(RESOURCE, "postals.json");
  try {
    const postals = fileData ? JSON.parse(fileData) : null;
    if (!Array.isArray(postals))
      throw new Error("postals.json is not a list");
    cached = postals;
    return postals;
  } catch (error) {
    console.error(
      `[${RESOURCE}] could not read postals.json: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
});
