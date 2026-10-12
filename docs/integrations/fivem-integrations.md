# FiveM integrations (sna-call911, sna-sync, ...)

The `sna-*` resources are the SnailyCAD FiveM integrations (originally
[SnailyCAD/fivem-integrations](https://github.com/SnailyCAD/fivem-integrations) 0.14.3), updated for
this CAD. They work with the original SnailyCAD as well, so a server can switch CADs without
changing resources.

| Resource       | What it does                                                                  |
| -------------- | ----------------------------------------------------------------------------- |
| `sna-call911`  | `/sn-call911 <description>`: a 911 call at the player's position              |
| `sna-calltow`  | `/sn-calltow <description>`: a tow call                                       |
| `sna-calltaxi` | `/sn-calltaxi <description>`: a taxi call                                     |
| `sna-alpr`     | Wraith ARS 2X: a locked plate is searched in the CAD (vehicle, BOLOs, owner)  |
| `sna-postals`  | The postal code list the others use (edit its `postals.json` for your map)    |
| `sna-sync`     | Unit status, panic button, 911 call attach, traffic stops and live CAD alerts |

They are in `integrations/fivem/`. Copy the ones you want into your server's `resources` folder.
The built files are in the repository, so you don't need Node.js.

## Install

1. Copy the `sna-*` folders you want into `resources/`.
2. Add to `server.cfg`:

   ```cfg
   set snailycad_url "https://cad-api.example.com/v1"   # your CAD API address
   set snailycad_api_key "your-cad-api-token"           # CAD Settings > API Token (turned on)

   ensure chat
   ensure sna-postals    # before the others, if you use postals
   ensure sna-call911
   ensure sna-calltow
   ensure sna-calltaxi
   ensure sna-alpr       # needs Wraith ARS 2X
   ensure sna-sync
   ```

3. Restart the server. Each resource logs the CAD edition it uses, for example
   `[sna-sync] SnailyCAD edition: snailycad-mysql (auto-detected)`.

Requirements: a FiveM server artifact with Node.js 22 (`node_version "22"`, recent artifacts),
and the `chat` resource for the commands.

If the server already runs `snailycad-framework`, `snailycad_url` and `snailycad_api_key` can be
left out: the resources use `snailycad_framework_api_url` and `snailycad_framework_api_token`.

## Editions: how players are signed in

Commands that act as a player (`/sn-set-status`, `/sn-attach`, `/sn-panic-button`, ...) need to know
which CAD account the player has. That works differently per CAD:

| Edition           | CAD                       | How a player is signed in                                                                                                                   |
| ----------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `snailycad-mysql` | this CAD                  | Automatically. The CAD finds the account by the player's **Discord** or **Steam** account. Nothing to paste.                                |
| `original`        | the original SnailyCAD v4 | `/sn-auth`: the player pastes their Personal API Token (CAD > Account > API Token). The server checks it and remembers it for that license. |

`snailycad_edition` picks one:

```cfg
set snailycad_edition "auto"            # default: ask the CAD
set snailycad_edition "snailycad-mysql"
set snailycad_edition "original"

set sna_sync_edition "original"         # only for one resource: <resource>_edition
```

`auto` asks the CAD once (`POST /v1/integrations/fivem/check` with the API token). This CAD answers,
the original SnailyCAD doesn't (404). If the CAD can't be reached, the resources use `original` for
the moment and ask again a minute later.

### snailycad-mysql: linking accounts

A player must have signed in to the CAD with Discord or Steam once, or linked one of them under
**Account > Connections**. FiveM must see the same account: Discord / Steam has to be running when
the player starts FiveM.

If a player isn't linked, the commands say so in chat:

> Your game account isn't linked to a SnailyCAD account. In the CAD, link Discord or Steam under
> Account > Connections, then try again.

The CAD applies the usual checks to that account (banned, whitelist, permissions). `/sn-auth` and
`/sn-logout` only explain linking in this edition.

`/sn-call911`, `/sn-calltow`, `/sn-calltaxi` and `sna-alpr` don't act as a player: they always use
the CAD API token, in both editions.

## Commands

| Command                          | Resource       | What it does                                                                             |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------- |
| `/sn-call911 <description>`      | `sna-call911`  | 911 call with the player's street, postal and map position                               |
| `/sn-calltow <description>`      | `sna-calltow`  | tow call                                                                                 |
| `/sn-calltaxi <description>`     | `sna-calltaxi` | taxi call                                                                                |
| `/sn-auth`                       | `sna-sync`     | original: sign in with a Personal API Token. snailycad-mysql: shows how you're signed in |
| `/sn-whoami`                     | `sna-sync`     | the CAD username you're signed in as                                                     |
| `/sn-logout`                     | `sna-sync`     | original: forget your token                                                              |
| `/sn-active-unit`                | `sna-sync`     | your active unit and its status                                                          |
| `/sn-set-status [code]`          | `sna-sync`     | set your unit's status (`/sn-set-status 10-8`), or pick one from a menu                  |
| `/sn-panic-button`               | `sna-sync`     | turn your unit's panic button on / off                                                   |
| `/sn-attach [case-number]`       | `sna-sync`     | attach to a call (`/sn-attach 42`), or pick from a list of the 50 newest active calls    |
| `/sn-traffic-stop <description>` | `sna-sync`     | a 911 call at your position with your unit as primary                                    |

## Live alerts (sna-sync)

The game server keeps one connection to the CAD's live updates and shows:

- **Incoming 911 call** (with `/sn-attach <case-number>`): to players whose unit is on duty.
- **Panic button**: to players whose unit is on duty.
- **Signal 100** on / off and **area of play** changes: to everyone.

Alerts appear in the sna-sync notification panel (top right). On-duty status is looked up per
player and kept for a minute. Turn alerts off with `set snailycad_live_alerts "false"`.

## Settings

| Convar                                 | Default | What it does                                                                                |
| -------------------------------------- | ------- | ------------------------------------------------------------------------------------------- |
| `snailycad_url`                        |         | CAD API address, ending in `/v1` (added if missing)                                         |
| `snailycad_api_key`                    |         | CAD API token                                                                               |
| `snailycad_edition`                    | `auto`  | `auto`, `original` or `snailycad-mysql`; `<resource>_edition` overrides it per resource     |
| `snailycad_use_postal`                 | `false` | `true`: send the nearest postal with calls (from `sna-postals`, or the built-in list)       |
| `snailycad_postal_command`             |         | after `/sn-attach`, run this command with the call's postal (e.g. `postal` sets a waypoint) |
| `snailycad_player_leave_auto_off_duty` | `false` | `true`: a player's unit goes off duty when they leave the server                            |
| `snailycad_live_alerts`                | `true`  | `false`: no 911 / panic / Signal 100 / AOP alerts from sna-sync                             |
| `snailycad_version_check`              | `true`  | `false`: don't check GitHub for a newer version on start                                    |

All convars are read on the server: `set` is enough (0.14.3 needed `setr snailycad_url`; that
still works). They are read live, so a change in the server console applies without a restart.

## For other scripts

Unchanged from 0.14.3:

- Client event `sna-sync:create-notification` with `{ title, message, timeout? }` shows a
  notification in the sna-sync panel. The message is escaped; `<b>`, `<i>`, `<u>`, `<li>`, `<ul>`
  and `<br>` (no attributes) still format it.
- `exports["sna-postals"]:readPostalCodes()` returns the postal list.
- `sn:cadPlateResults` / `sn:cadBoloResults` (client) carry the ALPR results for the officer who
  locked the plate.
- Every command name and the `sn:*` / `sna-sync:*` event names are the same.

## What changed since 0.14.3

- Works with this CAD (Discord / Steam sign-in) and the original SnailyCAD, chosen per server or
  per resource.
- No token or CAD address is sent to players' games. 0.14.3 sent the Personal API Token to the
  player's NUI and connected every player's NUI to the CAD. Now the server makes every CAD request
  and holds the one live connection.
- Server events use the player who sent them, never a player id the client sends. Calls,
  traffic stops and status / attach changes are only accepted for something the server asked for or
  for the sender's own unit.
- Notifications are escaped, so text from the CAD (call locations, names) can't inject HTML.
- GTA feed notifications use the current natives; messages longer than 99 characters are no longer
  cut off.
- Failed CAD answers (HTTP errors) are reported as failures instead of being treated as data. The
  ALPR BOLO search URL-encodes the plate.
- `sna-alpr` shows its results as a GTA notification when `sna-sync` isn't running.
- The `/sn-attach` list shows up to 50 calls (0.14.3: 12).
- The NUI is plain HTML / TypeScript (no React), and loads no fonts from the internet.
- Node.js 22 (`node_version "22"`), built-in `fetch`.

## Building (developers)

The sources are in `integrations/fivem/sna-src`; the built resources are committed.

```sh
node integrations/fivem/build-sna.mjs
```

It uses the esbuild that comes with the repo's dev dependencies (`pnpm install` first) and writes
`sna-*/server/server.js`, `client/client.js`, `nui/*` and `fxmanifest.lua`. The version is in
`sna-src/version.json`; the update check compares it with the one on GitHub.
