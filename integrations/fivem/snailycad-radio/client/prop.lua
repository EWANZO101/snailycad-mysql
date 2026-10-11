--[[
  The handheld in the character's hand and the talk animation while transmitting. In a
  vehicle or with a weapon out the character talks into a shoulder mic (animation only).
]]

Prop = {}

local handle = nil
local playing = false

local function loadAnim(dict)
  if HasAnimDictLoaded(dict) then return true end
  RequestAnimDict(dict)
  local timeout = GetGameTimer() + 2000
  while not HasAnimDictLoaded(dict) and GetGameTimer() < timeout do Wait(10) end
  return HasAnimDictLoaded(dict)
end

local function loadModel(model)
  local hash = type(model) == "number" and model or joaat(model)
  if not IsModelInCdimage(hash) then return nil end
  RequestModel(hash)
  local timeout = GetGameTimer() + 2000
  while not HasModelLoaded(hash) and GetGameTimer() < timeout do Wait(10) end
  return HasModelLoaded(hash) and hash or nil
end

local function removeProp()
  if handle and DoesEntityExist(handle) then
    DetachEntity(handle, true, false)
    DeleteEntity(handle)
  end
  handle = nil
end

local function holdingWeapon(ped)
  local _, weapon = GetCurrentPedWeapon(ped, true)
  return weapon ~= joaat("WEAPON_UNARMED")
end

function Prop.startTalking()
  if not Config.Prop.enabled or playing then return end
  local ped = PlayerPedId()
  if IsEntityDead(ped) or IsPedSwimming(ped) then return end
  playing = true

  local shoulderMic = (Config.Prop.shoulderMicInVehicle and IsPedInAnyVehicle(ped, false))
    or holdingWeapon(ped)

  if not shoulderMic then
    local model = loadModel(Config.Prop.model)
    if model then
      local coords = GetEntityCoords(ped)
      handle = CreateObject(model, coords.x, coords.y, coords.z, true, true, false)
      SetEntityCollision(handle, false, false)
      local offset, rotation = Config.Prop.offset, Config.Prop.rotation
      AttachEntityToEntity(handle, ped, GetPedBoneIndex(ped, Config.Prop.bone),
        offset.x, offset.y, offset.z, rotation.x, rotation.y, rotation.z,
        true, true, false, true, 1, true)
      SetModelAsNoLongerNeeded(model)
    end
  end

  if loadAnim(Config.Prop.animDict) then
    -- 49 = upper body only, loop, the player can still walk
    TaskPlayAnim(ped, Config.Prop.animDict, Config.Prop.anim, 8.0, -8.0, -1, 49, 0, false, false, false)
  end
end

function Prop.stopTalking()
  if not playing then return end
  playing = false
  StopAnimTask(PlayerPedId(), Config.Prop.animDict, Config.Prop.anim, -4.0)
  removeProp()
end

AddEventHandler("onResourceStop", function(resource)
  if resource == GetCurrentResourceName() then
    Prop.stopTalking()
  end
end)
