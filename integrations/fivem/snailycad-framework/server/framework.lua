--[[
  Framework adapters: ESX Legacy, QBCore and Qbox. Reads characters, jobs / duty and owned
  vehicles, and turns them into CAD data with shared/mapping.lua.
]]

Framework = { name = nil }

local ESX, QBCore

local function debug(message, ...)
  if Config.Debug then print(("[snailycad-framework] " .. message):format(...)) end
end
Framework.debug = debug

local function started(resource)
  return GetResourceState(resource) == "started"
end

local function detect()
  local wanted = Config.Framework or "auto"
  if (wanted == "auto" or wanted == "qbox") and started("qbx_core") then return "qbox" end
  if (wanted == "auto" or wanted == "qbcore") and started("qb-core") then return "qbcore" end
  if (wanted == "auto" or wanted == "esx") and started("es_extended") then return "esx" end
  return nil
end

--- waits (up to 60 s) for the framework to start; returns its name or nil
function Framework.init()
  for _ = 1, 60 do
    local name = detect()
    if name then
      Framework.name = name
      if name == "esx" then
        ESX = exports["es_extended"]:getSharedObject()
      elseif name == "qbcore" then
        QBCore = exports["qb-core"]:GetCoreObject()
      end
      return name
    end
    Wait(1000)
  end
  return nil
end

-- --- players -------------------------------------------------------------------------------------

--- ESX: xPlayer, QBCore / Qbox: the Player object (with .PlayerData)
function Framework.getPlayer(source)
  source = tonumber(source)
  if not source then return nil end
  if Framework.name == "esx" then
    return ESX and ESX.GetPlayerFromId(source) or nil
  elseif Framework.name == "qbox" then
    local ok, player = pcall(function() return exports.qbx_core:GetPlayer(source) end)
    return ok and player or nil
  elseif Framework.name == "qbcore" then
    return QBCore and QBCore.Functions.GetPlayer(source) or nil
  end
  return nil
end

--- what Config.Callsign gets: ESX xPlayer, or QBCore / Qbox PlayerData
function Framework.getPlayerData(source)
  local player = Framework.getPlayer(source)
  if not player then return nil end
  if Framework.name == "esx" then return player end
  return player.PlayerData
end

