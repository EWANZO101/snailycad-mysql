--[[
  Console commands (server console / txAdmin Live Console):
    snailyframework_setup <CAD API url> <CAD API token>   save the CAD connection (after a check)
    snailyframework_setup clear                            remove the saved connection
    snailyframework_check                                  connection, CAD settings, online players
    snailyframework_sync <player id | all>                 sync characters, vehicles and duty now
]]

local PREFIX = "[snailycad-framework]"

local function out(message, ...)
  print(PREFIX .. " " .. message:format(...))
end

local function yesNo(value)
  return value and "^2yes^0" or "^1no^0"
end

RegisterCommand("snailyframework_setup", function(source, args)
  if source ~= 0 then return end
  if args[1] == "clear" then
    Settings.clear()
    out("saved settings removed")
    return
  end
  local url, token = args[1], args[2]
  if not url or not token then
    print("usage: snailyframework_setup <CAD API url, e.g. https://cad-api.example.com/v1> <CAD API token>")
    print("       snailyframework_setup clear")
    return
  end
  url = Settings.trimUrl(url)
  if not url:match("^https?://") then
    out("^1not saved: the address must start with http:// or https://^0")
    return
  end
  CreateThread(function()
    local data, status, raw = Api.await("/check", { framework = Framework.name, phoneResources = Framework.phoneResources() }, url, token)
    if not data or not data.ok then
      out("^1not saved: %s^0", Api.describeError(status, raw))
      return
    end
    Settings.save(url, token)
    local _, _, from = Settings.get()
    out("^2connected and saved.^0 Run snailyframework_check to see what syncs.")
    if from == "server.cfg" then
      out("^3server.cfg also sets snailycad_framework_api_url / _api_token and wins: remove those lines to use these settings.^0")
    end
  end)
end, true)

RegisterCommand("snailyframework_check", function(source)
  if source ~= 0 then return end
  local url, _, from = Settings.get()
  if from == "none" then
    out("^1not set up: use snailyframework_setup <url> <token> or server.cfg (see README)^0")
    return
  end
  CreateThread(function()
    out("framework: %s, oxmysql: %s, CAD: %s (settings from %s)", Framework.name or "^1none^0",
      Framework.hasDatabase() and "running" or "^3not running (no vehicle sync)^0", url, from)

    local online = Sync.onlinePlayers()
    local list = {}
    for _, playerId in ipairs(online) do
      local identifiers = Framework.getIdentifiers(playerId)
      local characterId = Framework.getCharacter(playerId)
      list[#list + 1] = {
        characterId = characterId,
        identifiers = Api.identifiers(identifiers),
      }
    end

    local data, status, raw = Api.await("/check", {
      framework = Framework.name, players = list, phoneResources = Framework.phoneResources(),
    })
    if not data or not data.ok then
      out("^1%s^0", Api.describeError(status, raw))
      return
    end
    out("^2connected^0")

    local cad, settings, stats = data.cad or {}, data.settings or {}, data.stats or {}
    out("CAD switches (CAD Settings > FiveM framework): sync %s, citizens %s, vehicles %s, duty %s",
      yesNo(settings.enabled), yesNo(settings.syncCitizens), yesNo(settings.syncVehicles), yesNo(settings.syncDuty))
    out("this resource: citizens %s, vehicles %s, duty %s, players without a CAD account: %s",
      yesNo(Config.Sync.citizens), yesNo(Config.Sync.vehicles), yesNo(Config.Sync.duty), Config.Unlinked)
    out("synced so far: %d characters (%d without a CAD account), %d vehicles",
      stats.characters or 0, stats.unlinkedCharacters or 0, stats.vehicles or 0)
    out("CAD values: on-duty status %s, off-duty status %s, %d registration statuses, %d vehicle models, genders: %s",
      yesNo(cad.onDutyStatus), yesNo(cad.offDutyStatus), cad.registrationStatuses or 0,
      cad.vehicleModels or 0, table.concat(cad.genders or {}, ", "))
    if not cad.onDutyStatus or not cad.offDutyStatus then
      out("^3duty sync needs status codes with \"Set on duty\" and \"Set off duty\" (Admin > Values > Codes 10)^0")
    end
    if cad.registrationStatuses == 0 then
      out("^3vehicles need a registration status value (Admin > Values > License)^0")
    end
    if cad.dmv then out("^3the CAD's DMV feature is on: synced vehicles wait for DMV approval^0") end
    if Config.Character.phone == false then
      out("phone numbers: off (Config.Character.phone)")
    else
      local off, phones = {}, {}
      for _, id in ipairs(settings.disabledPhones or {}) do off[id] = true end
      for _, id in ipairs(Framework.phoneResources()) do
        phones[#phones + 1] = off[id] and (id .. " (off in CAD Settings > Phones)") or id
      end
      out("phone numbers from: %s", table.concat(phones, ", "))
    end

    if #online == 0 then
      out("no players with a character online")
      return
    end
    out("online players:")
    for index, playerId in ipairs(online) do
      local player = data.players and data.players[index] or {}
      local job, onDuty = Framework.getJob(playerId)
      local entry = job and Config.Jobs[job]
      print(("  [%s] %s: CAD account %s, citizen %s, %d officer(s), %d EMS-FD deputy(ies), job %s%s"):format(
        playerId,
        GetPlayerName(playerId) or "?",
        player.cadUser and ("^2" .. player.cadUser .. "^0") or "^3none^0 (not linked: Discord / Steam)",
        player.citizenId and "synced" or "not synced yet",
        player.officers or 0,
        player.emsFdDeputies or 0,
        job or "?",
        entry and (" -> %s, %s"):format(entry.unitType, onDuty and "on duty" or "off duty") or ""
      ))
    end
  end)
end, true)

RegisterCommand("snailyframework_sync", function(source, args)
  local target = args[1]
  local reply = function(message)
    if source == 0 then out(message) else TriggerClientEvent("chat:addMessage", source, { args = { "SnailyCAD", message } }) end
  end
  if not target then
    reply("usage: snailyframework_sync <player id | all>")
    return
  end
  local targets = {}
  if target == "all" then
    targets = Sync.onlinePlayers()
  elseif tonumber(target) and Framework.getPlayer(tonumber(target)) then
    targets = { tonumber(target) }
  else
    reply(("no player with a character loaded has id %s"):format(target))
    return
  end
  CreateThread(function()
    local done = 0
    for _, playerId in ipairs(targets) do
      local result, err = Sync.player(playerId)
      if result then done = done + 1 elseif err then reply(("%s: %s"):format(playerId, err)) end
      Sync.duty(playerId)
    end
    reply(("synced %d of %d player(s)"):format(done, #targets))
  end)
end, true)
