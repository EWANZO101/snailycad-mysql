--[[
  The player's radio: key bindings, the handheld UI (NUI), and the radio state other players
  see (for positional audio). The audio runs in the NUI, connected to the CAD's radio server.
]]

Radio = {
  hasRadio = false,   -- a radio of their own (job / ACE); without one they can only overhear
  initialized = false,
  powered = true,
  open = false,
  channel = nil,      -- channel id
  channelName = nil,
  channels = {},
  earpiece = Config.Earpiece.default == true,
  talking = false,    -- transmitting right now
  pttHeld = false,
}

local nuiLoaded = false
local tokenRequested = false

local function notify(text)
  BeginTextCommandThefeedPost("STRING")
  AddTextComponentSubstringPlayerName(text)
  EndTextCommandThefeedPostTicker(false, false)
end

local function syncState()
  LocalPlayer.state:set("snailyRadio", {
    on = Radio.hasRadio and Radio.powered and Radio.channel ~= nil,
    channel = Radio.channel,
    earpiece = Radio.earpiece,
    talking = Radio.talking,
  }, true)
end

local function requestToken()
  tokenRequested = true
  TriggerServerEvent("snailycad-radio:requestToken")
end

-- --- token from the server -------------------------------------------------------------------

RegisterNetEvent("snailycad-radio:token", function(response, err)
  if not response then
    if err == "not_configured" then
      print("[snailycad-radio] " .. _L("not_configured"))
      -- admins get the setup form by itself
      if Config.SetupPopup and not Radio.setupOffered then
        Radio.setupOffered = true
        TriggerServerEvent("snailycad-radio:setup:open", true)
      end
    elseif Config.Debug then
      print(("[snailycad-radio] no radio token: %s"):format(err))
    end
    Radio.hasRadio = false
    if Radio.initialized then
      SendNUIMessage({ action = "token", token = nil, error = err })
      SendNUIMessage({ action = "power", on = false })
    end
    syncState()
    return
  end

  local hadRadio = Radio.hasRadio
  Radio.hasRadio = response.hasRadio == true

  if not Radio.initialized then
    Radio.initialized = true
    SendNUIMessage({
      action = "init",
      token = response,
      settings = {
        volume = GetResourceKvpFloat("volume") > 0 and GetResourceKvpFloat("volume") or Config.Audio.volume,
        earpiece = Radio.earpiece,
        radioEffect = Config.Audio.radioEffect,
        tones = Config.Audio.tones,
        channel = GetResourceKvpString("channel"),
        hud = Config.Hud and Radio.hasRadio,
        locale = UiLocale(),
      },
    })
    if not Radio.hasRadio then
      SendNUIMessage({ action = "power", on = false })
    end
  else
    SendNUIMessage({ action = "token", token = response })
    if Radio.hasRadio ~= hadRadio then
      -- got or lost a radio (job change): reconnect with the new access
      Radio.initialized = false
      requestToken()
    end
  end
  syncState()
end)

RegisterNetEvent("snailycad-radio:refresh", function()
  requestToken()
end)

-- --- NUI callbacks ------------------------------------------------------------------------------

local function reply(cb) cb({ ok = true }) end

RegisterNUICallback("loaded", function(_, cb)
  nuiLoaded = true
  if not tokenRequested then requestToken() end
  reply(cb)
end)

RegisterNUICallback("requestToken", function(_, cb)
  requestToken()
  reply(cb)
end)

RegisterNUICallback("ready", function(data, cb)
  Radio.channels = data.channels or {}
  reply(cb)
end)

RegisterNUICallback("channels", function(data, cb)
  Radio.channels = data.channels or {}
  reply(cb)
end)

local function channelIndex(id)
  for index, channel in ipairs(Radio.channels) do
    if channel.id == id then return index, channel end
  end
  return nil, nil
end

RegisterNUICallback("channel", function(data, cb)
  local previous = Radio.channel
  Radio.channel = data.channel
  Radio.channelName = data.name
  if data.channel then SetResourceKvp("channel", data.channel) end
  syncState()
  local index, channel = channelIndex(data.channel)
  Voice.syncChannel(channel, index)
  if previous ~= data.channel then
    TriggerEvent("snailycad-radio:channelChanged", data.channel, data.name)
  end
  reply(cb)
end)

RegisterNUICallback("switched", function(data, cb)
  if data.name then notify(_L("switched", data.name)) end
  reply(cb)
end)

