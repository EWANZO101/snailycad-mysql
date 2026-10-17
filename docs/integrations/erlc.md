# ER:LC integration

> Also on the docs site: https://snaily-doc.opslabsystems.cloud/docs/other-integrations/erlc

ER:LC (Emergency Response: Liberty County, by Police Roleplay Community) is a Roblox game. Communities that run an ER:LC private server can connect it to SnailyCAD through the official **ER:LC API** (`api.erlc.gg`, API version 2).

## What's different from the original SnailyCAD

- The original SnailyCAD has no ER:LC support. This edition talks to the ER:LC API directly, so you don't need a bot or a third-party app.
- In-game 911 calls (Police, Sheriff, Fire, EMS) become CAD 911 calls on their own, and DOT calls become tow calls.
- Dispatch gets an **ER:LC** page with every player in the server: team, callsign, street, postal and wanted stars.
- Dispatchers can send `:h` hints and `:m` messages to the server, and admins can run any in-game command, from the CAD.
- It uses the current **v2 API** on `api.erlc.gg`. The old `api.policeroleplay.community/v1` address is not used.

## What syncs

| In ER:LC                         | In the CAD                                                   |
| -------------------------------- | ------------------------------------------------------------ |
| A player calls 911 (Police)      | 911 call, linked to the LEO departments                      |
| A player calls 911 (Fire / EMS)  | 911 call, linked to the EMS-FD departments                   |
| A player calls DOT               | Tow call                                                     |
| Players in the server            | **Dispatch → ER:LC**: team, callsign, location, wanted stars |
| Spawned vehicles                 | **Dispatch → ER:LC**: plate, model, owner, colour            |
| Server name, players, queue size | **Dispatch → ER:LC** and the admin settings page             |

You can change which kind of call each ER:LC team creates, or set a team to "Nothing (ignore)".

The 911 call is created the same way as a call made in the CAD: dispatch sees it live, Discord webhooks fire, and 911 call approval still applies.

### What dispatch sees on a call from ER:LC

- **Caller:** the player's Roblox username.
- **Location:** the street and postal of the caller (for example `2083 Park Street (postal 218)`), or the location the caller typed in game.
- **Description:** what the caller said, then `ER:LC call #<number> · <team>`.
- The call's event log shows `Created from ER:LC (call #<number>, team <team>)`.

Each in-game call is created only once, even when it is seen by both the webhook and the regular check.

## What you need

- An ER:LC **private server** with the **ERLC API** server pack bought for it.
- The server's **server key**. In ER:LC, open your private server's **Settings**, search for **API key** and copy the key (or go to [erlc.link/sk](https://erlc.link/sk)).
- Optional, for instant 911 calls: the CAD's API on **HTTPS**, reachable from the internet.

## Setup

1. In the CAD, open **Admin → CAD Settings → Features** and turn on **ER:LC**. Save.
2. Open **CAD Settings → Integrations → ER:LC**.
3. Turn on **Enable ER:LC**, paste the **server key** and click **Save**.
4. Click **Test connection**. It shows the server's name and player count when the key works.
5. Under **Teams**, choose what each ER:LC team's 911 calls create in the CAD. Save.

The CAD now checks the server every 15 seconds (you can set 10 to 300 seconds). New 911 calls show up within one check.

### Instant 911 calls (event webhook, optional)

ER:LC can also send each 911 call to the CAD the moment it is made.

1. In **CAD Settings → Integrations → ER:LC**, copy the **Event webhook URL**. It looks like `https://api.your-cad.com/v1/integrations/erlc/webhook`.
2. In ER:LC, open your private server's **Settings**, search for **Event Webhook** and paste the URL.

ER:LC checks the address before it saves it, so the CAD must be running with **ER:LC** turned on, and the URL must be HTTPS. Every webhook is signed by ER:LC (Ed25519), and the CAD rejects anything not signed by ER:LC.

The webhook only makes calls arrive sooner. The CAD keeps checking the server as usual, so nothing is missed if a webhook gets lost.

## Dispatch → ER:LC

Dispatchers (and admins) find the page under **Dispatch → ER:LC** once the feature is on.

- **Server:** name, join code, players / max players, queue.
- **Players:** Roblox username (links to the profile), team, callsign, street and postal, wanted stars, and their staff role in the server. Search by name, callsign or street.
- **Vehicles:** every spawned vehicle with plate, model, owner and colour. Search by plate.
- **Emergency calls:** the server's recent 911 calls, with a link to the CAD call each one created.
- **Send to server:** send a hint (`:h`) or a message (`:m`) to everyone in the server. Admins with **Manage CAD settings** can run any command (for example `:pm username text`).

The page updates every 10 seconds. It reads what the CAD already fetched, so having many dispatchers on the page doesn't send more requests to ER:LC.

## Rate limits and errors

The CAD follows ER:LC's [API rules](https://apidocs.erlc.gg/rate-limits):

- **One request per check**, whatever the number of dispatchers.
- **Too many requests (429):** the CAD waits the full time ER:LC asks for before it tries again.
- **Wrong or changed server key (403):** after 3 failed checks in a row the CAD **stops checking** so ER:LC doesn't block your server. The settings page says **Paused: key rejected**. Save a new key to start again.
- **Server empty (offline):** ER:LC can't answer while nobody is in the server. The CAD shows **Server offline** and checks once a minute until someone joins.
- **Commands:** ER:LC allows one command every 5 seconds. Some commands are blocked by ER:LC (`Command restricted`).

The settings page shows the last check, the last error, and when the next check will run.

## Settings

| Setting          | Default                                              | What it does                                                                                                                             |
| ---------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Enable ER:LC     | Off                                                  | Checks the server and accepts webhooks. When off, the webhook answers 404.                                                               |
| Server key       | —                                                    | Your private server's key. It's never shown again after you save it.                                                                     |
| Public app key   | Empty                                                | Only for apps registered as a [public application](https://apidocs.erlc.gg/creating-public-applications). Leave it empty for one server. |
| Check every      | 15 seconds                                           | 10 to 300 seconds.                                                                                                                       |
| Create 911 calls | On                                                   | Turn off to only show the server on the Dispatch → ER:LC page.                                                                           |
| Teams            | Police, Sheriff → LEO; Fire, EMS → EMS-FD; DOT → Tow | What each team's 911 calls create. A team that isn't listed creates a LEO 911 call.                                                      |

## Troubleshooting

| Problem                                | Fix                                                                                                                                 |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Test connection: **Key rejected**      | Copy the key again from the server's settings. Keys change when the owner regenerates them. Check the server has the ERLC API pack. |
| Test connection: **Server offline**    | The key works, but the server is empty. Join the server and try again.                                                              |
| **Module out of date** (error 9999)    | ER:LC's in-game module is old. Kick everyone from the private server (or restart it) and try again.                                 |
| ER:LC won't save the event webhook URL | The CAD's API must be on HTTPS and reachable from the internet, and ER:LC must be turned on in the CAD.                             |
| Calls don't appear                     | Check **Create 911 calls** is on, the team isn't set to "Nothing", and the **911 calls** feature is on.                             |
| **Rate limited** keeps showing         | Another app is using the same server key from the same IP address. Raise **Check every**, or stop the other app.                    |
