--[[
  Sync: characters -> CAD citizens, owned vehicles -> CAD registered vehicles, duty -> CAD unit
  status. Runs on character load, on duty / job changes, on a timer, and on demand
  (snailyframework_sync, exports.SyncPlayer).
]]

Sync = {}

local debug = Framework.debug
local function log(message, ...)
  print(("[snailycad-framework] " .. message):format(...))
end

-- per player: { characterId, identifiers, dutyUnitType, syncing, lastSync }
local players = {}
Sync.players = players

local function state(source)
  source = tonumber(source)
  if not players[source] then players[source] = {} end
  return players[source]
end

local function serverInfo(body)
  -- (Sync.serverInfo, for server/vehicles.lua)
  body.framework = Framework.name
  body.serverName = Api.serverName()
  body.version = Api.version
  body.phoneResources = Framework.phoneResources()
  return body
end
Sync.serverInfo = serverInfo
Sync.log = log

-- --- model names from clients ----------------------------------------------------------------

local pendingNames = {}
local nextRequestId = 0

--- asks the player's game to name model hashes the server doesn't know (waits up to 5 s)
local function resolveModelNames(source, hashes)
  if #hashes == 0 or GetPlayerPing(source) == 0 then return end
  local wanted = {}
  local list = {}
  for _, hash in ipairs(hashes) do
    if not wanted[hash] and #list < 64 then
      wanted[hash] = true
      list[#list + 1] = hash
    end
  end
  nextRequestId = nextRequestId + 1
  local requestId = nextRequestId
  local p = promise.new()
  pendingNames[requestId] = { source = source, wanted = wanted, promise = p }
  TriggerClientEvent("snailycad-framework:resolveModels", source, requestId, list)
  SetTimeout(5000, function()
    if pendingNames[requestId] then
      pendingNames[requestId] = nil
      p:resolve(false)
    end
  end)
  Citizen.Await(p)
end

RegisterNetEvent("snailycad-framework:models", function(requestId, names)
  local source = source
  local pending = pendingNames[requestId]
  if not pending or pending.source ~= source or type(names) ~= "table" then return end
  pendingNames[requestId] = nil
  -- only the hashes we asked this player about
  local filtered = {}
  for hash, name in pairs(names) do
    local signed = Mapping.signedHash(hash)
    if signed and pending.wanted[signed] then filtered[signed] = name end
  end
  Framework.rememberClientNames(filtered)
  pending.promise:resolve(true)
end)

-- --- characters and vehicles --------------------------------------------------------------------

local function describeVehicles(result)
  if type(result) ~= "table" then return "" end
  local skipped = {}
  for _, entry in ipairs(result.skipped or {}) do
    skipped[#skipped + 1] = ("%s (%s)"):format(entry.plate, entry.reason)
  end
  return (", vehicles: %d new, %d updated, %d unchanged%s"):format(
    #(result.created or {}),
    #(result.updated or {}),
    #(result.unchanged or {}),
    #skipped > 0 and (", skipped " .. table.concat(skipped, ", ")) or ""
  )
end

--- syncs a player's character (and vehicles) to the CAD; returns the CAD's answer or nil, error
--- options: { override = esx_identity data, quiet = true }
function Sync.player(source, options)
  options = options or {}
  source = tonumber(source)
  if not source or not Framework.name then return nil, "no framework" end
  if not Settings.isConfigured() then return nil, "not set up" end
  if not Config.Sync.citizens and not Config.Sync.vehicles then return nil, "sync off" end

  local current = state(source)
  if current.syncing then return nil, "already syncing" end
  current.syncing = true

  local ok, result, err = pcall(function()
    local characterId, character, phones = Framework.getCharacter(source, options.override)
    if not characterId then return nil, "no character loaded" end
    current.characterId = characterId
    current.identifiers = Framework.getIdentifiers(source)

    local vehicles, plates
    if Config.Sync.vehicles then
      local unknown
      vehicles, unknown, plates = Framework.getVehicles(characterId)
      if vehicles == nil then
        debug("oxmysql isn't running: vehicles aren't synced")
      elseif unknown and #unknown > 0 then
        resolveModelNames(source, unknown)
        Framework.applyModelNames(vehicles)
      end
    end

    local body = serverInfo({
      characterId = characterId,
      identifiers = Api.identifiers(current.identifiers),
      unlinked = Config.Unlinked == "create" and "create" or "skip",
      character = character,
      phones = phones,
      vehicles = vehicles,
      plates = plates,
      createVehicleModels = Config.Vehicles.createModels == true,
    })
    local data, status, raw = Api.await("/characters", body)
    if not data then return nil, Api.describeError(status, raw) end
    current.lastSync = os.time()
    current.citizenId = data.citizenId

    local message = ("%s %s (%s, %s): %s%s%s"):format(
      character.firstName,
      character.lastName,
      GetPlayerName(source) or source,
      data.linked and "linked to a CAD account" or "no CAD account",
      data.result or "?",
      data.reason and (" - " .. data.reason) or "",
      describeVehicles(data.vehicles)
    )
    if options.quiet then debug(message) else log(message) end
    return data
  end)
  current.syncing = false

  if not ok then
    log("^1sync for %s failed: %s^0", source, tostring(result))
    return nil, tostring(result)
  end
  if not result and err and err ~= "no character loaded" then
    log("^3sync for %s: %s^0", GetPlayerName(source) or source, err)
  end
  return result, err
end

-- --- duty ----------------------------------------------------------------------------------------

--- sends a duty change for one unit type; returns the CAD's answer
local function sendDuty(source, current, unitType, onDuty, jobEntry)
  local playerData = Framework.getPlayerData(source)
  local ok, callsign = pcall(Config.Callsign, source, playerData)
  local body = serverInfo({
    characterId = current.characterId,
    identifiers = Api.identifiers(current.identifiers),
    onDuty = onDuty,
    unitType = unitType,
    departments = jobEntry and jobEntry.departments or nil,
    callsign = ok and type(callsign) == "string" and callsign ~= "" and callsign:sub(1, 64) or nil,
  })
  local data, status, raw = Api.await("/duty", body)
  if not data then
    log("^3duty sync for %s failed: %s^0", GetPlayerName(source) or source, Api.describeError(status, raw))
    return nil
  end
  local units = data.units and table.concat(data.units, ", ") or ""
  local message = ("%s %s duty (%s): %s%s"):format(
    GetPlayerName(source) or source,
    onDuty and "on" or "off",
    unitType,
    data.result or "?",
    data.reason and (" - " .. data.reason) or (units ~= "" and (" - " .. units) or "")
  )
  if data.result == "onDuty" or data.result == "offDuty" then log(message) else debug(message) end
  return data
end

--- compares the player's job / duty with the last one sent and tells the CAD what changed
--- send = false only records the current duty (character load with Config.Duty.onLoad = false)
function Sync.duty(source, send)
  source = tonumber(source)
  if not source or not Config.Sync.duty or not Framework.name then return end
  if not Settings.isConfigured() then return end
  local current = state(source)
  if current.dutyBusy then
    current.dutyAgain = true
    return
  end

  local job, onDuty = Framework.getJob(source)
  if not job then return end
  local entry = Config.Jobs[job]
  local wanted = entry and onDuty and entry.unitType or nil
  if wanted == current.dutyUnitType then return end

  if send == false then
    current.dutyUnitType = wanted
    return
  end

  current.dutyBusy = true
  if not current.identifiers then current.identifiers = Framework.getIdentifiers(source) end
  if not current.characterId then current.characterId = Framework.getCharacter(source) end
  local previous = current.dutyUnitType
  local ok, err = pcall(function()
    if previous then sendDuty(source, current, previous, false, nil) end
    if wanted then sendDuty(source, current, wanted, true, entry) end
  end)
  if not ok then log("^1duty sync for %s failed: %s^0", source, tostring(err)) end
  current.dutyUnitType = wanted
  current.dutyBusy = false

  -- the duty changed again while the CAD was answering
  if current.dutyAgain then
    current.dutyAgain = false
    Sync.duty(source)
  end
end

--- the player left or logged out of the character: their unit goes off duty
local function leave(source, reason)
  source = tonumber(source)
  local current = source and players[source]
  if not current then return end
  players[source] = nil
  if Config.Sync.duty and Config.Duty.offDutyOnLeave and current.dutyUnitType and Settings.isConfigured() then
    local unitType = current.dutyUnitType
    CreateThread(function()
      debug("%s %s: setting %s off duty", source, reason, unitType)
      sendDuty(source, current, unitType, false, nil)
    end)
  end
end

-- --- framework events ---------------------------------------------------------------------------

local function onCharacterLoaded(source, override)
  source = tonumber(source)
  if not source then return end
  -- a new character: the framework's state is the one of the new character
  local previous = players[source]
  if previous and previous.characterId then leave(source, "switched character") end
  CreateThread(function()
    Wait(2000) -- let the framework finish loading the character
    Sync.player(source, { override = override })
    if Config.Sync.duty then Sync.duty(source, Config.Duty.onLoad ~= false) end
  end)
end

local function onDutyEvent(source)
  source = tonumber(source)
  if not source then return end
  CreateThread(function()
    Wait(250) -- the framework updates its job table after some of these events
    Sync.duty(source)
  end)
end

local function registerEvents()
  if Framework.name == "esx" then
    AddEventHandler("esx:playerLoaded", function(source) onCharacterLoaded(source) end)
    AddEventHandler("esx_identity:completedRegistration", function(source, data)
      onCharacterLoaded(source, type(data) == "table" and data or nil)
    end)
    AddEventHandler("esx:setJob", function(source) onDutyEvent(source) end)
    AddEventHandler("esx:playerLogout", function(source) leave(source, "logged out") end)
  else
    -- QBCore and Qbox
    AddEventHandler("QBCore:Server:PlayerLoaded", function(player)
      local source = type(player) == "table" and player.PlayerData and player.PlayerData.source
      if source then onCharacterLoaded(source) end
    end)
    AddEventHandler("QBCore:Server:OnJobUpdate", function(source) onDutyEvent(source) end)
    AddEventHandler("QBCore:Server:SetDuty", function(source) onDutyEvent(source) end)
    AddEventHandler("QBCore:Server:OnPlayerUnload", function(source) leave(source, "logged out") end)
    if Framework.name == "qbox" then
      AddEventHandler("qbx_core:server:playerLoggedOut", function(source) leave(source, "logged out") end)
    end
  end
  AddEventHandler("playerDropped", function()
    leave(source, "left")
  end)
end

-- someone bought / got a vehicle: other resources can trigger this (server side) with the player
AddEventHandler("snailycad-framework:vehicleBought", function(playerId)
  local source = tonumber(playerId)
  if source then CreateThread(function() Sync.player(source, { quiet = true }) end) end
end)

--- the server ids of everyone with a character loaded
function Sync.onlinePlayers()
  local result = {}
  for _, id in ipairs(GetPlayers()) do
    local source = tonumber(id)
    if source and Framework.getPlayer(source) then result[#result + 1] = source end
  end
  return result
end

-- --- start -------------------------------------------------------------------------------------

CreateThread(function()
  local name = Framework.init()
  if not name then
    log("^1no framework found (es_extended, qb-core or qbx_core). Set Config.Framework or start the framework before this resource.^0")
    return
  end
  log("framework: %s%s", name, Framework.hasDatabase() and "" or " (oxmysql not running: vehicles won't sync)")
  if not Settings.isConfigured() then
    log("^3not set up yet: set snailycad_framework_api_url and snailycad_framework_api_token in server.cfg, or run snailyframework_setup <url> <token> here.^0")
  end
  registerEvents()
  Framework.loadModelNames()

  -- after a resource restart: everyone already in game
  Wait(3000)
  for _, source in ipairs(Sync.onlinePlayers()) do
    Sync.player(source, { quiet = true })
    if Config.Sync.duty then Sync.duty(source, Config.Duty.onLoad ~= false) end
  end
end)

-- duty changes without an event (other scripts writing the job table directly)
CreateThread(function()
  while true do
    local seconds = tonumber(Config.Duty.pollSeconds) or 0
    Wait(math.max(seconds, 5) * 1000)
    if seconds > 0 and Config.Sync.duty and Framework.name then
      -- a copy: players join and leave while the CAD answers
      local sources = {}
      for source, current in pairs(players) do
        if current.characterId then sources[#sources + 1] = source end
      end
      for _, source in ipairs(sources) do
        local current = players[source]
        if current and not current.dutyBusy then Sync.duty(source) end
      end
    end
  end
end)

-- periodic resync (new vehicles, renames)
CreateThread(function()
  while true do
    local minutes = tonumber(Config.ResyncMinutes) or 0
    Wait(math.max(minutes, 1) * 60 * 1000)
    if minutes > 0 and Framework.name and Settings.isConfigured() then
      for _, source in ipairs(Sync.onlinePlayers()) do
        Sync.player(source, { quiet = true })
        Wait(500)
      end
    end
  end
end)

-- --- exports -------------------------------------------------------------------------------------

--- syncs a player's character and vehicles now (e.g. after your shop gave them a car)
exports("SyncPlayer", function(source)
  CreateThread(function() Sync.player(source, { quiet = true }) end)
end)

--- re-checks a player's duty now (e.g. after your script changed it without a framework event)
exports("SyncDuty", function(source)
  CreateThread(function() Sync.duty(source) end)
end)

--- the CAD citizen id of a player's character (after the first sync), or nil
exports("GetCitizenId", function(source)
  local current = players[tonumber(source)]
  return current and current.citizenId or nil
end)
