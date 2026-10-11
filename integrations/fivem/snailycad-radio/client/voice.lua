--[[
  Voice script adapters. The radio audio itself goes through SnailyCAD, next to your proximity
  voice script, so this only:
    - switches off the voice script's own radio (Config.DisableVoiceScriptRadio), so players
      don't have two radios and two push-to-talk keys;
    - optionally (Config.VoiceSync) moves the voice script's radio to the same channel number.
]]

Voice = { name = "none" }

local SCRIPTS = {
  ["pma-voice"] = "pma-voice",
  ["saltychat"] = "saltychat",
  ["tokovoip"] = "tokovoip_script",
  ["mumble-voip"] = "mumble-voip",
}

local function started(resource)
  return GetResourceState(resource) == "started"
end

local function detect()
  if Config.VoiceScript ~= "auto" then
    return Config.VoiceScript
  end
  for name, resource in pairs(SCRIPTS) do
    if started(resource) then return name end
  end
  return "none"
end

local function call(fn)
  local ok, err = pcall(fn)
  if not ok and Config.Debug then print(("[snailycad-radio] voice script call failed: %s"):format(err)) end
end

function Voice.init()
  Voice.name = detect()
  if Config.Debug then print(("[snailycad-radio] voice script: %s"):format(Voice.name)) end
  if Config.VoiceSync or not Config.DisableVoiceScriptRadio then return end

  if Voice.name == "pma-voice" then
    -- the ESX/QB pma-voice radio and its push-to-talk key go quiet; proximity voice stays
    call(function() exports["pma-voice"]:setVoiceProperty("radioEnabled", false) end)
  elseif Voice.name == "mumble-voip" then
    call(function() exports["mumble-voip"]:SetMumbleProperty("radioEnabled", false) end)
  elseif Voice.name == "tokovoip" then
    call(function() exports["tokovoip_script"]:removePlayerFromRadio() end)
  end
  -- SaltyChat has no radio until a script sets a channel, so there's nothing to switch off
end

--- channel number for the voice script: Config.VoiceSyncChannels[name], the frequency, or
--- the channel's position in the CAD list
local function channelNumber(channel, index)
  local mapped = Config.VoiceSyncChannels and Config.VoiceSyncChannels[channel.name]
  if mapped then return mapped end
  local frequency = tonumber(channel.frequency or "")
  if frequency then return frequency end
  return index
end

--- Config.VoiceSync: put the voice script's radio on the same channel as the CAD radio
function Voice.syncChannel(channel, index)
  if not Config.VoiceSync or Voice.name == "none" then return end

  if not channel then
    if Voice.name == "pma-voice" then
      call(function() exports["pma-voice"]:setRadioChannel(0) end)
    elseif Voice.name == "mumble-voip" then
      call(function() exports["mumble-voip"]:SetRadioChannel(0) end)
    elseif Voice.name == "tokovoip" then
      call(function() exports["tokovoip_script"]:removePlayerFromRadio() end)
    elseif Voice.name == "saltychat" then
      call(function() exports["saltychat"]:SetRadioChannel("", true) end)
    end
    return
  end

  local number = channelNumber(channel, index)
  if Voice.name == "pma-voice" then
    call(function() exports["pma-voice"]:setRadioChannel(number) end)
  elseif Voice.name == "mumble-voip" then
    call(function() exports["mumble-voip"]:SetRadioChannel(number) end)
  elseif Voice.name == "tokovoip" then
    call(function()
      exports["tokovoip_script"]:removePlayerFromRadio()
      exports["tokovoip_script"]:addPlayerToRadio(number)
    end)
  elseif Voice.name == "saltychat" then
    -- SaltyChat channels are names
    call(function() exports["saltychat"]:SetRadioChannel(tostring(channel.frequency or channel.name), true) end)
  end
end
