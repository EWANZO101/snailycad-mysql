# ops-phone integration

ops-phone (`opslabs-phone`, by OpsLab Systems) is a FiveM smartphone. Its Services app lets players call 911 (police), 912 (EMS), 913 (mechanic) and 914 (taxi).

With this integration, each of those requests becomes a call in SnailyCAD:

| Phone service     | CAD call (default)                         |
| ----------------- | ------------------------------------------ |
| `police` (911)    | 911 call, linked to the LEO departments    |
| `ambulance` (912) | 911 call, linked to the EMS-FD departments |
| `mechanic` (913)  | Tow call                                   |
| `taxi` (914)      | Taxi call                                  |

You can change this per service, or set a service to "Nothing (ignore)".

The call is created the same way as a call made in the CAD. Dispatch sees it live, Discord webhooks fire, and 911 call approval still applies.

## What the caller sees

1. The player sends a request from the Services app.
2. When dispatch assigns the first unit (or a tow/taxi driver takes the call), the request turns "accepted" in the phone. The player gets a text from the service number, for example: `Dispatch: units are on the way. Call #42.`
3. When the call is ended or deleted in the CAD, the request turns "closed" and the player gets a short text.

Texts are optional. Turn off "Text the caller" to only update the request status.

## What dispatch sees

- **Caller:** the player's name on the phone.
- **Location:** `GPS x, y (ops-phone)`. The exact position is on the live map.
- **Description:** the player's message, then `Caller: <name> (<number>) · via ops-phone`.
- The call's event log shows `Created from ops-phone (<service> request #<id> ...)`.

## Setup

### 1. In the CAD

1. Go to **Admin > CAD Settings > Integrations > ops-phone**.
2. Turn on **Enable ops-phone**.
3. Set **Phone API URL** to `http://<fivem-server>:30120/opslabs-phone/api/v1`. The CAD's API server must be able to reach it. If the CAD runs on the same machine, use `http://127.0.0.1:30120/opslabs-phone/api/v1`.
4. Paste the **API key**. It's the value of `opslabs_phone_api_key` in server.cfg. The CAD never shows it again; it only shows that a key is saved.
5. Check the services and their numbers. The numbers must match `Config.Services` in ops-phone's `config.lua`.
6. Click **Save**, then **Test connection**. You should see "Connected".

### 2. On the FiveM server

The tab shows the exact lines to copy.

1. Add the webhook secret to `server.cfg`:

   ```cfg
   set opslabs_phone_webhook_secret "<secret from the CAD>"
   ```

2. Make sure `server.cfg` has the API key (24 or more characters):

   ```cfg
   set opslabs_phone_api_key "<a long random key>"
   ```

3. In `opslabs-phone/server/api_config.lua`, add the CAD's webhook URL to `Webhooks`:

   ```lua
   Webhooks = {
       'https://your-cad-api.example.com/v1/integrations/ops-phone/webhook',
   },
   ```

   Keep `['service.request'] = true` in `Events`.

4. Restart the server, or run `ensure opslabs-phone`.

## Security

- The webhook only works when the integration is enabled. Otherwise it answers 404.
- Each request must carry the secret in the `X-OpsLabs-Secret` header. The CAD compares it in constant time and answers 401 if it's wrong.
- Too many requests, or repeated wrong secrets, from one address get 429.
- **Regenerate** makes a new secret. The old one stops working right away, so update `server.cfg` too.
- A request id is only used once. If ops-phone sends the same request again, the CAD ignores it.

## Troubleshooting

**Test connection says "Can't reach the phone".**
The CAD's API can't open the URL. Check the address and port (30120 by default), and the firewall between the two servers.

**Test connection says "Wrong API key".**
The key in the CAD doesn't match `opslabs_phone_api_key`. Paste it again and save. ops-phone rate-limits wrong keys, so wait a minute between tries.

**Test connection says "Phone API is off".**
ops-phone has no API key. Set `opslabs_phone_api_key` (24+ characters) and restart ops-phone.

**Requests don't show up in the CAD.**

- Check the FiveM console. ops-phone prints `webhook service.request -> <url> returned <status>` when the CAD refuses a request.
- 401: the secret in `server.cfg` doesn't match the CAD. Copy it again.
- 404: the integration is off in the CAD, or the URL is wrong. It must end in `/v1/integrations/ops-phone/webhook`.
- 429: wait 15 minutes after fixing the secret.
- Check that the 911 calls, tow or taxi feature is on in **CAD Features**. Requests for a feature that is off are ignored.

**The caller gets no text.**
Check that "Text the caller" is on, the API key is set, and the service number matches the phone's `Config.Services`. Errors are only written to the CAD API log (`[ops-phone] ...`). They never block dispatch.
