# FiveM framework integration (ESX, QBCore, Qbox)

The `snailycad-framework` FiveM resource connects your roleplay framework to SnailyCAD. It works with ESX Legacy, QBCore and Qbox.

| In game                                        | In the CAD                                       |
| ---------------------------------------------- | ------------------------------------------------ |
| A character loads                              | A citizen is created or updated                  |
| The character's garage                         | Registered vehicles                              |
| A police / EMS player goes on or off duty      | Their officer / EMS-FD deputy goes on / off duty |
| The player leaves or logs out of the character | Their unit goes off duty                         |

The resource is in `integrations/fivem/snailycad-framework`.

## What syncs

### Characters → citizens

- Synced fields: first name, last name, date of birth, gender, height (ESX) and phone number.
- Every field the CAD needs is filled, so synced citizens can be edited and saved in the CAD:

  | CAD field           | Comes from                                                                         |
  | ------------------- | ---------------------------------------------------------------------------------- |
  | Name, date of birth | the character                                                                      |
  | Gender, height      | the character (height: ESX, or QBCore metadata)                                    |
  | Phone number        | the framework, else ops-phone or lb-phone                                          |
  | Hair and eye colour | the saved skin (skinchanger, fivem-appearance, illenium-appearance, qb-clothing)   |
  | Weight, address     | `Config.Character.weight` / `.address`, else "Unknown"                             |
  | Ethnicity           | `Config.Character.ethnicity` (a name in the CAD), else the CAD's default ethnicity |

  Weight, address and ethnicity are only defaults: once someone changes them in the CAD, the sync
  leaves them alone.

- The CAD remembers which game character a citizen belongs to (ESX `users.identifier`, QBCore / Qbox `citizenid`). A rename in game updates the same citizen. It never makes a second one.
- A player's citizen is linked to their CAD account. The CAD finds the account by the player's **Discord** or **Steam** account, like the radio. The player must have logged in to the CAD with Discord or Steam once (or linked them in Account settings).
- If the player already made a citizen with the same name in the CAD, that citizen is linked. No duplicate is made.
- Players without a CAD account: set `Config.Unlinked`.
  - `"skip"` (default): nothing is synced for them.
  - `"create"`: a citizen without a CAD user is made. LEO and dispatch can search it. A CAD user can claim it later (**Citizens > Claim a citizen**). When the player links their Discord / Steam to a CAD account later, the next sync gives the citizen and its vehicles to that account.
- Game names win: a rename in game changes the citizen directly. It doesn't go through the CAD's name change requests.

### Vehicles → registered vehicles

