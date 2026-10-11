# Radio audio through LiveKit

By default the radio's audio goes through the SnailyCAD API itself (**built in**). That needs
nothing extra and handles dozens of people on the radio. For large communities, or better audio
(Opus, WebRTC), point the radio at a [LiveKit](https://livekit.io) server: the audio then goes
through LiveKit, while push-to-talk, talking indicators and channel changes still go through the
CAD. Switching is one click in CAD Settings → Radio, and back.

|         | Built in                                | LiveKit                                           |
| ------- | --------------------------------------- | ------------------------------------------------- |
| Install | nothing                                 | a LiveKit server (Docker or a binary)             |
| Audio   | 16 kHz mu-law over the CAD's connection | Opus over WebRTC                                  |
| Size    | dozens of people talking/listening      | hundreds                                          |
| Ports   | the API's port                          | 7880 (signal), 7881 TCP + 50000-50100 UDP (media) |

## Docker (with the CAD's compose file)

1. Create the LiveKit config next to `production.docker-compose.yml`:

   ```bash
   cp livekit.example.yaml livekit.yaml
   ```

   Change the secret under `keys:` (`snailycad: <at least 32 random characters>`).

2. Start LiveKit:

   ```bash
   docker compose -f production.docker-compose.yml --profile livekit up -d livekit
   ```

3. Add to the CAD's `.env`:

   ```bash
   RADIO_LIVEKIT_URL="wss://livekit.example.com"
   RADIO_LIVEKIT_API_KEY="snailycad"
   RADIO_LIVEKIT_API_SECRET="the secret from livekit.yaml"
   ```

   and rebuild / restart the API (`docker compose -f production.docker-compose.yml up -d --build api`).

4. CAD Settings → Radio → **LiveKit server**.

## Without Docker

Download `livekit-server` from the [releases](https://github.com/livekit/livekit/releases)
(tested with v1.13.7) and run it with the same config:

```bash
./livekit-server --config livekit.yaml
```

Then steps 3 and 4 above, and restart the CAD (`./start.sh` or its service).

## HTTPS and ports

- Browsers and FiveM need **`wss://`**: put LiveKit's port 7880 behind your reverse proxy with a
  certificate (e.g. `livekit.example.com` → `127.0.0.1:7880`, WebSocket upgrades on), and use
  that address in `RADIO_LIVEKIT_URL`.
- Open **7881/tcp** and **50000-50100/udp** in your firewall (and your host's firewall): that's
  where the audio flows, directly between players and LiveKit.
- `use_external_ip: true` in `livekit.yaml` lets LiveKit find its public IP; set `rtc.node_ip`
  yourself if it picks the wrong one.

## Checking it works

CAD Settings → Radio shows the LiveKit address when the three `RADIO_LIVEKIT_*` values are set,
and a warning when LiveKit is selected but they're missing (the radio then keeps using the
built-in audio). Radios pick up a change of transport when they reconnect (reload the page; in
game, reconnect or restart the resource).
