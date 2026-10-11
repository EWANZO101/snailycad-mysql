# SnailyCAD Radio for FiveM

Push-to-talk radio for FiveM that shares its channels with SnailyCAD. Players talk on their
handheld, and dispatchers answer from the CAD in any web browser: no FiveM, TeamSpeak or anything
else needed on the dispatch side.

- **One radio network**: players in game, dispatchers in the CAD (Dispatch page, LEO / EMS-FD
  pages, or the full-screen `/radio` page) and other integrations all hear each other.
- **Works with any voice script**: radio audio goes through SnailyCAD, next to your proximity
  voice (pma-voice, SaltyChat, TokoVOIP, mumble-voip or none). The voice script's own radio is
  switched off so nobody ends up with two radios.
- **3D**: a handheld in the character's hand with a talk animation (shoulder mic in vehicles),
  and **positional audio**: players standing next to someone hear their radio, quieter with
  distance and from the right side, unless that person wears an **earpiece**.
- **Dispatch control**: when dispatch sets a unit's radio channel in the CAD, the player's radio
  switches; dispatchers can talk over anyone (priority) and send alert / panic tones.
- **Access**: ESX, QBCore and Qbox jobs, ACE permissions or everyone; jobs map to CAD departments
  so department-only channels work in game too.

Everything below is also in the CAD docs: **Installation → Radio → FiveM**.

## Requirements

- SnailyCAD (MySQL / MariaDB edition) with the **Radio** feature turned on and at least one
  channel (CAD Settings → Radio).
- **The CAD's API must be on HTTPS** (`https://cad-api.example.com/v1`). FiveM's in-game browser
  only connects to secure (`wss://`) radio servers. Set up a domain and a reverse proxy as in the
  CAD docs.
- The **CAD API token** turned on (CAD Settings → API Token).

## Install

1. Copy the `snailycad-radio` folder into your server's `resources` folder and add
   `ensure snailycad-radio` to `server.cfg`.
2. Connect it to the CAD: you need the CAD's **API address** (e.g. `https://cad-api.example.com/v1`)
   and the **CAD API token** (CAD Settings → API Token, turned on). Pick one way:
   - **In game (easiest):** join as a server admin. The setup pops up by itself while the radio
     isn't set up; later open it with `/radiosetup` or **F4**. Enter both, press **Test**, then
     **Save**: radios connect right away, no restart.
   - **Server console / txAdmin Live Console:**

     ```
     snailyradio_setup https://cad-api.example.com/v1 YOUR_CAD_API_TOKEN
     ```

     (`snailyradio_setup clear` removes the saved settings.)

   - **server.cfg** (wins over the two above):

     ```cfg
     set snailycad_radio_api_url "https://cad-api.example.com/v1"
     set snailycad_radio_api_token "YOUR_CAD_API_TOKEN"
     ```

     Use `set`, not `setr`: the token must stay on the server. `server.cfg` is only read when the
     server starts; to apply it now, type the two `set` lines in the console and
     `restart snailycad-radio`.

3. Check: `snailyradio_check` in the server console prints `OK` and your channels.
4. Check `config.lua`: which jobs get a radio (`Config.Jobs`) and their CAD departments, keys,
   positional audio, the prop. Admins for the setup are `Config.AdminAces` (`command` = server
   admins) plus ESX `admin` / `superadmin` groups and QBCore `admin` / `god`.

## Using it in game

| Action                                                | Default                                                                    |
| ----------------------------------------------------- | -------------------------------------------------------------------------- |
| Push to talk                                          | **Caps Lock** (hold)                                                       |
| Open the handheld (channels, volume, earpiece, power) | `/radio`                                                                   |
| Change channel                                        | `/radiochannel <name, frequency or number>`, or the arrows on the handheld |
| Earpiece in / out                                     | `/earpiece`                                                                |

Players can rebind every key in **Settings → Key Bindings → FiveM** ("Radio: …").

## Voice scripts

| Voice script    | What the resource does                                               | Your settings                           |
| --------------- | -------------------------------------------------------------------- | --------------------------------------- |
| **pma-voice**   | turns pma-voice's radio off (`radioEnabled`), proximity voice stays  | nothing, or `setr voice_enableRadios 0` |
| **SaltyChat**   | nothing to turn off (SaltyChat has no radio until a script sets one) | nothing                                 |
| **TokoVOIP**    | removes the player from TokoVOIP radio channels                      | remove other TokoVOIP radio scripts     |
| **mumble-voip** | turns mumble-voip's radio off (`radioEnabled`)                       | nothing                                 |
| none            |                                                                      |                                         |

Prefer to keep your voice script's own radio audio? Set `Config.VoiceSync = true`: the voice
script's radio is moved to the same channel number as the CAD radio (the channel's frequency, its
position in the CAD, or `Config.VoiceSyncChannels`). Dispatchers in the browser only hear what goes
through the SnailyCAD radio, so the regular mode is recommended.

## For script developers

Client exports (`exports["snailycad-radio"]:…`):

| Export                              |                                                             |
| ----------------------------------- | ----------------------------------------------------------- |
| `HasRadio()` / `IsRadioOn()`        | does the player have a radio / is it on                     |
| `IsTalking()`                       | transmitting right now                                      |
| `GetChannel()`                      | channel id, channel name                                    |
| `GetChannels()`                     | `{ id, name, frequency, canTransmit }[]`                    |
| `SetChannel(value)`                 | by id, name, frequency or number                            |
| `HasEarpiece()` / `SetEarpiece(on)` |                                                             |
| `SetPower(on)` / `OpenRadio()`      |                                                             |
| `StartTalking()` / `StopTalking()`  | push-to-talk from your own script (e.g. a car radio button) |

Client events: `snailycad-radio:channelChanged (id, name)`, `snailycad-radio:talking (on, channel)`,
`snailycad-radio:received (name, on, channel)` (someone else talks on your channel).

Server exports: `GetPlayerChannel(src)`, `IsPlayerTalking(src)`, `HasEarpiece(src)`,
`SetPlayerChannel(src, value)`, `SetPlayerRadioPower(src, on)`, `PlayTone(src, tone)`,
`RefreshPlayer(src)` (after you changed someone's job), `GetChannels()`, `GetPlayersOnChannel(id)`.

Every player's radio is also in the state bag `Player(src).state.snailyRadio`
(`{ on, channel, earpiece, talking }`).

## Rebuilding the UI

The in-game UI (`html/app.js`) is built from `web/src/app.ts` and the CAD's radio library. You only
need this if you change the TypeScript:

```bash
pnpm --filter @snailycad/radio build
node integrations/fivem/build.mjs
```

## Troubleshooting

- **`snailyradio_check` says 401**: the API token is wrong, or the API token is turned off in the
  CAD.
- **Says the CAD refused (400)**: turn on the Radio feature in CAD Settings → Features.
- **No channels**: add channels in CAD Settings → Radio and leave "Allow FiveM and other radios"
  on (or give the job's departments access).
- **Players connect but hear nothing / can't talk**: the CAD API must be HTTPS. Open the in-game
  console (F8) and look for `[snailycad-radio]` errors; set `Config.Debug = true` for more.
- **"You don't have a radio"**: the player's job isn't in `Config.Jobs` (or off duty), and they
  don't have the `snailycad.radio` ACE permission.
