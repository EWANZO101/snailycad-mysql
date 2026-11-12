import assert from "node:assert/strict";
import { test } from "node:test";
import { loadConfig } from "../src/config.mjs";

const base = {
  cadApi: "https://cad.example.com/v1",
  cadApiToken: "cad",
  discordToken: "bot",
  bridges: [{ guildId: "1", voiceChannelId: "2", radioChannel: "Dispatch 1" }],
};

test("defaults and grouping by bot token", () => {
  const { byToken } = loadConfig({
    ...base,
    bridges: [
      ...base.bridges,
      { guildId: "1", voiceChannelId: "3", radioChannel: "Fire", discordToken: "bot2" },
    ],
  });
  assert.equal(byToken.size, 2);
  const [entry] = byToken.get("bot");
  assert.equal(entry.talkFromDiscord, true);
  assert.deepEqual(entry.allowedRoleIds, []);
  assert.equal(entry.cadApiToken, "cad");
});

test("environment variables win over the file", () => {
  const { byToken } = loadConfig(base, { DISCORD_TOKEN: "env-bot", CAD_API_TOKEN: "env-cad" });
  assert.equal(byToken.get("env-bot")[0].cadApiToken, "env-cad");
});

test("one bot can't bridge two channels in the same server", () => {
  assert.throws(
    () =>
      loadConfig({
        ...base,
        bridges: [...base.bridges, { guildId: "1", voiceChannelId: "3", radioChannel: "Fire" }],
      }),
    /only be in one voice channel per server/,
  );
});

test("missing settings are explained", () => {
  assert.throws(() => loadConfig({ ...base, cadApi: "cad.example.com" }), /cadApi/);
  assert.throws(() => loadConfig({ ...base, cadApiToken: "" }), /cadApiToken/);
  assert.throws(() => loadConfig({ ...base, bridges: [{ guildId: "1" }] }), /voiceChannelId/);
  assert.throws(() => loadConfig({ ...base, discordToken: undefined }), /Discord bot token/);
});
