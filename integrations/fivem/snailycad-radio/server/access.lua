--[[
  Who gets a radio, under which name, and in which CAD departments.
  Supports ESX, QBCore and Qbox jobs, ACE permissions, or everyone (see Config.Access).
]]

Access = {}

local ESX, QBCore

CreateThread(function()
  if GetResourceState("es_extended") == "started" then
    local ok, object = pcall(function()
      return exports["es_extended"]:getSharedObject()
    end)
    if ok then ESX = object end
  end
  if GetResourceState("qb-core") == "started" then
    local ok, object = pcall(function()
      return exports["qb-core"]:GetCoreObject()
    end)
    if ok then QBCore = object end
  end
end)

local function qboxPlayer(source)
  if GetResourceState("qbx_core") ~= "started" then return nil end
  local ok, player = pcall(function()
    return exports.qbx_core:GetPlayer(source)
  end)
  return ok and player or nil
end

--- job name and whether the player is on duty (nil when no framework is running)
function Access.getJob(source)
  if ESX then
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer and xPlayer.job then
      -- ESX Legacy has no duty system by default; job.onDuty exists on some setups
      return xPlayer.job.name, xPlayer.job.onDuty ~= false
    end
  end

  local player = qboxPlayer(source)
  if not player and QBCore then
    player = QBCore.Functions.GetPlayer(source)
  end
  if player and player.PlayerData and player.PlayerData.job then
    local job = player.PlayerData.job
    return job.name, job.onduty ~= false
  end

  return nil, false
end

--- "Firstname Lastname" from the framework, otherwise the FiveM name
function Access.getName(source)
  if ESX then
    local xPlayer = ESX.GetPlayerFromId(source)
    if xPlayer and xPlayer.getName then
      local name = xPlayer.getName()
      if name and name ~= "" then return name end
    end
  end

  local player = qboxPlayer(source)
  if not player and QBCore then
    player = QBCore.Functions.GetPlayer(source)
  end
  if player and player.PlayerData and player.PlayerData.charinfo then
    local info = player.PlayerData.charinfo
    local name = ("%s %s"):format(info.firstname or "", info.lastname or "")
    name = name:gsub("^%s+", ""):gsub("%s+$", "")
    if name ~= "" then return name end
  end

  return GetPlayerName(source) or ("Player %s"):format(source)
end

--- license (stable id), Discord id and Steam id (decimal, like the CAD stores it)
function Access.getIdentifiers(source)
  local result = {}
  for _, identifier in ipairs(GetPlayerIdentifiers(source)) do
    local kind, value = identifier:match("^(%w+):(.+)$")
    if kind == "license" then
      result.license = value
    elseif kind == "license2" and not result.license then
      result.license = value
    elseif kind == "discord" then
      result.discordId = value
    elseif kind == "steam" then
      -- steam:110000100000000 (hex) -> 76561197960265728
      local decimal = math.tointeger(tonumber(value, 16))
      if decimal then result.steamId = tostring(decimal) end
    end
  end
  return result
end

local function jobAccess(source)
  local job, onDuty = Access.getJob(source)
  if not job then return false, {} end
  local entry = Config.Jobs[job]
  if not entry then return false, {} end
  if not onDuty and not Config.AllowOffDuty then return false, {} end
  return true, entry.departments or {}
end

--- whether the player gets a radio, and the CAD departments that come with it
function Access.check(source)
  local mode = Config.Access
  if mode == "everyone" then
    local _, departments = jobAccess(source)
    return true, departments
  end

  local hasJob, departments = jobAccess(source)
  local hasAce = IsPlayerAceAllowed(source, Config.AcePermission)

  if mode == "job" then return hasJob, departments end
  if mode == "ace" then return hasAce, departments end
  return hasJob or hasAce, departments
end

--- server admins can set the radio up in game (/radiosetup): an ACE in Config.AdminAces, an ESX
--- admin group, or a QBCore admin permission
function Access.isAdmin(source)
  if source == 0 then return true end
  for _, ace in ipairs(Config.AdminAces or {}) do
    if IsPlayerAceAllowed(source, ace) then return true end
  end
  if ESX then
    local xPlayer = ESX.GetPlayerFromId(source)
    local group = xPlayer and xPlayer.getGroup and xPlayer.getGroup()
    if group == "admin" or group == "superadmin" or group == "owner" then return true end
  end
  if QBCore and QBCore.Functions.HasPermission then
    local ok, allowed = pcall(QBCore.Functions.HasPermission, source, "admin")
    if ok and allowed then return true end
    ok, allowed = pcall(QBCore.Functions.HasPermission, source, "god")
    if ok and allowed then return true end
  end
  return false
end
