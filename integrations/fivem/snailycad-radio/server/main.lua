--[[
  Gets each player a radio token from the CAD (POST /v1/radio/external/token, with the CAD API
  token that never leaves the server) and hands it to their game. The game's radio then talks
  straight to the CAD's radio server.
]]

local apiUrl = (Config.ApiUrl or ""):gsub("/+$", "")
local configured = apiUrl ~= "" and Config.ApiToken ~= ""
local lastRequest = {}
-- the CAD's channel list, from the last token response (for exports)
local knownChannels = {}

local function debug(message, ...)
  if Config.Debug then print(("[snailycad-radio] " .. message):format(...)) end
end

if not configured then
  print("^3[snailycad-radio] Set snailycad_radio_api_url and snailycad_radio_api_token in server.cfg (see README.md).^0")
end

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
    ["snaily-cad-api-token"] = Config.ApiToken,
  })
end

RegisterNetEvent("snailycad-radio:requestToken", function()
  local source = source
  if not configured then
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
  if not configured then
    print("^1[snailycad-radio] not configured: set snailycad_radio_api_url and snailycad_radio_api_token^0")
    return
  end
  print(("[snailycad-radio] checking %s ..."):format(apiUrl))
  PerformHttpRequest(apiUrl .. "/radio/external/token", function(status, response)
    if status == 200 then
      local data = json.decode(response)
      print(("^2[snailycad-radio] OK: radio server %s (%s audio)^0"):format(data.wsUrl, data.transport))
      for index, channel in ipairs(data.channels or {}) do
        print(("  %d. %s %s"):format(index, channel.name, channel.frequency or ""))
      end
      if #(data.channels or {}) == 0 then
        print("  (no channels open to game servers: add some in the CAD, CAD Settings > Radio)")
      end
      knownChannels = data.channels or knownChannels
    elseif status == 401 then
      print("^1[snailycad-radio] the CAD API token is wrong or the API token is turned off in the CAD^0")
    elseif status == 400 then
      print(("^1[snailycad-radio] the CAD refused: %s (is the Radio feature turned on?)^0"):format(response or ""))
    else
      print(("^1[snailycad-radio] could not reach the CAD: HTTP %s %s^0"):format(status, response or ""))
    end
  end, "POST", json.encode({ name = "server check", identity = "fivem:server-check", kind = "game" }), {
    ["Content-Type"] = "application/json",
    ["snaily-cad-api-token"] = Config.ApiToken,
  })
end, true)
