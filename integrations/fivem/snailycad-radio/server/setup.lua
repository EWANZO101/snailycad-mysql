--[[
  Setting the radio up without editing files:
    - in game, for admins: /radiosetup (or Config.Keys.setup) opens a form; it also pops up by
      itself for an admin while the radio isn't set up
    - server console (txAdmin Live Console): snailyradio_setup <CAD API url> <CAD API token>
  Saved settings are used when server.cfg doesn't set snailycad_radio_api_url / _api_token.
]]

local function applyToEveryone()
  -- every player's game asks for a new radio token with the new settings
  TriggerClientEvent("snailycad-radio:refresh", -1)
end

local function sendStatus(source)
  local status = Settings.describe()
  status.isAdmin = Access.isAdmin(source)
  status.configured = status.source ~= "none"
  TriggerClientEvent("snailycad-radio:setup:status", source, status)
end

-- auto = the game asks by itself (radio not set up yet): stay quiet for non-admins
RegisterNetEvent("snailycad-radio:setup:open", function(auto)
  local source = source
  if not Access.isAdmin(source) then
    if not auto then TriggerClientEvent("snailycad-radio:setup:denied", source) end
    return
  end
  local status = Settings.describe()
  if auto and status.source ~= "none" then return end
  sendStatus(source)
end)

local lastAttempt = {}
local function rateLimited(source)
  local now = GetGameTimer()
  if lastAttempt[source] and now - lastAttempt[source] < 2000 then return true end
  lastAttempt[source] = now
  return false
end

local function readForm(data)
  if type(data) ~= "table" then return "", "" end
  local url = type(data.url) == "string" and data.url:sub(1, 300) or ""
  local token = type(data.token) == "string" and data.token:gsub("%s+", ""):sub(1, 200) or ""
  -- an empty token field keeps the saved token (the form never receives it)
  if token == "" then
    local _, savedToken = Settings.get()
    token = savedToken
  end
  return url, token
end

RegisterNetEvent("snailycad-radio:setup:test", function(data)
  local source = source
  if not Access.isAdmin(source) or rateLimited(source) then return end
  local url, token = readForm(data)
  Settings.check(url, token, function(result)
    result.channels = nil
    TriggerClientEvent("snailycad-radio:setup:result", source, "test", result)
  end)
end)

RegisterNetEvent("snailycad-radio:setup:save", function(data)
  local source = source
  if not Access.isAdmin(source) or rateLimited(source) then return end
  local url, token = readForm(data)
  -- only settings that work are saved
  Settings.check(url, token, function(result)
    if result.ok then
      Settings.save(url, token)
      local _, _, from = Settings.get()
      if from == "server.cfg" then
        result.message = result.message .. " Saved, but server.cfg still sets the radio: remove those two lines to use these settings."
      else
        result.message = result.message .. " Saved: radios are connecting."
        applyToEveryone()
      end
      print(("[snailycad-radio] settings saved in game by %s (%s)"):format(GetPlayerName(source) or source, url))
    end
    result.channels = nil
    TriggerClientEvent("snailycad-radio:setup:result", source, "save", result)
    sendStatus(source)
  end)
end)

AddEventHandler("playerDropped", function()
  lastAttempt[source] = nil
end)

-- console: snailyradio_setup <url> <token>   |   snailyradio_setup clear
RegisterCommand("snailyradio_setup", function(source, args)
  if source ~= 0 then return end
  if args[1] == "clear" then
    Settings.clear()
    print("[snailycad-radio] saved settings removed")
    applyToEveryone()
    return
  end
  local url, token = args[1], args[2]
  if not url or not token then
    print("usage: snailyradio_setup <CAD API url, e.g. https://cad-api.example.com/v1> <CAD API token>")
    print("       snailyradio_setup clear")
    return
  end
  Settings.check(url, token, function(result)
    if not result.ok then
      print(("^1[snailycad-radio] not saved: %s^0"):format(result.message))
      return
    end
    Settings.save(url, token)
    local _, _, from = Settings.get()
    print(("^2[snailycad-radio] %s saved.^0"):format(result.message))
    if from == "server.cfg" then
      print("^3[snailycad-radio] server.cfg also sets the radio and wins: remove those lines to use these settings.^0")
    end
    applyToEveryone()
  end)
end, true)
