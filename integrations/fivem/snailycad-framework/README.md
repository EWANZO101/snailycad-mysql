# SnailyCAD framework sync for FiveM

Connects ESX Legacy, QBCore or Qbox to SnailyCAD (MySQL / MariaDB edition).

- **Characters → citizens.** A character that loads becomes a CAD citizen: name, date of birth, gender, height and phone number. Renames update the same citizen.
- **Garage → registered vehicles.** Owned vehicles (plate, model, colour) are registered to that citizen.
- **Duty → unit status.** Police and EMS players going on or off duty set their CAD officer or EMS-FD deputy on or off duty. Dispatch sees it live.

Players are linked to their CAD account by Discord or Steam, like the SnailyCAD radio.

The full guide is in the CAD docs: `docs/integrations/fivem-framework.md`.

## Requirements

- SnailyCAD with the FiveM framework update (CAD Settings shows **Integrations > FiveM framework**).
- The **CAD API token** turned on (CAD Settings > API Token).
- ESX Legacy, QBCore or Qbox.
- **oxmysql** for vehicles.

## Install

1. Copy this folder into `resources` and start it after the framework:

   ```cfg
   ensure oxmysql
   ensure es_extended   # or qb-core / qbx_core
   ensure snailycad-framework
   ```

2. Connect it to the CAD. Pick one:
   - Server console / txAdmin Live Console:

     ```
     snailyframework_setup https://cad-api.example.com/v1 YOUR_CAD_API_TOKEN
     ```

   - server.cfg (wins over the saved settings):

     ```cfg
     set snailycad_framework_api_url "https://cad-api.example.com/v1"
     set snailycad_framework_api_token "YOUR_CAD_API_TOKEN"
     ```

   - Nothing, when `snailycad-radio` is set up in server.cfg: the same CAD is used.

   Use `set`, never `setr`: the token must stay on the server.

3. Run `snailyframework_check` in the console. It shows what syncs and what the CAD is missing.
4. Edit `config.lua`: jobs and departments, players without a CAD account, vehicle options.

## Commands

| Command                                   | What it does                           |
| ----------------------------------------- | -------------------------------------- |
| `snailyframework_setup <url> <token>`     | check and save the CAD connection      |
| `snailyframework_setup clear`             | remove the saved connection            |
| `snailyframework_check`                   | connection, CAD values, online players |
| `snailyframework_sync <player id \| all>` | sync now                               |

## Exports (server)

```lua
exports["snailycad-framework"]:SyncPlayer(source)   -- e.g. after your shop gave a car
exports["snailycad-framework"]:SyncDuty(source)     -- after your script changed duty
exports["snailycad-framework"]:GetCitizenId(source) -- the CAD citizen id, or nil
TriggerEvent("snailycad-framework:vehicleBought", source) -- same as SyncPlayer
```

## Tests

Plain Lua 5.4, no FiveM needed:

```sh
lua tests/mapping_test.lua
# against a TEST CAD (creates citizens and vehicles, changes unit statuses):
SNAILY_URL=http://127.0.0.1:8080/v1 SNAILY_TOKEN=... SNAILY_DISCORD=<CAD user's Discord id> \
  FRAMEWORK=esx lua tests/integration_test.lua
```

## Limits

- Vehicles that leave a garage stay in the CAD.
- Duty sync and linked citizens need a CAD account with Discord or Steam.
- Weight, address and ethnicity aren't in the frameworks: they come from `Config.Character`, else "Unknown" (and the CAD's default ethnicity). Hair and eye colour come from the saved skin.
