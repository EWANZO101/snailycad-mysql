#!/usr/bin/env node
/**
 * Builds the FiveM radio's in-game UI (snailycad-radio/web/src -> snailycad-radio/html/app.js).
 * The output is committed, so server owners can drop the resource in without Node.js.
 *
 * usage: pnpm --filter @snailycad/radio build && node integrations/fivem/build.mjs
 */
import { rmSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
// esbuild comes with tsup (a dev dependency of the packages)
const require = createRequire(
  createRequire(path.join(root, "packages/radio/package.json")).resolve("tsup"),
);
const esbuild = require("esbuild");

const resource = path.join(here, "snailycad-radio");

// chunk names carry a content hash: drop the old ones
rmSync(path.join(resource, "html/chunks"), { recursive: true, force: true });

const result = await esbuild.build({
  entryPoints: [path.join(resource, "web/src/app.ts")],
  outdir: path.join(resource, "html"),
  entryNames: "app",
  chunkNames: "chunks/[name]-[hash]",
  bundle: true,
  splitting: true,
  format: "esm",
  // FiveM's CEF is Chromium 103+
  target: ["chrome103"],
  minify: true,
  sourcemap: false,
  legalComments: "none",
  nodePaths: [path.join(root, "packages/radio/node_modules"), path.join(root, "node_modules")],
  alias: {
    "@snailycad/radio/browser": path.join(root, "packages/radio/src/browser/index.ts"),
  },
  metafile: true,
  logLevel: "info",
});

const outputs = Object.entries(result.metafile.outputs)
  .map(([file, info]) => `${path.relative(resource, file)} ${(info.bytes / 1024).toFixed(1)} kB`)
  .join("\n  ");
console.log(`built:\n  ${outputs}`);
