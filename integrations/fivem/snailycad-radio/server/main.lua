--[[
  Gets each player a radio token from the CAD (POST /v1/radio/external/token, with the CAD API
  token that never leaves the server) and hands it to their game. The game's radio then talks
  straight to the CAD's radio server.
]]

local lastRequest = {}
-- the CAD's channel list, from the last token response (for exports)
local knownChannels = {}

local function debug(message, ...)
  if Config.Debug then print(("[snailycad-radio] " .. message):format(...)) end
end

CreateThread(function()
  if not Settings.isConfigured() then
    print("^3[snailycad-radio] Not set up yet: set snailycad_radio_api_url and snailycad_radio_api_token in server.cfg, run snailyradio_setup <url> <token> here, or use /radiosetup in game as an admin.^0")
  end
end)

--- asks the CAD for a radio token for this player; cb(response | nil, error)
local function fetchToken(source, cb)
  local hasRadio, departments = Access.check(source)
  if not hasRadio and not Config.Nearby.enabled then
    return cb(nil, "no_radio")
  end

  local identifiers = Access.getIdentifiers(source)
  local name = Config.DisplayName(source, Access.getName(source)) or Access.getName(source)
  local body = {
    name = name,
    identity = "fivem:" .. (identifiers.license or ("player-" .. source)),
    identifiers = { discordId = identifiers.discordId, steamId = identifiers.steamId },
    kind = "game",
    departments = departments,
    proximity = Config.Nearby.enabled == true,
    -- players without a radio still connect, but only to overhear radios near them
    listenOnly = not hasRadio,
  }

  local apiUrl, apiToken = Settings.get()
  PerformHttpRequest(apiUrl .. "/radio/external/token", function(status, response)
    if status ~= 200 or not response then
      debug("token request for %s failed: HTTP %s %s", source, status, response or "")
      return cb(nil, ("http_%s"):format(status))
    end
    local ok, data = pcall(json.decode, response)
    if not ok or type(data) ~= "table" or not data.token then
      return cb(nil, "bad_response")
    end
    if hasRadio and type(data.channels) == "table" and #data.channels > 0 then
      knownChannels = data.channels
    end
    data.hasRadio = hasRadio
    cb(data)
  end, "POST", json.encode(body), {
    ["Content-Type"] = "application/json",
    ["snaily-cad-api-token"] = apiToken,
  })
end

RegisterNetEvent("snailycad-radio:requestToken", function()
  local source = source
  if not Settings.isConfigured() then
    TriggerClientEvent("snailycad-radio:token", source, nil, "not_configured")
    return
  end
  -- at most one token every 3 seconds per player
  local now = GetGameTimer()
  if lastRequest[source] and now - lastRequest[source] < 3000 then return end
  lastRequest[source] = now

  fetchToken(source, function(response, err)
    TriggerClientEvent("snailycad-radio:token", source, response, err)
  end)
end)

AddEventHandler("playerDropped", function()
  lastRequest[source] = nil
end)

-- job changes: the player's game asks for a new token (with the new access)
local function refreshAccess(source)
  TriggerClientEvent("snailycad-radio:refresh", source)
end
AddEventHandler("esx:setJob", function(source) refreshAccess(source) end)
AddEventHandler("QBCore:Server:OnJobUpdate", function(source) refreshAccess(source) end)
AddEventHandler("QBCore:Server:SetDuty", function(source) refreshAccess(source) end)

-- --- exports for other resources -------------------------------------------------------------

--- the channel id a player's radio is on (nil when off / no radio)
exports("GetPlayerChannel", function(source)
  local state = Player(source).state.snailyRadio
  return state and state.on and state.channel or nil
end)

--- whether a player is transmitting right now
exports("IsPlayerTalking", function(source)
  local state = Player(source).state.snailyRadio
  return state ~= nil and state.talking == true
end)

--- whether a player wears an earpiece
exports("HasEarpiece", function(source)
  local state = Player(source).state.snailyRadio
  return state ~= nil and state.earpiece == true
end)

--- moves a player's radio to a channel (id, name or frequency)
exports("SetPlayerChannel", function(source, channel)
  TriggerClientEvent("snailycad-radio:setChannel", source, channel)
end)

--- turns a player's radio on or off
exports("SetPlayerRadioPower", function(source, on)
  TriggerClientEvent("snailycad-radio:power", source, on == true)
end)

--- plays a local tone on a player's radio ("beep", "alert", "panic", ...)
exports("PlayTone", function(source, tone)
  TriggerClientEvent("snailycad-radio:tone", source, tone)
end)

--- asks the player's game to fetch a new token, e.g. after you changed their job yourself
exports("RefreshPlayer", refreshAccess)

--- the CAD's radio channels { id, name, frequency, canTransmit } (after the first player connected)
exports("GetChannels", function()
  return knownChannels
end)

--- the players on a channel (server ids)
exports("GetPlayersOnChannel", function(channel)
  local players = {}
  for _, id in ipairs(GetPlayers()) do
    local state = Player(id).state.snailyRadio
    if state and state.on and state.channel == channel then
      players[#players + 1] = tonumber(id)
    end
  end
  return players
end)

-- --- console: snailyradio_check ---------------------------------------------------------------
-- checks the CAD URL and API token from the server console and lists the radio channels

RegisterCommand("snailyradio_check", function(source)
  if source ~= 0 then return end
  local url, token, from = Settings.get()
  if from == "none" then
    print("^1[snailycad-radio] not set up: use snailyradio_setup <url> <token>, server.cfg or /radiosetup in game^0")
    return
  end
  print(("[snailycad-radio] checking %s (settings from %s) ..."):format(url, from))
  Settings.check(url, token, function(result)
    if not result.ok then
      print(("^1[snailycad-radio] %s^0"):format(result.message))
      return
    end
    print(("^2[snailycad-radio] OK: radio server %s (%s audio)^0"):format(result.wsUrl, result.transport))
    for index, channel in ipairs(result.channels) do
      print(("  %d. %s %s"):format(index, channel.name, channel.frequency or ""))
    end
    if #result.channels == 0 then
      print("  (no channels open to game servers: add some in the CAD, CAD Settings > Radio)")
    end
    if #result.channels > 0 then knownChannels = result.channels end
  end)
end, true)