--- job name and whether the player is on duty (nil when the player isn't loaded)
function Framework.getJob(source)
  local player = Framework.getPlayer(source)
  if not player then return nil, false end
  if Framework.name == "esx" then
    local job = player.job or (player.getJob and player.getJob())
    if not job then return nil, false end
    -- ESX Legacy 1.10+: job.onDuty; older ESX has no duty, so a job counts as on duty
    return job.name, job.onDuty ~= false
  end
  local job = player.PlayerData and player.PlayerData.job
  if not job then return nil, false end
  return job.name, job.onduty == true
end

--- license, Discord id and Steam id (decimal, like the CAD stores it)
function Framework.getIdentifiers(source)
  local result = {}
  for _, identifier in ipairs(GetPlayerIdentifiers(source) or {}) do
    local kind, value = identifier:match("^(%w+):(.+)$")
    if kind == "license" then
      result.license = value
    elseif kind == "license2" and not result.license then
      result.license = value
    elseif kind == "discord" then
      result.discordId = value
    elseif kind == "steam" then
      result.steamId = Mapping.steamDecimal(value)
    end
  end
  return result
end

-- --- database (oxmysql) --------------------------------------------------------------------------

local function hasDatabase()
  return started("oxmysql")
end
Framework.hasDatabase = hasDatabase

local function query(sql, params)
  if not hasDatabase() then return nil end
  local p = promise.new()
  local ok = pcall(function()
    exports.oxmysql:query(sql, params or {}, function(result)
      p:resolve(result)
    end)
  end)
  if not ok then return nil end
  return Citizen.Await(p)
end
Framework.query = query

local columnsCache = {}
--- the columns of a table in the server's database ({ name = true }), cached
local function columns(tableName)
  if columnsCache[tableName] then return columnsCache[tableName] end
  local rows = query(
    "SELECT COLUMN_NAME AS name FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    { tableName }
  )
  if not rows then return {} end
  local result = {}
  for _, row in ipairs(rows) do result[row.name or row.COLUMN_NAME] = true end
  columnsCache[tableName] = result
  return result
end

-- --- characters ----------------------------------------------------------------------------------

local function characterOptions()
  return {
    genders = Config.Character.genders,
    dateFormat = Config.Character.dateFormat,
    phone = Config.Character.phone,
    height = Config.Character.height,
    weight = Config.Character.weight,
    address = Config.Character.address,
    ethnicity = Config.Character.ethnicity,
  }
end

--- the phone number from a phone script, when the framework has none (ops-phone, lb-phone)
local PHONE_EXPORTS = {
  { resource = "opslabs-phone", get = function(source) return exports["opslabs-phone"]:GetPhoneNumber(source) end },
  { resource = "lb-phone", get = function(source) return exports["lb-phone"]:GetEquippedPhoneNumber(source) end },
}

local function phoneFromPhoneScript(source)
  for _, phone in ipairs(PHONE_EXPORTS) do
    if started(phone.resource) then
      local ok, number = pcall(phone.get, source)
      if ok and number and number ~= "" then return tostring(number) end
    end
  end
  return nil
end

--- the game licences a character holds and all licence types the server has ({ [type] = true })
local esxLicenceTypes
local function licences(identifier, playerData)
  if Config.Licenses == nil or Config.Licenses.sync == false then return nil, nil end
  local held, known = {}, {}
  if Framework.name == "esx" then
    if not identifier or not columns("user_licenses").type then return nil, nil end
    if not esxLicenceTypes then
      esxLicenceTypes = {}
      for _, row in ipairs(query("SELECT type FROM licenses") or {}) do esxLicenceTypes[row.type] = true end
    end
    for licenceType in pairs(esxLicenceTypes) do known[licenceType] = true end
    for _, row in ipairs(query("SELECT type FROM user_licenses WHERE owner = ?", { identifier }) or {}) do
      held[row.type] = true
      known[row.type] = true
    end
  else
    local metadata = playerData and playerData.metadata or {}
    for licenceType, has in pairs(metadata.licences or metadata.licenses or {}) do
      known[licenceType] = true
      if has == true then held[licenceType] = true end
    end
  end
  return held, known
end

local function addLicences(character, identifier, playerData)
  if not character then return end
  local held, known = licences(identifier, playerData)
  if not held then return end
  local result, categories = Mapping.licences(held, known, Config.Licenses)
  character.licenses = result
  character.licenseCategories = categories
  character.licenseValues = { valid = Config.Licenses.valid, none = Config.Licenses.none }
end

--- the saved skin (JSON) for hair and eye colour: ESX users.skin, QBCore / Qbox playerskins
local function savedSkin(identifier)
  if not identifier then return nil end
  if Framework.name == "esx" then
    if not columns("users").skin then return nil end
    local rows = query("SELECT skin FROM users WHERE identifier = ?", { identifier })
    return rows and rows[1] and rows[1].skin or nil
  end
  if not columns("playerskins").skin then return nil end
  local rows = query("SELECT skin FROM playerskins WHERE citizenid = ? ORDER BY active DESC LIMIT 1", { identifier })
  return rows and rows[1] and rows[1].skin or nil
end

--- the character's id and CAD data, or nil (not loaded / no identity yet)
--- override: values that just changed (e.g. from esx_identity:completedRegistration)
function Framework.getCharacter(source, override)
  local player = Framework.getPlayer(source)
  if not player then return nil end

  if Framework.name == "esx" then
    override = override or {}
    local get = player.get or function() return nil end
    local data = {
      identifier = player.identifier or (player.getIdentifier and player.getIdentifier()),
      firstName = override.firstname or get("firstName"),
      lastName = override.lastname or get("lastName"),
      dateOfBirth = override.dateofbirth or get("dateofbirth"),
      sex = override.sex or get("sex"),
      height = override.height or get("height"),
    }
    if Config.Character.phone ~= false and data.identifier and columns("users").phone_number then
      local rows = query("SELECT phone_number FROM users WHERE identifier = ?", { data.identifier })
      data.phoneNumber = rows and rows[1] and rows[1].phone_number or nil
    end
    if Config.Character.appearance ~= false then data.skin = savedSkin(data.identifier) end
    local characterId, character = Mapping.esxCharacter(data, characterOptions())
    if character and not character.phoneNumber and Config.Character.phone ~= false then
      character.phoneNumber = phoneFromPhoneScript(source)
    end
    addLicences(character, data.identifier, nil)
    return characterId, character
  end

  local playerData = player.PlayerData
  local skin = Config.Character.appearance ~= false and playerData and savedSkin(playerData.citizenid) or nil
  local characterId, character = Mapping.qbCharacter(playerData, characterOptions(), skin)
  if character and not character.phoneNumber and Config.Character.phone ~= false then
    character.phoneNumber = phoneFromPhoneScript(source)
  end
  addLicences(character, nil, playerData)
  return characterId, character
end

-- --- vehicles ------------------------------------------------------------------------------------

-- model hash (signed) -> { model, label }: ESX vehicles table, QBCore shared vehicles, clients
local modelNames = {}
Framework.modelNames = modelNames

local function rememberModel(model, label)
  if type(model) ~= "string" or model == "" then return end
  local hash = Mapping.signedHash(GetHashKey(model))
  if hash then modelNames[hash] = { model = model, label = label } end
end

--- loads model names the server knows (ESX: the vehicles shop table)
function Framework.loadModelNames()
  if Framework.name == "esx" then
    if columns("vehicles").model then
      for _, row in ipairs(query("SELECT model, name FROM vehicles") or {}) do
        rememberModel(row.model, row.name)
      end
    end
  end
end

local function qbSharedVehicles()
  if Framework.name == "qbox" then
    local ok, vehicles = pcall(function() return exports.qbx_core:GetVehiclesByName() end)
    if ok and type(vehicles) == "table" then return vehicles end
  end
  if QBCore and QBCore.Shared then return QBCore.Shared.Vehicles end
  if Framework.name == "qbox" and started("qb-core") then
    local ok, core = pcall(function() return exports["qb-core"]:GetCoreObject() end)
    if ok and core and core.Shared then return core.Shared.Vehicles end
  end
  return {}
end

local function decode(value)
  if type(value) == "table" then return value end
  if type(value) ~= "string" or value == "" then return {} end
  local ok, result = pcall(json.decode, value)
  return ok and type(result) == "table" and result or {}
end

--- the character's owned vehicles for the CAD, and model hashes without a name
--- returns nil when there is no database (oxmysql)
function Framework.getVehicles(characterId)
  if not hasDatabase() then return nil end
  local vehicles, unknown = {}, {}

  if Framework.name == "esx" then
    local cols = columns("owned_vehicles")
    local select = { "plate", "vehicle" }
    if cols.type then select[#select + 1] = "`type`" end
    if cols.job then select[#select + 1] = "job" end
    local rows = query(
      ("SELECT %s FROM owned_vehicles WHERE owner = ?"):format(table.concat(select, ", ")),
      { characterId }
    ) or {}
    local options = { skipJobVehicles = Config.Vehicles.skipJobVehicles, types = Config.Vehicles.types }
    for _, row in ipairs(rows) do
      local vehicle, reason = Mapping.esxVehicle(row, decode(row.vehicle), modelNames, options)
      if vehicle then
        vehicles[#vehicles + 1] = vehicle
        if vehicle.hash and not vehicle.model then unknown[#unknown + 1] = vehicle.hash end
      else
        debug("skipping %s: %s", row.plate or "?", reason)
      end
    end
  else
    local rows = query(
      "SELECT plate, vehicle, hash, mods FROM player_vehicles WHERE citizenid = ?",
      { characterId }
    ) or {}
    local shared = qbSharedVehicles()
    for _, row in ipairs(rows) do
      local vehicle = Mapping.qbVehicle(row, decode(row.mods), shared)
      if vehicle then vehicles[#vehicles + 1] = vehicle end
    end
  end

  return vehicles, unknown
end

--- fills in model names for vehicles that only have a hash (after a client named them)
function Framework.applyModelNames(vehicles)
  for _, vehicle in ipairs(vehicles or {}) do
    local name = vehicle.hash and modelNames[vehicle.hash]
    if name and not vehicle.model then
      vehicle.model = name.model
      vehicle.label = vehicle.label or name.label
    end
  end
end

--- names a client sent for model hashes
function Framework.rememberClientNames(names)
  local count = 0
  for hash, name in pairs(names) do
    hash = Mapping.signedHash(hash)
    if hash and type(name) == "table" and not modelNames[hash] then
      local model = type(name.model) == "string" and name.model:sub(1, 64) or nil
      local label = type(name.label) == "string" and name.label:sub(1, 64) or nil
      if model and model ~= "" and model ~= "CARNOTFOUND" then
        modelNames[hash] = { model = model:lower(), label = label }
        count = count + 1
      end
    end
    if count >= 64 then break end
  end
end