RegisterNUICallback("transmit", function(data, cb)
  Radio.talking = data.on == true
  if Radio.talking then Prop.startTalking() else Prop.stopTalking() end
  syncState()
  TriggerEvent("snailycad-radio:talking", Radio.talking, Radio.channel)
  reply(cb)
end)

RegisterNUICallback("talk", function(data, cb)
  TriggerEvent("snailycad-radio:received", data.name, data.on == true, Radio.channel)
  reply(cb)
end)

RegisterNUICallback("busy", function(_, cb)
  notify(_L("busy"))
  reply(cb)
end)

RegisterNUICallback("error", function(data, cb)
  if Config.Debug then print(("[snailycad-radio] %s"):format(data.message)) end
  reply(cb)
end)

RegisterNUICallback("power", function(data, cb)
  Radio.powered = data.on == true
  syncState()
  reply(cb)
end)

RegisterNUICallback("earpiece", function(data, cb)
  Radio.earpiece = data.on == true
  syncState()
  reply(cb)
end)

RegisterNUICallback("volume", function(data, cb)
  SetResourceKvpFloat("volume", tonumber(data.volume) or Config.Audio.volume)
  reply(cb)
end)

RegisterNUICallback("close", function(_, cb)
  Radio.open = false
  SetNuiFocus(false, false)
  reply(cb)
end)

-- --- actions --------------------------------------------------------------------------------------

local function canUseRadio()
  if not Radio.hasRadio or not Radio.powered then return false end
  local ped = PlayerPedId()
  if Config.Restrictions.dead and (IsEntityDead(ped) or IsPedDeadOrDying(ped, true)) then return false end
  if Config.Restrictions.underwater and IsPedSwimmingUnderWater(ped) then return false end
  if Config.Restrictions.cuffed then
    local state = LocalPlayer.state
    if state.isCuffed or state.handcuffed or state.cuffed or IsPedCuffed(ped) then return false end
  end
  return true
end

local function pttDown()
  if Radio.pttHeld then return end
  if not Radio.hasRadio then return end
  if not canUseRadio() then
    notify(_L("cannot_use"))
    return
  end
  Radio.pttHeld = true
  SendNUIMessage({ action = "ptt", on = true })
end

local function pttUp()
  if not Radio.pttHeld then return end
  Radio.pttHeld = false
  SendNUIMessage({ action = "ptt", on = false })
end

local function openRadio()
  if not Radio.hasRadio then
    notify(_L("no_radio"))
    return
  end
  Radio.open = true
  SendNUIMessage({ action = "open" })
  -- keep walking / driving while the handheld is up
  SetNuiFocus(true, true)
  SetNuiFocusKeepInput(true)
end

local function setEarpiece(on)
  Radio.earpiece = on
  SendNUIMessage({ action = "earpiece", on = on })
  notify(on and _L("earpiece_on") or _L("earpiece_off"))
  syncState()
end

--- finds a channel by id, name, frequency or position number
local function findChannel(value)
  value = tostring(value or ""):lower()
  for index, channel in ipairs(Radio.channels) do
    if channel.id == value
      or (channel.name or ""):lower() == value
      or (channel.frequency or ""):lower() == value
      or tostring(index) == value then
      return channel
    end
  end
  return nil
end

local function setChannel(value)
  local channel = findChannel(value)
  if not channel then
    notify(_L("channel_unknown", tostring(value)))
    return false
  end
  SendNUIMessage({ action = "setChannel", channel = channel.id })
  notify(_L("channel_set", channel.name))
  return true
end

-- --- key bindings & commands ----------------------------------------------------------------------

RegisterCommand("+snailyradio_ptt", pttDown, false)
RegisterCommand("-snailyradio_ptt", pttUp, false)
RegisterKeyMapping("+snailyradio_ptt", _L("ptt"), "keyboard", Config.Keys.pushToTalk)

RegisterCommand(Config.Commands.radio, openRadio, false)
RegisterCommand("snailyradio_open", openRadio, false)
RegisterKeyMapping("snailyradio_open", _L("open"), "keyboard", Config.Keys.openRadio)

RegisterCommand("snailyradio_up", function()
  if Radio.hasRadio then SendNUIMessage({ action = "stepChannel", direction = 1 }) end
end, false)
RegisterKeyMapping("snailyradio_up", _L("channel_up"), "keyboard", Config.Keys.channelUp)
RegisterCommand("snailyradio_down", function()
  if Radio.hasRadio then SendNUIMessage({ action = "stepChannel", direction = -1 }) end
end, false)
RegisterKeyMapping("snailyradio_down", _L("channel_down"), "keyboard", Config.Keys.channelDown)

