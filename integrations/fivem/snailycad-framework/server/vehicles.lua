--[[
  Vehicle watcher: keeps the CAD's vehicles in step with the game in (near) real time, whatever
  script changes them. Every garage, dealership, vehicle shop, transfer, impound or admin script
  ends up writing to the framework's vehicle table (ESX owned_vehicles, QBCore / Qbox
  player_vehicles), so that table is what's watched:

  - every Config.Vehicles.watchSeconds a cheap fingerprint of it (row count + checksum of
    owner|plate) is read; only when it changes is the table compared with the last copy
  - the characters whose garage changed (bought, sold, given away, received, deleted) are sent to
    the CAD with their whole garage, online or not. The CAD adds new vehicles, moves transferred
    ones and removes the ones that are gone (CAD Settings > FiveM framework > "Vehicles gone from
    the game")
  - at start it catches up on every character the CAD has synced, for changes made while the
    resource was stopped

  A garage whose rows can't be read is never sent: an empty answer must not look like "sold
  everything".
]]

VehicleWatch = {}

local debug = Framework.debug
local BATCH_SIZE = 25

local snapshot -- plate -> owner (characterId)
local lastFingerprint
local busy = false

local function normalize(plate)
  return (tostring(plate or ""):gsub("^%s+", ""):gsub("%s+$", "")):upper()
end

local function fingerprint()
  local tableName, ownerColumn = Framework.vehicleTable()
  local rows = Framework.query(
    ("SELECT COUNT(*) AS n, COALESCE(SUM(CRC32(CONCAT_WS('|', `%s`, plate))), 0) AS h FROM `%s`")
      :format(ownerColumn, tableName)
  )
  if not rows or not rows[1] then return nil end
  return ("%s:%s"):format(tostring(rows[1].n), tostring(rows[1].h))
end

--- plate -> owner of the whole table, or nil when it can't be read
local function readSnapshot()
  local tableName, ownerColumn = Framework.vehicleTable()
  local rows = Framework.query(("SELECT `%s` AS owner, plate FROM `%s`"):format(ownerColumn, tableName))
  if not rows then return nil end
  local map = {}
  for _, row in ipairs(rows) do
    if row.plate and row.owner then map[normalize(row.plate)] = tostring(row.owner) end
  end
  return map
end

--- the owners whose garage differs between two snapshots (a transfer changes both owners)
local function changedOwners(old, new)
  local changed, list = {}, {}
  local function add(owner)
    if owner and not changed[owner] then
      changed[owner] = true
      list[#list + 1] = owner
    end
  end
  for plate, owner in pairs(new) do
    if old[plate] ~= owner then
      add(owner)
      add(old[plate])
    end
  end
  for plate, owner in pairs(old) do
    if new[plate] == nil then add(owner) end
  end
  return list
end
VehicleWatch.changedOwners = changedOwners

local function describe(data)
  local created, moved, removed = 0, 0, 0
  for _, character in pairs(data.characters or {}) do
    if character.vehicles then
      created = created + #(character.vehicles.created or {})
      moved = moved + #(character.vehicles.updated or {})
    end
    if character.removed then
      removed = removed + #(character.removed.deleted or {}) + #(character.removed.unlinked or {})
    end
  end
  return created, moved, removed
end

--- sends these characters' whole garages to the CAD, in batches
local function sendCharacters(characterIds, pause)
  local batch = {}
  local function flush()
    if #batch == 0 then return end
    local body = Sync.serverInfo({
      characters = batch,
      createVehicleModels = Config.Vehicles.createModels == true,
    })
    local data, status, raw = Api.await("/vehicles", body)
    if not data then
      Sync.log("^3vehicle sync failed: %s^0", Api.describeError(status, raw))
    else
      local created, moved, removed = describe(data)
      if created + moved + removed > 0 then
        Sync.log("vehicles: %d added, %d updated or moved, %d removed", created, moved, removed)
      end
    end
    batch = {}
    if pause then Wait(pause) end
  end

  for _, characterId in ipairs(characterIds) do
    local vehicles, _, plates = Framework.getVehicles(characterId)
    if vehicles then
      Framework.applyModelNames(vehicles)
      batch[#batch + 1] = { characterId = characterId, vehicles = vehicles, plates = plates }
      if #batch >= BATCH_SIZE then flush() end
    end
  end
  flush()
end

local function enabled()
  return Config.Sync.vehicles and Framework.name and Framework.hasDatabase() and Settings.isConfigured()
end

--- compares the table with the last copy and sends what changed. Returns the characters sent.
function VehicleWatch.check(force)
  if busy or not enabled() then return {} end
  busy = true
  local ok, result = pcall(function()
    local current = fingerprint()
    if not current or (current == lastFingerprint and not force) then return {} end
    local fresh = readSnapshot()
    if not fresh then return {} end
    local owners = snapshot and changedOwners(snapshot, fresh) or {}
    snapshot, lastFingerprint = fresh, current
    if #owners > 0 then
      debug("vehicle table changed: %d character(s)", #owners)
      sendCharacters(owners)
    end
    return owners
  end)
  busy = false
  if not ok then
    Sync.log("^1vehicle watcher error: %s^0", tostring(result))
    return {}
  end
  return result
end

--- every character the CAD has synced, whole garage (changes made while the resource was off)
function VehicleWatch.catchUp()
  if not enabled() then return 0 end
  local data, status, raw = Api.await("/characters/known", { framework = Framework.name })
  if not data or not data.characterIds then
    Sync.log("^3vehicle catch-up skipped: %s^0", Api.describeError(status, raw))
    return 0
  end
  sendCharacters(data.characterIds, 250)
  return #data.characterIds
end

CreateThread(function()
  while not Framework.name do Wait(1000) end
  if not Framework.hasDatabase() then return end
  Wait(5000)
  lastFingerprint = fingerprint()
  snapshot = readSnapshot()
  if Config.Vehicles.catchUpOnStart ~= false then
    local count = VehicleWatch.catchUp()
    if count > 0 then debug("vehicle catch-up: %d character(s)", count) end
  end

  while true do
    local seconds = tonumber(Config.Vehicles.watchSeconds) or 0
    Wait(math.max(seconds, 2) * 1000)
    if seconds > 0 then VehicleWatch.check() end
  end
end)

--- a script that changed vehicles can ask for an immediate check instead of waiting for the next
--- tick: exports["snailycad-framework"]:VehiclesChanged()
exports("VehiclesChanged", function()
  CreateThread(function() VehicleWatch.check() end)
end)
