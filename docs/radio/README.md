# SnailyCAD Radio

> **Installing it?** Follow the step-by-step guide:
> **[Install the radio](https://snaily-doc.opslabsystems.cloud/docs/radio/install)** (CAD side, FiveM
> resource, test, common problems).

A push-to-talk radio built into SnailyCAD. Everyone on a channel hears each other, wherever they
are:

- **Dispatchers and admins in a web browser**: the radio dock on every page of the CAD (with a
  pop-out window), or the full-screen radio console at `/radio`. Listen to any or all channels,
  pick one to talk on, push-to-talk with a hotkey on any page. Nothing to install: no FiveM,
  TeamSpeak or Discord. Only users with the Dispatch or Manage CAD Settings permission (and the
  owner) get the browser radio.
- **Units and players in FiveM** with the [`snailycad-radio`](../../integrations/fivem/snailycad-radio)
  resource: a handheld in hand, positional audio for people nearby, earpieces.
- **Anything else** through the open [protocol](protocol.md): bots, loggers, hardware radio
  gateways, other games. See [integrations.md](integrations.md).

| Guide                                                                |                                             |
| -------------------------------------------------------------------- | ------------------------------------------- |
| [Set up the radio](#set-up-the-radio)                                | turn it on, add channels                    |
| [FiveM resource](../../integrations/fivem/snailycad-radio/README.md) | install, voice scripts, keys, exports       |
| [Integrations](integrations.md)                                      | connect other radios and scripts            |
| [LiveKit](livekit.md)                                                | optional media server for large communities |
| [Protocol](protocol.md)                                              | the wire format, for developers             |

## How it works

```
 browser dispatcher ──┐                         ┌── FiveM player (in-game UI)
 admin / pop-out    ──┼── wss://<api>/v1/radio/ws ──┼── FiveM player
 bot / gateway      ──┘   (SnailyCAD API)        └── ...
                              │
                              └─ optional: audio through a LiveKit server
```

- **Control** (who is on which channel, push-to-talk, who is talking, dispatch moving units,
  tones) always goes through the CAD's API.
- **Audio** goes through the same API connection (built in, default), or through a
  [LiveKit](livekit.md) server you pick in CAD Settings → Radio.
- Channels are **half duplex**: one person talks at a time; others get a "busy" tone.
  Dispatchers always get through: they take over the channel.
- Radio audio is band-limited and lightly saturated so it sounds like a real radio, with a chirp
  when you get the channel and when you let go.

## Set up the radio

1. **Turn it on**: Admin → CAD Settings → **Features** → **Radio**.
2. **Add channels**: Admin → CAD Settings → **Radio**. For each channel:
   - **Name** and **Frequency** (shown on the radios).
   - **Departments**: leave empty for everyone with radio access, or pick departments. Only units
     of those departments (and dispatchers) can use the channel.
   - **Allow FiveM and other radios**: when on, game servers and integrations can put people on
     the channel even without a CAD account, and nearby players can overhear it. Turn it off for
     channels only CAD users may hear.
   - **Receive only**: units listen, only dispatchers talk (e.g. an announcements channel).
3. **HTTPS**: browsers only allow microphone access on secure pages, and FiveM only connects to
   secure radio servers. Serve the CAD and its API over HTTPS (see the reverse proxy docs);
   listening works without it, talking doesn't.
4. **Use it**: dispatchers open the Dispatch page (radio dock, bottom left) or `/radio`. Tick the
   channels to listen to, click a channel to talk on it, and hold the button or the
   push-to-talk key (default **`**, change it in the dock's settings).
5. **FiveM**: install the [resource](../../integrations/fivem/snailycad-radio/README.md).

### Who can use which channel

| Who                                                    | Channels                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Dispatchers (Dispatch permission)                      | every channel, and they take over a busy channel                                                                      |
| Units linked in game (LEO / EMS-FD permission)         | channels without departments, and channels of their units' departments                                                |
| Game players / integrations                            | channels with "Allow FiveM and other radios" on, without departments or of the departments the game server gives them |
| Game players linked to a CAD account (Discord / Steam) | what that CAD user can use                                                                                            |

Access changes (channels edited, the feature turned off) apply to connected radios right away.

### Dispatch

- **Move a unit**: in the Active Officers / EMS-FD list, set the unit's radio channel. With the
  radio on, you pick one of the radio channels and the unit's radios (browser and in game) switch
  to it.
- **Tones**: the Alert and Panic buttons on a channel play a tone on every radio on it.

## Configuration

Everything is set in the CAD, except LiveKit and an optional address override in the API's `.env`:

| Variable                                                                 |                                                                                             |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `RADIO_WS_URL`                                                           | the radio address clients connect to, when it isn't `NEXT_PUBLIC_PROD_ORIGIN` + `/radio/ws` |
| `RADIO_LIVEKIT_URL`, `RADIO_LIVEKIT_API_KEY`, `RADIO_LIVEKIT_API_SECRET` | a [LiveKit](livekit.md) server                                                              |

Reverse proxies must pass WebSocket upgrades on `/v1/radio/ws` (nginx: `proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade; proxy_set_header Connection "upgrade";`, which the
SnailyCAD nginx guide already sets for socket.io).
