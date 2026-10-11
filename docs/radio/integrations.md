# Integrating other radios and scripts

There are four ways to connect something to the SnailyCAD radio, from the simplest to the most
complete. Pick the first one that does what you need.

|                                                            | What it's for                                                     | You need                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------- |
| [1. FiveM exports and events](#1-fivem-exports-and-events) | other FiveM scripts: phones, MDTs, job scripts, car radios        | the `snailycad-radio` resource                 |
| [2. Voice script adapters](#2-voice-scripts)               | pma-voice, SaltyChat, TokoVOIP, mumble-voip                       | nothing: automatic                             |
| [3. CAD REST API](#3-cad-rest-api)                         | read channels, move units, play tones, see who's on air           | the CAD API token                              |
| [4. Full radio client](#4-full-radio-client)               | your own radio: a bot, a logger, a hardware gateway, another game | the CAD API token + [protocol.md](protocol.md) |

## 1. FiveM exports and events

The `snailycad-radio` resource exports everything another resource needs (full list in its
[README](../../integrations/fivem/snailycad-radio/README.md#for-script-developers)):

```lua
-- client: a "radio" app on a phone
local channel, name = exports["snailycad-radio"]:GetChannel()
exports["snailycad-radio"]:SetChannel("Fire Ops")          -- by id, name, frequency or number
exports["snailycad-radio"]:SetEarpiece(true)

-- client: push-to-talk from a car radio button
exports["snailycad-radio"]:StartTalking()
exports["snailycad-radio"]:StopTalking()

-- client: react to the radio
AddEventHandler("snailycad-radio:talking", function(on, channel) end)        -- we transmit
AddEventHandler("snailycad-radio:received", function(name, on, channel) end) -- someone else
AddEventHandler("snailycad-radio:channelChanged", function(id, name) end)

-- server: a /panic command that moves an officer to the emergency channel and beeps
exports["snailycad-radio"]:SetPlayerChannel(source, "Emergency")
exports["snailycad-radio"]:PlayTone(source, "panic")
local players = exports["snailycad-radio"]:GetPlayersOnChannel(channelId)

-- server: you changed someone's job yourself
exports["snailycad-radio"]:RefreshPlayer(source)
```

Every player's radio state is in a state bag, readable from any resource on both sides:

```lua
local radio = Player(serverId).state.snailyRadio -- { on, channel, earpiece, talking }
```

### Replacing another radio resource

Already using a radio script (rp-radio, ps-radio, qb-radioapp, …) with `pma-voice` radio
channels? Remove it, or keep its UI and make its buttons call the exports above instead of
`exports["pma-voice"]:setRadioChannel`. Players then talk through SnailyCAD, so dispatchers in
the browser hear them.

## 2. Voice scripts

The radio's audio goes through SnailyCAD, next to whichever proximity voice script you use. The
resource switches the voice script's own radio off so players don't get two radios:

| Voice script | Detected by               | Done automatically                                |
| ------------ | ------------------------- | ------------------------------------------------- |
| pma-voice    | `pma-voice` started       | `setVoiceProperty("radioEnabled", false)`         |
| SaltyChat    | `saltychat` started       | nothing needed (no radio until a script sets one) |
| TokoVOIP     | `tokovoip_script` started | `removePlayerFromRadio()`                         |
| mumble-voip  | `mumble-voip` started     | `SetMumbleProperty("radioEnabled", false)`        |

Force one with `Config.VoiceScript = "pma-voice"` (etc.) or keep its radio with
`Config.DisableVoiceScriptRadio = false`.

**Keep the voice script's radio audio instead** (`Config.VoiceSync = true`): the resource moves
the voice script's radio to the matching channel (`setRadioChannel` / `SetRadioChannel` /
`addPlayerToRadio`), using `Config.VoiceSyncChannels`, the channel's frequency or its position in
the CAD. In-game players then hear each other through the voice script, and the CAD still knows
who is on which channel and can move them. Browser dispatchers only hear players who talk through
SnailyCAD, so prefer the default mode if dispatch works from the browser.

**Another voice script**: everything goes through `client/voice.lua`. Add a branch in
`Voice.init` (switch its radio off) and `Voice.syncChannel` (move its radio), detected by its
resource name.

## 3. CAD REST API

All under your API URL (`https://cad-api.example.com/v1`). Integrations authenticate with the CAD
API token in the `snaily-cad-api-token` header (Admin → CAD Settings → API Token).

| Endpoint                              | Auth        |                                                                                                                        |
| ------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------- |
| `POST /radio/external/token`          | API token   | a radio token for one person (see [protocol](protocol.md#1-get-a-radio-token)); also returns the channels they can use |
| `GET /radio/channels`                 | API token   | all radio channels `{ id, name, frequency, description, receiveOnly }`                                                 |
| `GET /radio/status`                   | API token   | who is on which channel and who is talking right now                                                                   |
| `POST /radio/channels/:id/tone`       | API token   | play a tone (`{ "tone": "alert" }`, `"panic"`, `"beep"`) on a channel                                                  |
| `PUT /dispatch/radio-channel/:unitId` | API token   | move a unit to a channel (`{ "radioChannel": "<channel id>" }`): the unit's radios switch                              |
| `POST /radio/token`                   | CAD session | a radio token for the signed-in user (used by the CAD itself)                                                          |

```bash
curl -X POST https://cad-api.example.com/v1/radio/channels/<id>/tone \
  -H "snaily-cad-api-token: $TOKEN" -H "Content-Type: application/json" -d '{"tone":"alert"}'
```

## 4. Full radio client

Anything that can open a WebSocket can be a radio: get a token (section 3), connect, `join` a
channel, and send / receive 20 ms mu-law frames. The [protocol](protocol.md) is short, and there
are two complete, tested examples:

- [`examples/node-radio.mjs`](examples/node-radio.mjs): Node.js, joins a channel, prints who
  talks, transmits a WAV file.
- [`examples/python-radio.py`](examples/python-radio.py): Python, the same, and records what it
  hears to a WAV file.

```bash
CAD_API=https://cad-api.example.com/v1 CAD_API_TOKEN=... python3 python-radio.py "Dispatch 1" --record traffic.wav --seconds 3600
```

Ideas:

- **Radio logger**: record every channel to files with timestamps (one listen-only connection per
  channel).
- **Discord bridge**: a Discord bot that joins a voice channel and a radio channel and passes
  audio both ways (Discord's 48 kHz Opus ⇄ 16 kHz mu-law).
- **Hardware gateway**: a Raspberry Pi with a USB sound card wired to a real radio: VOX or a GPIO
  push-to-talk becomes `ptt`, the speaker output becomes frames.
- **Another game**: anything with HTTP + WebSocket (Garry's Mod, RedM, Arma, a Minecraft plugin)
  can run the same client as the FiveM resource.

For a web page, use the CAD's own client library instead of writing one:

```ts
import { RadioClient } from "@snailycad/radio/browser";

const radio = new RadioClient({ getToken: () => fetchTokenFromYourBackend() });
await radio.connect();
radio.join(channelId);
await radio.startTransmit(); // microphone; needs HTTPS
radio.stopTransmit();
radio.on("talk", ({ name, on }) => console.log(name, on));
```

It handles microphone capture, playback with the radio sound, tones, reconnecting and LiveKit.

### Rules for integrations

- Wait for `ready` before `join`, and for `granted` before sending audio.
- Send audio in real time (one 20 ms frame every 20 ms); the server drops more than 60 frames a
  second.
- Release push-to-talk (`ptt` with `on: false`); a transmission is cut after 60 seconds anyway.
- Ignore message types you don't know: new ones may be added.
- Never put the CAD API token in a client (browser, game client): get tokens on your server and
  hand out the radio token only.
