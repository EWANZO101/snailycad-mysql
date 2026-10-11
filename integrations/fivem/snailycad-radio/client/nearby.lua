--[[
  Positional audio: you hear the radios of players standing next to you, quieter the further
  away they are and from their side, unless they wear an earpiece. Each player's radio state
  (channel, earpiece) is shared through the "snailyRadio" state bag; the audio comes from the
  CAD's radio server (a listen-only join on that channel).
]]

if not Config.Nearby.enabled then return end

local lastSent = ""

--- -1 (left) .. 1 (right): where the other player is relative to where the camera looks
local function panTowards(from, to)
  local camera = GetGameplayCamRot(2)
  local heading = math.rad(camera.z)
  local dx, dy = to.x - from.x, to.y - from.y
  local angle = math.atan(dy, dx) - (heading + math.pi / 2)
  -- right of the camera = positive
  return math.max(-1.0, math.min(1.0, -math.sin(angle)))
end

local function volumeAt(distance)
  local range = Config.Nearby.range
  if distance >= range then return 0.0 end
  local falloff = (1.0 - distance / range) ^ 1.5
  return math.floor(Config.Nearby.volume * falloff * 100 + 0.5) / 100
end

CreateThread(function()
  while true do
    Wait(Config.Nearby.update)

    local radios = {}
    local me = PlayerPedId()
    local myCoords = GetEntityCoords(me)
    local myVehicle = GetVehiclePedIsIn(me, false)

    for _, player in ipairs(GetActivePlayers()) do
      if player ~= PlayerId() then
        local ped = GetPlayerPed(player)
        local state = Player(GetPlayerServerId(player)).state.snailyRadio
        if ped ~= 0 and state and state.on and state.channel and not state.earpiece
          and state.channel ~= Radio.channel then
          local coords = GetEntityCoords(ped)
          local distance = #(myCoords - coords)
          if Config.Nearby.inVehicles and myVehicle ~= 0 and GetVehiclePedIsIn(ped, false) == myVehicle then
            distance = math.min(distance, 1.0)
          end
          local volume = volumeAt(distance)
          if volume > 0 then
            radios[#radios + 1] = {
              channel = state.channel,
              volume = volume,
              pan = math.floor(panTowards(myCoords, coords) * 10 + 0.5) / 10,
            }
          end
        end
      end
    end

    -- only tell the NUI when something changed
    local encoded = json.encode(radios)
    if encoded ~= lastSent then
      lastSent = encoded
      SendNUIMessage({ action = "nearby", radios = radios })
    end
  end
end)
