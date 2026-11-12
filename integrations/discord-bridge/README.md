# SnailyCAD radio ⇄ Discord bridge

A Discord bot that links a **Discord voice channel** to a **SnailyCAD radio channel**, both ways:

- **Radio → Discord**: everything said on the radio channel (dispatchers in the CAD, units, FiveM
  players) plays in the Discord voice channel.
- **Discord → radio**: people talking in the voice channel go out on the radio **under their own
  Discord name**. Each speaker gets their own radio connection, linked to their Discord account,
  so the CAD applies that user's channel access, exactly like it does for FiveM players.

Why use it: browsers can't see keys pressed in other apps, so the CAD radio's push-to-talk only
works while the CAD is the active window. With the bridge, dispatchers and staff can talk on the
radio with **Discord's own push-to-talk**, from any app, and hear it without the CAD open.

## How it behaves

- The bridge shows up on the radio as **"&lt;name&gt; (Discord)"**, and each Discord speaker as
  their server nickname.
- The radio is half duplex: one person talks at a time. If a Discord user starts talking while
  someone is on the radio, they hear a low beep in Discord and their audio isn't sent. Dispatchers
  in the CAD can still take over the channel, as usual.
- Discord users never hear themselves echoed back.
- Speaking in Discord transmits right away (Discord already only sends audio while you speak or
  hold push-to-talk). The **first time** someone talks, their radio connection is set up first,
  so the start of that first sentence can be cut. After that it's instant (connections stay open
  for 10 minutes after the last time they talk).
- Audio is radio quality (16 kHz), like everywhere else on the CAD radio.

## Requirements

- **Node.js 22.12 or newer** on the machine that runs the bot (the CAD server is fine).
- The CAD radio's audio server set to **Built-in** (Admin → CAD Settings → Radio → Audio server).
  LiveKit isn't supported by the bridge.
- Your **CAD API token**: Admin → CAD Settings → API Token (turn it on and copy it).
- The radio channel needs **"Allow FiveM and other radios"** turned on, unless every Discord user
  who talks is linked to a CAD account (Discord login) with access to that channel.

## Setup

### 1. Create the Discord bot

1. Go to <https://discord.com/developers/applications> → **New Application** → **Bot**.
2. **Reset Token** and copy it (this is `discordToken`). No privileged intents are needed.
3. **OAuth2 → URL Generator**: scope `bot`, permissions **View Channels**, **Connect** and
   **Speak**. Open the URL and add the bot to your server.
4. In Discord, turn on **Developer Mode** (User Settings → Advanced), then right-click your server
   → **Copy Server ID** (`guildId`) and the voice channel → **Copy Channel ID**
   (`voiceChannelId`).

One bot can only be in **one voice channel per server**. To bridge several channels in the same
server, create one bot per channel and give each bridge its own `discordToken`.

### 2. Install

```bash
cd integrations/discord-bridge
npm install
cp config.example.json config.json
```

Edit `config.json`:

| Setting                     | What it is                                                                      |
| --------------------------- | ------------------------------------------------------------------------------- |
| `cadApi`                    | Your CAD API URL, ending in `/v1`, e.g. `https://cad-api.example.com/v1`        |
| `cadApiToken`               | The CAD API token                                                               |
| `discordToken`              | The bot token                                                                   |
| `bridges[].name`            | Shown on the radio as "&lt;name&gt; (Discord)"                                  |
| `bridges[].guildId`         | The Discord server id                                                           |
| `bridges[].voiceChannelId`  | The Discord voice channel id                                                    |
| `bridges[].radioChannel`    | The radio channel: its name, frequency or id                                    |
| `bridges[].talkFromDiscord` | `false` = listen only (radio → Discord)                                         |
| `bridges[].allowedRoleIds`  | Only members with one of these Discord roles can talk on the radio (empty: all) |
| `bridges[].volume`          | Radio volume in Discord, 0–2 (default 1)                                        |
| `bridges[].discordToken`    | Another bot for this bridge (needed for a 2nd channel in the same server)       |

`CAD_API`, `CAD_API_TOKEN` and `DISCORD_TOKEN` environment variables override the file, if you'd
rather not keep secrets in it.

### 3. Run

```bash
npm start
```

You should see `in Discord voice channel #…` and `connected to the radio`.

To keep it running, use the systemd unit in this folder:

```bash
sudo cp snailycad-discord-bridge.service /etc/systemd/system/
sudo nano /etc/systemd/system/snailycad-discord-bridge.service   # fix the paths
sudo systemctl daemon-reload
sudo systemctl enable --now snailycad-discord-bridge
journalctl -u snailycad-discord-bridge -f
```

Or with Docker:

```bash
docker build -t snailycad-discord-bridge .
docker run -d --name snailycad-discord-bridge --restart unless-stopped \
  -v "$PWD/config.json:/app/config.json:ro" snailycad-discord-bridge
```

## Tips for people using it

- Use **push-to-talk** in Discord, not Voice Activity, in the bridged channel. Otherwise
  background noise and side conversations go out on the radio.
- Turn off Discord's **Attenuation** (User Settings → Voice & Video) if you also have the CAD
  radio open, so Discord doesn't turn it down.
- Don't have the CAD radio _and_ the bridged Discord channel playing the same radio channel at
  the same time: you'd hear everything twice.

## Troubleshooting

| Message                                          | Fix                                                                                                                                |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `radio token: HTTP 401` / `403`                  | The CAD API token is wrong, or the API token is turned off in CAD Settings.                                                        |
| `can't use radio channel "…"`                    | Check `radioChannel`, and turn on "Allow FiveM and other radios" on that channel (or link the users' Discord accounts to the CAD). |
| `… can't use the radio: …` for one Discord user  | That user has no access to the channel (see above). Everyone else still works.                                                     |
| `uses the "livekit" audio server`                | Switch the CAD radio to the built-in audio server.                                                                                 |
| The bot joins but nobody hears the radio         | Give the bot the **Speak** permission in that channel.                                                                             |
| `this bot already bridges a channel in server …` | One bot per voice channel in the same server: add another bot's token to that bridge.                                              |

## Development

```bash
npm test
```

Audio conversion, the config checks and the radio client (against a mock radio server) are
tested. The protocol is in [docs/radio/protocol.md](../../docs/radio/protocol.md).
