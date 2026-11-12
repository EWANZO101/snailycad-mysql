/**
 * Validates config.json. Secrets can come from the environment instead:
 * CAD_API, CAD_API_TOKEN and DISCORD_TOKEN.
 */
export function loadConfig(raw, env = {}) {
  const cadApi = env.CAD_API || raw.cadApi;
  const cadApiToken = env.CAD_API_TOKEN || raw.cadApiToken;
  const discordToken = env.DISCORD_TOKEN || raw.discordToken;

  if (!cadApi || !/^https?:\/\//.test(cadApi)) {
    throw new Error('"cadApi" must be your CAD API URL, e.g. https://cad-api.example.com/v1');
  }
  if (!cadApiToken) {
    throw new Error('"cadApiToken" is missing (Admin > CAD Settings > API Token)');
  }
  if (!Array.isArray(raw.bridges) || !raw.bridges.length) {
    throw new Error('"bridges" needs at least one { guildId, voiceChannelId, radioChannel }');
  }

  const byToken = new Map();
  const seen = new Set();
  raw.bridges.forEach((bridge, index) => {
    const where = `bridges[${index}]`;
    for (const key of ["guildId", "voiceChannelId", "radioChannel"]) {
      if (!bridge[key] || typeof bridge[key] !== "string") {
        throw new Error(`${where}.${key} is missing`);
      }
    }
    const token = bridge.discordToken || discordToken;
    if (!token) throw new Error(`${where}: no Discord bot token ("discordToken")`);
    if (bridge.allowedRoleIds !== undefined && !Array.isArray(bridge.allowedRoleIds)) {
      throw new Error(`${where}.allowedRoleIds must be a list of role ids`);
    }
    if (bridge.volume !== undefined && !(bridge.volume >= 0 && bridge.volume <= 2)) {
      throw new Error(`${where}.volume must be between 0 and 2`);
    }

    // a bot can be in one voice channel per server
    const key = `${token}:${bridge.guildId}`;
    if (seen.has(key)) {
      throw new Error(
        `${where}: this bot already bridges a channel in server ${bridge.guildId}. A bot can only be in one voice channel per server; give this bridge its own "discordToken".`,
      );
    }
    seen.add(key);

    const list = byToken.get(token) ?? [];
    list.push({
      guildId: bridge.guildId,
      voiceChannelId: bridge.voiceChannelId,
      radioChannel: bridge.radioChannel,
      name: bridge.name,
      talkFromDiscord: bridge.talkFromDiscord !== false,
      allowedRoleIds: bridge.allowedRoleIds ?? [],
      volume: bridge.volume ?? 1,
      cadApi,
      cadApiToken,
    });
    byToken.set(token, list);
  });

  return { byToken };
}