RegisterCommand(Config.Commands.earpiece, function()
  setEarpiece(not Radio.earpiece)
end, false)
RegisterCommand("snailyradio_earpiece", function()
  setEarpiece(not Radio.earpiece)
end, false)
RegisterKeyMapping("snailyradio_earpiece", _L("earpiece"), "keyboard", Config.Keys.earpiece)

RegisterCommand(Config.Commands.channel, function(_, args)
  if not Radio.hasRadio then return notify(_L("no_radio")) end
  setChannel(table.concat(args, " "))
end, false)

-- from the server (exports / dispatch tools)
RegisterNetEvent("snailycad-radio:setChannel", function(value) setChannel(value) end)
RegisterNetEvent("snailycad-radio:power", function(on)
  SendNUIMessage({ action = "power", on = on })
end)
RegisterNetEvent("snailycad-radio:tone", function(tone)
  SendNUIMessage({ action = "tone", tone = tone })
end)

-- release the talk button when the player dies / gets cuffed while talking
CreateThread(function()
  while true do
    Wait(250)
    if Radio.pttHeld and not canUseRadio() then pttUp() end
  end
end)

-- job changes on the client: ask for a token with the new access
RegisterNetEvent("esx:setJob", requestToken)
RegisterNetEvent("QBCore:Client:OnJobUpdate", requestToken)
RegisterNetEvent("QBCore:Client:SetDuty", requestToken)
RegisterNetEvent("esx:playerLoaded", requestToken)
RegisterNetEvent("QBCore:Client:OnPlayerLoaded", requestToken)

CreateThread(function()
  Voice.init()
  syncState()
  -- the NUI asks for the first token when it has loaded; this covers a slow NUI
  Wait(5000)
  if not tokenRequested and nuiLoaded then requestToken() end
end)

AddEventHandler("onResourceStop", function(resource)
  if resource ~= GetCurrentResourceName() then return end
  LocalPlayer.state:set("snailyRadio", nil, true)
  if Radio.open then SetNuiFocus(false, false) end
end)

-- --- exports for other resources --------------------------------------------------------------------

exports("HasRadio", function() return Radio.hasRadio end)
exports("IsRadioOn", function() return Radio.hasRadio and Radio.powered end)
exports("IsTalking", function() return Radio.talking end)
exports("GetChannel", function() return Radio.channel, Radio.channelName end)
exports("GetChannels", function() return Radio.channels end)
exports("SetChannel", setChannel)
exports("HasEarpiece", function() return Radio.earpiece end)
exports("SetEarpiece", setEarpiece)
exports("SetPower", function(on) SendNUIMessage({ action = "power", on = on == true }) end)
exports("OpenRadio", openRadio)
exports("StartTalking", pttDown)
exports("StopTalking", pttUp)

-- --- setup (admins): /radiosetup, Config.Keys.setup, or by itself while the radio isn't set up ---

local function openSetup()
  TriggerServerEvent("snailycad-radio:setup:open", false)
end

RegisterCommand(Config.Commands.setup, openSetup, false)
RegisterCommand("snailyradio_setup_open", openSetup, false)
RegisterKeyMapping("snailyradio_setup_open", _L("setup"), "keyboard", Config.Keys.setup)

RegisterNetEvent("snailycad-radio:setup:status", function(status)
  SendNUIMessage({ action = "setup", status = status })
  SetNuiFocus(true, true)
  SetNuiFocusKeepInput(false)
end)

RegisterNetEvent("snailycad-radio:setup:denied", function()
  notify(_L("setup_denied"))
end)

RegisterNetEvent("snailycad-radio:setup:result", function(kind, result)
  SendNUIMessage({ action = "setupResult", kind = kind, result = result })
end)

RegisterNUICallback("setupTest", function(data, cb)
  TriggerServerEvent("snailycad-radio:setup:test", { url = data.url, token = data.token })
  cb({ ok = true })
end)

RegisterNUICallback("setupSave", function(data, cb)
  TriggerServerEvent("snailycad-radio:setup:save", { url = data.url, token = data.token })
  cb({ ok = true })
end)

RegisterNUICallback("setupClose", function(_, cb)
  SetNuiFocus(false, false)
  cb({ ok = true })
end)
