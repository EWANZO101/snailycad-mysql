#!/usr/bin/env node
/* eslint-disable quotes -- the Lua manifest lines are full of double quotes */
/**
 * Builds the sna-* FiveM resources (sna-call911, sna-calltow, sna-calltaxi, sna-alpr, sna-postals,
 * sna-sync) from sna-src. The output is committed, so server owners can drop the resources in
 * without Node.js.
 *
 * usage: node integrations/fivem/build-sna.mjs
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const src = path.join(here, "sna-src");
// esbuild comes with tsup (a dev dependency of the packages)
const require = createRequire(
  createRequire(path.join(root, "packages/radio/package.json")).resolve("tsup"),
);
const esbuild = require("esbuild");

const { version } = JSON.parse(readFileSync(path.join(src, "version.json"), "utf8"));
const REPOSITORY = "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem";
const BANNER =
  "// Built from integrations/fivem/sna-src by build-sna.mjs. Edit the sources, not this file.";

/** @type {{ name: string, description: string, chat?: boolean, client?: boolean, nui?: boolean }[]} */
const RESOURCES = [
  {
    name: "call911",
    description: "/sn-call911: report a 911 call to SnailyCAD",
    chat: true,
    client: true,
  },
  {
    name: "calltow",
    description: "/sn-calltow: request a tow truck through SnailyCAD",
    chat: true,
    client: true,
  },
  {
    name: "calltaxi",
    description: "/sn-calltaxi: request a taxi through SnailyCAD",
    chat: true,
    client: true,
  },
  {
    name: "alpr",
    description: "ALPR for Wraith ARS 2X: plate and BOLO checks in SnailyCAD",
    client: true,
  },
  { name: "postals", description: "Postal codes for the sna-* resources (edit postals.json)" },
  {
    name: "sync",
    description: "Sync SnailyCAD with FiveM: unit status, 911 calls, panic button, live alerts",
    chat: true,
    client: true,
    nui: true,
  },
];

function manifest(resource) {
  const lines = [
    'fx_version "cerulean"',
    'game "gta5"',
    'node_version "22"',
    "",
    `name "sna-${resource.name}"`,
    `description "${resource.description}"`,
    'author "Casper Iversen, SnailyCAD community"',
    `version "${version}"`,
    `repository "${REPOSITORY}"`,
    "",
  ];
  if (resource.chat) lines.push('dependency "chat"', "");
  if (resource.nui) {
    lines.push(
      'ui_page "nui/index.html"',
      "",
      "files {",
      '  "nui/index.html",',
      '  "nui/style.css",',
      '  "nui/app.js",',
      "}",
      "",
    );
  }
  lines.push('server_script "server/server.js"');
  if (resource.client) lines.push('client_script "client/client.js"');
  return `${lines.join("\n")}\n`;
}

/**
 * socket.io-client runs websocket-only here. Its long-polling fallback would bundle
 * xmlhttprequest-ssl (fs + child_process); swap it for an empty stub (engine.io only probes it).
 */
const noPollingPlugin = {
  name: "no-polling",
  setup(build) {
    build.onResolve({ filter: /^xmlhttprequest-ssl$/ }, () => ({ path: "xhr", namespace: "stub" }));
    build.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
      contents: "module.exports = function XMLHttpRequest() {};",
      loader: "js",
    }));
  },
};

const common = {
  // the "// path" comments in the output are relative to this, so any cwd gives the same files
  absWorkingDir: here,
  bundle: true,
  minify: false,
  legalComments: "none",
  charset: "utf8",
  banner: { js: BANNER },
  logLevel: "warning",
  // socket.io-client (sna-sync) comes from the CAD's web client
  nodePaths: [path.join(root, "apps/client/node_modules"), path.join(root, "node_modules")],
  metafile: true,
};

const summary = [];
for (const resource of RESOURCES) {
  const name = `sna-${resource.name}`;
  const out = path.join(here, name);
  const entryDir = path.join(src, resource.name);

  for (const dir of ["server", "client", "nui"]) {
    rmSync(path.join(out, dir), { recursive: true, force: true });
  }
  mkdirSync(out, { recursive: true });

  const builds = [
    esbuild.build({
      ...common,
      entryPoints: [
        path.join(
          entryDir,
          existsSync(path.join(entryDir, "server/main.ts")) ? "server/main.ts" : "server.ts",
        ),
      ],
      outfile: path.join(out, "server/server.js"),
      platform: "node",
      format: "cjs",
      target: "node22",
      // optional native speed-ups of ws, loaded in a try/catch
      external: ["bufferutil", "utf-8-validate"],
      plugins: [noPollingPlugin],
    }),
  ];

  if (resource.client) {
    builds.push(
      esbuild.build({
        ...common,
        entryPoints: [
          path.join(
            entryDir,
            existsSync(path.join(entryDir, "client/main.ts")) ? "client/main.ts" : "client.ts",
          ),
        ],
        outfile: path.join(out, "client/client.js"),
        platform: "neutral",
        format: "iife",
        target: "es2020",
      }),
    );
  }

  if (resource.nui) {
    builds.push(
      esbuild.build({
        ...common,
        entryPoints: [path.join(entryDir, "nui/app.ts")],
        outfile: path.join(out, "nui/app.js"),
        platform: "browser",
        format: "iife",
        // FiveM's CEF is Chromium 103+
        target: "chrome103",
        minify: true,
      }),
    );
  }

  const results = await Promise.all(builds);

  if (resource.nui) {
    for (const file of ["index.html", "style.css"]) {
      copyFileSync(path.join(entryDir, "nui", file), path.join(out, "nui", file));
    }
  }
  if (resource.name === "postals") {
    copyFileSync(path.join(src, "lib/postals.json"), path.join(out, "postals.json"));
  }
  writeFileSync(path.join(out, "fxmanifest.lua"), manifest(resource));

  for (const result of results) {
    for (const [file, info] of Object.entries(result.metafile.outputs)) {
      summary.push(`${path.relative(here, file)} ${(info.bytes / 1024).toFixed(1)} kB`);
    }
  }
}

console.log(`built sna-* ${version}:\n  ${summary.join("\n  ")}`);
