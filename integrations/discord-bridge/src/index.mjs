#!/usr/bin/env node
/**
 * SnailyCAD radio <-> Discord voice bridge. See README.md.
 *
 *   node src/index.mjs [config.json]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Events, GatewayIntentBits } from "discord.js";
import { Bridge } from "./bridge.mjs";
import { loadConfig } from "./config.mjs";

const configPath = resolve(process.argv[2] ?? process.env.BRIDGE_CONFIG ?? "config.json");
let config;
try {
  config = loadConfig(JSON.parse(readFileSync(configPath, "utf8")), process.env);
} catch (error) {
  console.error(`Config ${configPath}: ${error.message}`);
  process.exit(1);
}

const bridges = [];

// one Discord client per bot token (a bot can only be in one voice channel per server)
for (const [token, entries] of config.byToken) {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
  });

  client.once(Events.ClientReady, async (ready) => {
    console.info(`Discord: logged in as ${ready.user.tag}`);
    for (const entry of entries) {
      const bridge = new Bridge(client, entry);
      bridges.push(bridge);
      try {
        await bridge.start();
      } catch (error) {
        console.error(`[${bridge.label}] couldn't start: ${error.message}`);
      }
    }
  });
  client.on(Events.Error, (error) => console.error(`Discord: ${error.message}`));

  await client.login(token);
}

function shutdown() {
  console.info("Stopping…");
  for (const bridge of bridges) bridge.stop();
  setTimeout(() => process.exit(0), 500);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
