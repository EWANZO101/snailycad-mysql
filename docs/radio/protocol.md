# SnailyCAD Radio protocol (v1)

This is the contract between the SnailyCAD API and every radio client: the browser console in the
CAD, the FiveM resource (`integrations/fivem/snailycad-radio`) and any third-party radio. If you
are building an integration, this file and [integrations.md](integrations.md) are all you need.

## Concepts

- **Channel**: a talk group managed in **Admin → Radio channels** (`id`, `name`, `frequency`,
  optional department restrictions). Everyone on a channel hears everyone who transmits on it.
- **Member** vs **listener**: a member can transmit and is shown in the channel's member list. A
  listener only receives audio (a dispatcher scanning channels, or a FiveM player standing next to
  someone whose radio is on speaker).
- **Half duplex**: one person talks on a channel at a time. A second transmission gets `busy`,
  except for dispatchers, who take over the channel (priority).
- **Control plane**: always a WebSocket to the SnailyCAD API, `wss://<api>/v1/radio/ws`.
- **Audio plane**: either the same WebSocket (`transport: "builtin"`) or a LiveKit server
  (`transport: "livekit"`), chosen by the CAD admin. Control messages are identical in both modes.

## 1. Get a radio token

Every connection starts with a short-lived radio token (a JWT, valid 12 hours).

| Who                                          | Request                         | Auth                                           |
| -------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| CAD user (browser)                           | `POST /v1/radio/token`          | the CAD session cookie                         |
| Game server / external radio, for one player | `POST /v1/radio/external/token` | header `snaily-cad-api-token: <CAD API token>` |

External request body:

```json
{
  "name": "John Doe | 1A-12",
  "identity": "fivem:license:abc123",
  "identifiers": { "discordId": "1234", "steamId": "76561197960265728" },
  "kind": "game",
  "departments": ["LSPD"],
  "proximity": true,
  "listenOnly": false
}
```

| Field         | Meaning                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`        | Shown to everyone on the radio.                                                                                                                                                 |
| `identity`    | Your stable id for this person (unique within your integration).                                                                                                                |
| `identifiers` | Links the person to a CAD user (the user's Discord or Steam account). A linked person gets that user's channel access and follows dispatch channel changes made for their unit. |
| `kind`        | `game` (a player in a game) or `external` (anything else, e.g. a hardware gateway or a bot).                                                                                    |
| `departments` | CAD department names or ids this person counts as (e.g. mapped from their job), for department-only channels.                                                                   |
| `proximity`   | May overhear nearby radios: `join` with `mode: "listen"` on channels that allow outside radios.                                                                                 |
| `listenOnly`  | No radio of their own: never joins as a member, only overhears (needs `proximity`).                                                                                             |

Channels with **Allow FiveM and other radios** turned off only accept people linked to a CAD user
with access to them, and can't be overheard.

Response (both endpoints):

```json
{
  "token": "eyJhbGciOi…",
  "wsUrl": "wss://cad-api.example.com/v1/radio/ws",
  "transport": "builtin",
  "livekitUrl": null,
  "identity": { "id": "u:clx…", "name": "John Doe", "kind": "dispatcher", "userId": "clx…" },
  "channels": [{ "id": "clx…", "name": "Dispatch 1", "frequency": "154.430", "canTransmit": true }],
  "audio": { "codec": "mulaw", "sampleRate": 16000, "frameMs": 20 }
}
```

## 2. WebSocket control messages

Text frames are JSON objects with a `t` (type) field. Unknown types must be ignored.

### Client → server

| `t`     | Fields                                       | Meaning                                                                 |
| ------- | -------------------------------------------- | ----------------------------------------------------------------------- |
| `hello` | `token`, `client` (e.g. `"browser/1.0"`)     | Must be the first message.                                              |
| `join`  | `channel`, `mode` (`"member"` \| `"listen"`) | Join a channel.                                                         |
| `leave` | `channel`                                    | Leave a channel.                                                        |
| `ptt`   | `channel`, `on` (bool)                       | Start / stop transmitting.                                              |
| `state` | `earpiece` (bool), `speaker` (bool)          | Optional: radio state, shown to dispatch and used for positional audio. |
| `ping`  | `ts`                                         | Keep-alive (send every 20 s).                                           |

### Server → client

| `t`         | Fields                                            | Meaning                                                                                                            |
| ----------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `ready`     | `identity`, `channels`, `transport`               | `hello` accepted.                                                                                                  |
| `joined`    | `channel`, `handle`, `mode`, `members`, `livekit` | Joined. `handle` is the number used in binary audio frames. In LiveKit mode `livekit` is `{ "room", "token" }`.    |
| `left`      | `channel`                                         | Left (also sent when access was removed).                                                                          |
| `members`   | `channel`, `members`                              | Member list changed: `[{ id, name, kind, talking, earpiece }]`.                                                    |
| `talk`      | `channel`, `id`, `name`, `on`                     | Someone started / stopped transmitting.                                                                            |
| `granted`   | `channel`                                         | Your `ptt on` was accepted: start sending audio.                                                                   |
| `busy`      | `channel`, `by`                                   | Your `ptt on` was refused: someone else is talking.                                                                |
| `preempted` | `channel`, `by`                                   | A dispatcher took the channel: stop sending audio.                                                                 |
| `switch`    | `channel`                                         | Dispatch moved you to this channel. Leave your current member channel and join this one.                           |
| `tone`      | `channel`, `tone`                                 | Play an alert tone (`"alert"`, `"panic"`, `"beep"` or a CAD tone name).                                            |
| `channels`  | `channels`                                        | Your channel list changed (an admin edited channels or your access). Channels you lost access to are `left` first. |
| `error`     | `code`, `message`                                 | Something went wrong; `fatal: true` means the server closes the socket.                                            |
| `pong`      | `ts`                                              | Reply to `ping`.                                                                                                   |

## 3. Audio (`transport: "builtin"`)

Audio travels as binary WebSocket frames.

```
offset  size  field
0       1     type     = 1 (audio)
1       1     codec    = 1 (mu-law, 16 kHz, mono)
2       2     handle   (uint16, big endian) from the "joined" message
4       2     seq      (uint16, big endian) per transmission, wraps
6       n     payload  (n = 320 bytes for 20 ms)
```

- Send frames only between `granted` and `ptt off`; the server drops anything else.
- The server forwards your frame, unchanged, to every other socket on that channel (members and
  listeners). Frames you receive use the same layout; the `talk` message tells you who is speaking.
- Payload: G.711 mu-law, 16 000 samples per second, 20 ms (320 samples) per frame. It is cheap to
  encode in any language and sounds like a real radio. At most 60 frames per second are accepted
  per socket and channel.
- Simulcast: a socket can hold the talk on several channels at once (send `ptt on` for each and
  wait for each `granted`). Send every frame once per granted channel, with that channel's handle.

## 4. Audio (`transport: "livekit"`)

Each channel is a LiveKit room. The `joined` message carries `{ room, token }`; connect with any
LiveKit SDK, subscribe to the room's audio, and publish your microphone only between `granted` and
`ptt off`. Listeners get subscribe-only tokens. Control (`ptt`, `talk`, `busy`, …) still goes over
the SnailyCAD WebSocket.

## 5. Positional audio and earpieces (games)

A game integration can let nearby players hear a radio:

1. The radio owner sends `state` with `earpiece: false`.
2. The game decides who is close enough and tells those players' clients to `join` the owner's
   channel with `mode: "listen"`.
3. Each listening client sets that channel's volume from the distance, and leaves when the player
   walks away or the owner puts the earpiece in.

The FiveM resource does all of this for you.
