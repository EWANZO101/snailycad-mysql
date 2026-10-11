--[[
  The only thing the game does for this resource: name vehicle models. ESX stores owned vehicles
  by model hash only, and the server can't turn a hash into a name; the game can.
]]

RegisterNetEvent("snailycad-framework:resolveModels", function(requestId, hashes)
  local names = {}
  if type(hashes) == "table" then
    for index, hash in ipairs(hashes) do
      if index > 64 then break end
      hash = tonumber(hash)
      if hash and IsModelInCdimage(hash) and IsModelAVehicle(hash) then
        local display = GetDisplayNameFromVehicleModel(hash)
        if display and display ~= "" and display ~= "CARNOTFOUND" then
          local label = GetLabelText(display)
          if not label or label == "NULL" or label == "" then label = display end
          names[tostring(hash)] = { model = display:lower(), label = label }
        end
      end
    end
  end
  TriggerServerEvent("snailycad-framework:models", requestId, names)
end)
