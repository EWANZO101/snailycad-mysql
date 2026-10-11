Config = {}

--[[
  CAD connection. Set these in server.cfg rather than here, so the token never ends up in a
  shared file:

    set snailycad_radio_api_url "https://cad-api.example.com/v1"
    set snailycad_radio_api_token "your CAD API token (CAD Settings > API Token)"
]]
Config.ApiUrl = GetConvar("snailycad_radio_api_url", "")
Config.ApiToken = GetConvar("snailycad_radio_api_token", "")

--[[
  Who gets a radio.
    "job"      : players whose (ESX / QBCore / Qbox) job is listed in Config.Jobs
    "ace"      : players with the ACE permission Config.AcePermission
    "job_or_ace": either of the two
    "everyone" : every player
]]
Config.Access = "job_or_ace"
Config.AcePermission = "snailycad.radio"

--[[
  Jobs that get a radio, and which CAD departments (names or ids, from Admin > Values >
  Departments) that job counts as. Department-restricted channels in the CAD use these.
  Players linked to a CAD account (Discord / Steam) also get their CAD units' departments.
]]
Config.Jobs = {
  police = { departments = { "LSPD", "BCSO", "SASP" } },
  sheriff = { departments = { "BCSO" } },
  ambulance = { departments = { "EMS", "LSFD" } },
  fire = { departments = { "LSFD" } },
}
-- also give off-duty players with these jobs a radio
Config.AllowOffDuty = false

-- the name others see on the radio; return nil for the default ("Firstname Lastname")
Config.DisplayName = function(source, defaultName)
  return defaultName
end

-- default key bindings; every player can change them in Settings > Key Bindings > FiveM
Config.Keys = {
  pushToTalk = "CAPITAL", -- Caps Lock
  openRadio = "",         -- no default; use /radio
  channelUp = "",
  channelDown = "",
  earpiece = "",
}
Config.Commands = {
  radio = "radio",
  earpiece = "earpiece",
  channel = "radiochannel", -- /radiochannel <name or number>
}

-- the handheld in hand while talking
Config.Prop = {
  enabled = true,
  model = "prop_cs_hand_radio",
  bone = 28422, -- right hand
  offset = vector3(0.0, 0.0, 0.0),
  rotation = vector3(0.0, 0.0, 0.0),
  -- animation while transmitting
  animDict = "random@arrests",
  anim = "generic_radio_chatter",
  -- holding a weapon / in a vehicle: talk without the handheld (shoulder mic)
  shoulderMicInVehicle = true,
}

-- hear other players' radios when standing next to them (unless they wear an earpiece)
Config.Nearby = {
  enabled = true,
  range = 6.0,        -- metres
  volume = 0.7,       -- loudest volume of an overheard radio (0-1)
  update = 300,       -- ms between checks
  inVehicles = true,  -- radios of players in the same vehicle are heard too
}

Config.Earpiece = {
  default = false,    -- players start without an earpiece
}

-- radio effect, chirps on talk permit / end, volume
Config.Audio = {
  radioEffect = true,
  tones = true,
  volume = 0.8,
}

-- small display with the channel and who is talking
Config.Hud = true

-- players can't use the radio while dead, cuffed or swimming (needs a framework / state bags)
Config.Restrictions = {
  dead = true,
  cuffed = true,
  underwater = true,
}

--[[
  Voice script. The radio audio goes through SnailyCAD, next to your proximity voice script,
  so it works with any of them. This setting only decides what to switch off so players don't
  end up with two radios:
    "auto"       : detect pma-voice, saltychat, tokovoip_script or mumble-voip
    "pma-voice" | "saltychat" | "tokovoip" | "mumble-voip" | "none"

  Config.VoiceSync = true keeps the voice script's own radio and moves it to the same channel
  as the CAD radio (channel number = the channel's position in the CAD, or its frequency):
  use that if you want to keep your voice script's radio audio. Browser dispatchers only hear
  players through the SnailyCAD radio.
]]
Config.VoiceScript = "auto"
Config.DisableVoiceScriptRadio = true
Config.VoiceSync = false
-- with VoiceSync: the voice script's channel number for a CAD channel name (optional)
Config.VoiceSyncChannels = {
  -- ["Dispatch 1"] = 1,
}

-- language of the in-game messages (shared/locale.lua)
Config.Locale = "en"

Config.Debug = false