- ESX: `owned_vehicles` (owner = the character's identifier). QBCore / Qbox: `player_vehicles` (by `citizenid`). Needs **oxmysql**.
- Synced: plate, model and colour.
- Vehicles sync when a character loads, every `Config.ResyncMinutes` minutes (default 10), and when another resource calls `exports["snailycad-framework"]:SyncPlayer(source)` or triggers the server event `snailycad-framework:vehicleBought` with the player id.
- The model is matched to a CAD vehicle model (**Admin > Values > Vehicle**). First by the value's **Hash** field (the game model hash), then by name (`Adder`, `adder`).
- Unknown models are skipped, unless `Config.Vehicles.createModels = true` or the CAD's **Custom text field values** feature is on. Then the model is created.
- ESX only stores a model hash. The resource names it from the `vehicles` table (esx_vehicleshop). For other cars it asks the player's game for the name.
- ESX job vehicles (`job` column set) are skipped by default.
- New vehicles get the default registration status (a **License** value, **Admin > Values > License**). With the **DMV** feature on, they wait for DMV approval, like vehicles registered in the CAD.
- A vehicle sold to another character in game moves to the new owner's citizen.
- A plate the CAD already has for someone else (registered by hand) is left alone and reported as `plateAlreadyInUse`.
- Vehicles that leave a garage stay in the CAD. Remove them in the CAD if needed.

### Duty → unit status

- `Config.Jobs` maps a framework job to a unit type: `police` → LEO, `ambulance` → EMS-FD.
- On duty: the player's unit is set to the CAD's **on-duty** status. Off duty: to the **off-duty** status. These are 10-codes with "Set on duty" / "Set off duty" (**Admin > Values > Codes 10**). Both must exist.
- The change goes through the same code as a status change in the CAD. Dispatch sees it live. Officer logs and unit status webhooks work as usual.
- Which unit goes on duty, when the player has several:
  1. the unit with the callsign from `Config.Callsign` (optional),
  2. the unit made with the character's own citizen,
  3. a unit in one of the job's `departments`,
  4. the unit used last.
- Suspended units and units waiting for department approval are never set on duty. Units in a combined unit are left alone.
- ESX: duty is `job.onDuty` (ESX Legacy 1.10 and newer). Older ESX has no duty: having the job counts as on duty.
- QBCore / Qbox: `job.onduty`, from `QBCore:Server:SetDuty` and `QBCore:Server:OnJobUpdate`.
- Duty is also checked every `Config.Duty.pollSeconds` seconds (default 15). This catches scripts that change duty without an event. A request is only sent when the duty really changed.
- Duty sync needs a CAD account. Players without one are skipped.

## Setup

### 1. In the CAD

1. Turn on the CAD API token: **Admin > CAD Settings > API Token**.
2. Make sure these values exist:
   - a 10-code with **Set on duty** and one with **Set off duty** (for duty),
   - a **License** value for the registration status (for vehicles),
   - **Gender** values named like `Config.Character.genders` (`Male`, `Female`).
3. Officers and EMS-FD deputies must belong to CAD accounts with Discord or Steam linked.

### 2. On the FiveM server

1. Copy `integrations/fivem/snailycad-framework` into your `resources` folder.
2. Start it after your framework and oxmysql:

   ```cfg
   ensure oxmysql
   ensure es_extended   # or qb-core / qbx_core
   ensure snailycad-framework
   ```

3. Connect it to the CAD. Pick one:
   - Server console or txAdmin Live Console:

     ```
     snailyframework_setup https://cad-api.example.com/v1 YOUR_CAD_API_TOKEN
     ```

     It checks the connection first, then saves it. `snailyframework_setup clear` removes it.

   - server.cfg (wins over the saved settings):

     ```cfg
     set snailycad_framework_api_url "https://cad-api.example.com/v1"
     set snailycad_framework_api_token "YOUR_CAD_API_TOKEN"
     ```

   - Nothing, if `snailycad-radio` is set up in server.cfg: the resource uses `snailycad_radio_api_url` and `snailycad_radio_api_token`. (Settings saved in game with `/radiosetup` are private to the radio resource. Run `snailyframework_setup` once in that case.)

   Use `set`, never `setr`. The token must stay on the server.

4. Run `snailyframework_check` in the console. It shows the connection, the CAD switches, what the CAD is missing, and for each online player: their CAD account, citizen and units.
5. Edit `config.lua`: jobs, departments, unlinked players, vehicle options.

### 3. CAD Settings card

**Admin > CAD Settings > Integrations > FiveM framework** shows the last sync (server, framework, resource version) and how many characters and vehicles came from the game.

It also has switches: the whole sync, citizens, vehicles and duty. A switch turned off in the CAD wins over `config.lua`.

## Config

| Option                 | Default                          | What it does                                          |
| ---------------------- | -------------------------------- | ----------------------------------------------------- |
| `Config.Framework`     | `"auto"`                         | `"esx"`, `"qbcore"`, `"qbox"` or detect               |
| `Config.Sync`          | all `true`                       | `citizens`, `vehicles`, `duty`                        |
| `Config.Unlinked`      | `"skip"`                         | players without a CAD account: `"skip"` or `"create"` |
| `Config.ResyncMinutes` | `10`                             | resync everyone online (0 = off)                      |
| `Config.Vehicles`      |                                  | `createModels`, `skipJobVehicles`, `types` (ESX)      |
| `Config.Jobs`          | police, sheriff, ambulance, fire | job → `unitType` and `departments`                    |
| `Config.Duty`          |                                  | `onLoad`, `offDutyOnLeave`, `pollSeconds`             |
| `Config.Callsign`      | none                             | function returning a callsign to pick the unit        |
| `Config.Character`     |                                  | `genders`, `dateFormat` (ESX), `phone`, `height`      |
| `Config.ServerName`    | sv_projectName                   | the name shown in CAD Settings                        |
| `Config.Debug`         | `false`                          | print every sync in the console                       |

## Commands and exports

| Command                                   | What it does                                                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `snailyframework_setup <url> <token>`     | save the CAD connection (console only)                                                                   |
| `snailyframework_check`                   | check the connection and the players (console only)                                                      |
| `snailyframework_sync <player id \| all>` | sync characters, vehicles and duty now (console, or players with the `command.snailyframework_sync` ACE) |

| Export (server)        | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `SyncPlayer(source)`   | sync the player's character and vehicles now       |
| `SyncDuty(source)`     | re-check the player's duty now                     |
| `GetCitizenId(source)` | the player's CAD citizen id (after the first sync) |

## API

The resource uses these CAD API endpoints. They only accept the CAD API token, in the `snaily-cad-api-token` header.

| Endpoint                                 | What it does                                 |
| ---------------------------------------- | -------------------------------------------- |
| `POST /v1/integrations/fivem/characters` | upsert a character's citizen and vehicles    |
| `POST /v1/integrations/fivem/duty`       | set a player's unit on or off duty           |
| `POST /v1/integrations/fivem/check`      | connection check, CAD values, linked players |

They allow 600 requests per minute per IP address. After 20 wrong tokens in 15 minutes, that address is blocked for the rest of the 15 minutes.

## Troubleshooting

| Console message                      | Fix                                                                                      |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `wrong CAD API token`                | Copy the token again from CAD Settings > API Token, and check it's turned on.            |
| `not found`                          | Use the CAD **API** address ending with `/v1`, and a CAD with this update.               |
| `rate limiting this server`          | Too many wrong tokens. Fix the token, then wait 15 minutes or restart the CAD API.       |
| `no CAD account`                     | The player has no CAD account with their Discord / Steam. Link it in the CAD.            |
| `noUnit` / `noUsableUnit`            | The CAD account has no officer / deputy, or it's suspended or waiting for approval.      |
| `noOnDutyStatus` / `noOffDutyStatus` | Add 10-codes with "Set on duty" and "Set off duty".                                      |
| `unknownVehicleModel`                | Add the model in Admin > Values > Vehicle, or set `Config.Vehicles.createModels = true`. |
| `noRegistrationStatusValue`          | Add a License value (e.g. `Valid`).                                                      |
| `nameAlreadyTaken`                   | The CAD doesn't allow duplicate citizen names, and another citizen has this name.        |
| `maxCitizensPerUserReached`          | The CAD account has the maximum number of citizens (CAD Settings > Limits).              |
| `oxmysql not running`                | Start oxmysql before this resource. Without it, vehicles don't sync.                     |
| `no framework found`                 | Start the framework before this resource, or set `Config.Framework`.                     |

Set `Config.Debug = true` to see every sync in the console.

## Limits

- Vehicles that leave a garage (sold to the dealer, deleted) are not removed from the CAD.
- Only one off-duty / on-duty status pair is used: the first one that fits the unit's department.
- Players need a CAD account linked by Discord or Steam for duty sync and for linked citizens.
- The game doesn't know weight, address or ethnicity: they are defaults ("Unknown" unless set in `Config.Character`).
- ESX vehicles whose model the server and the player's game can't name are skipped (`unknownVehicleModel`) unless models may be created.
