Config = {}

--[[
  CAD connection: the CAD's API address and its API token (CAD Settings > API Token). Set it up
  in one of these ways (never in this file, so the token doesn't end up in a shared file):

    1. server.cfg (wins over the others):
         set snailycad_framework_api_url "https://cad-api.example.com/v1"
         set snailycad_framework_api_token "your CAD API token"
    2. server console / txAdmin Live Console: snailyframework_setup <url> <token>
    3. nothing: when snailycad-radio is set up in server.cfg (snailycad_radio_api_url and
       snailycad_radio_api_token), this resource uses the same CAD.

  Use `set`, never `setr`: the token must stay on the server.
]]

--[[
  Framework: "auto" detects qbx_core (Qbox), qb-core (QBCore) or es_extended (ESX), in that order.
  Or force one: "qbox" | "qbcore" | "esx".
]]
Config.Framework = "auto"

-- what to sync. The CAD can also turn each part off (CAD Settings > FiveM framework).
Config.Sync = {
  citizens = true, -- characters become CAD citizens
  vehicles = true, -- owned vehicles become CAD registered vehicles
  duty = true,     -- duty changes set the player's CAD unit on / off duty
}

--[[
  Players without a CAD account (no CAD user with their Discord or Steam account):
    "skip"   : don't sync their characters (default)
    "create" : create citizens without a CAD user. CAD users can claim them later
               (Citizens > Claim a citizen), and they show up in LEO / dispatch searches.
  Duty sync always needs a CAD account.
]]
Config.Unlinked = "skip"

-- resync the vehicles (and names) of everyone online every N minutes (0 = only on character load)
Config.ResyncMinutes = 10

--[[
  Vehicles
    createModels: create CAD vehicle models (Admin > Values > Vehicle) for cars the CAD doesn't
                  know yet. Off: those cars are skipped until an admin adds the model (match by
                  name, e.g. "Adder", or put the game hash in the value's "Hash" field).
    skipJobVehicles: ESX: skip job vehicles in owned_vehicles (police / ambulance cars)
    types: ESX owned_vehicles.type values to sync (car, boat, aircraft, ...); empty = all
]]
Config.Vehicles = {
  createModels = false,
  skipJobVehicles = true,
  types = {},
  -- how often (seconds) to check the vehicle table for changes made by any garage, dealership,
  -- transfer or impound script, and sync the characters whose vehicles changed (0 = off: only
  -- when the player's character syncs)
  watchSeconds = 5,
  -- at start, sync the garages of every character the CAD knows (changes made while the
  -- resource was stopped)
  catchUpOnStart = true,
}

--[[
  Duty: jobs that are CAD units. The key is the framework job name.
    unitType:    "leo" (police) or "ems-fd" (ambulance / fire)
    departments: CAD department names (or ids) to prefer when the player has several units
  The unit that goes on duty: the one with a matching callsign (Config.Callsign), else the unit
  of the character's own CAD citizen, else one in a listed department, else the last used one.
]]
Config.Jobs = {
  police = { unitType = "leo", departments = { "LSPD" } },
  sheriff = { unitType = "leo", departments = { "BCSO" } },
  ambulance = { unitType = "ems-fd", departments = { "EMS", "LSFD" } },
  fire = { unitType = "ems-fd", departments = { "LSFD" } },
}

Config.Duty = {
  -- a player who loads in already on duty goes on duty in the CAD too
  onLoad = true,
  -- set the CAD unit off duty when the player leaves the server or logs out of the character
  offDutyOnLeave = true,
  -- how often (seconds) to compare players' duty with the last known one, for scripts that
  -- change duty without an event (0 = events only)
  pollSeconds = 15,
}

-- the callsign to pick the CAD unit with (nil = let the CAD pick). `player` is the ESX xPlayer, or
-- the QBCore / Qbox PlayerData. Example for the QBCore / Qbox metadata callsign:
--   Config.Callsign = function(source, player) return player.metadata and player.metadata.callsign end
Config.Callsign = function(source, player)
  return nil
end

--[[
  Character fields
    genders: the framework's gender -> the CAD gender's name (Admin > Values > Gender)
    dateFormat: how ESX stores dates of birth (esx_identity Config.DateFormat): "DD/MM/YYYY",
                "MM/DD/YYYY" or "YYYY/MM/DD". QBCore / Qbox use YYYY-MM-DD.
]]
Config.Character = {
  genders = { male = "Male", female = "Female" },
  dateFormat = "DD/MM/YYYY",
  -- send the phone number: the framework's and every supported phone's; the CAD picks one
  -- (CAD Settings > Phones)
  phone = true,
  height = true,
  -- hair and eye colour from the saved skin (skinchanger, fivem-appearance, illenium-appearance,
  -- qb-clothing)
  appearance = true,
  -- the game doesn't know these; the CAD needs them to save a citizen. nil = the CAD's default
  -- ("Unknown", and the CAD's first ethnicity). Players / admins can change them in the CAD.
  weight = nil,     -- e.g. "80"
  address = nil,    -- e.g. "Los Santos"
  ethnicity = nil,  -- the name of an ethnicity in the CAD (Admin > Values > Ethnicity)
}

--[[
  Licences: the game decides whether a character holds a licence. Held -> the CAD licence is set
  to `valid`; not held -> `none` (a licence value in the CAD; nil or missing = empty). A status
  set in the CAD (e.g. Suspended, Revoked) is never overwritten, and CAD licences this server has
  no game licence for are left alone.
    map:        CAD licence -> game licence types (ESX user_licenses / QBCore metadata.licences)
    categories: game licence type -> driver's licence category name in the CAD
                (Admin > Values > Drivers license category); unknown names are skipped
]]
Config.Licenses = {
  sync = true,
  valid = "Valid",
  none = "None",
  map = {
    drivers = { "drive", "drive_bike", "drive_truck", "driver" },
    weapon = { "weapon" },
    water = { "boat" },
    pilot = { "aircraft", "pilot", "plane", "helicopter" },
    hunting = { "hunting" },
    fishing = { "fishing" },
  },
  categories = {
    drive = "Class C",
    driver = "Class C",
    drive_bike = "Class M",
    drive_truck = "Class A",
  },
}

-- the server name shown in CAD Settings (default: sv_projectName, else sv_hostname)
Config.ServerName = nil

-- print what is synced in the server console
Config.Debug = false
