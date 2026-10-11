--[[
  Requests to the CAD API (/v1/integrations/fivem/...). The CAD API token goes in the
  snaily-cad-api-token header and never leaves the server.
]]

Api = {}

local VERSION = GetResourceMetadata(GetCurrentResourceName(), "version", 0) or "1.0.0"
Api.version = VERSION

function Api.serverName()
  if Config.ServerName then return Config.ServerName end
  local name = GetConvar("sv_projectName", "")
  if name == "" then name = GetConvar("sv_hostname", "") end
  -- strip FiveM colour codes (^1 ...)
  name = name:gsub("%^%d", "")
  return name ~= "" and name:sub(1, 255) or nil
end

--- { discordId, steamId } for the CAD, or nil without either (an empty Lua table would be sent
--- as a JSON array)
function Api.identifiers(identifiers)
  if not identifiers or (not identifiers.discordId and not identifiers.steamId) then return nil end
  return { discordId = identifiers.discordId, steamId = identifiers.steamId }
end

--- explains an HTTP status for the console
function Api.describeError(status, body)
  if status == 401 then
    return "wrong CAD API token, or the API token is turned off in the CAD (CAD Settings > API Token)"
  elseif status == 404 then
    return "not found: use the CAD API address (ends with /v1) of a CAD with the FiveM framework update"
  elseif status == 429 then
    return "the CAD is rate limiting this server (too many requests or wrong tokens), wait a few minutes"
  elseif status == 400 then
    return ("the CAD refused the data: %s"):format(body or "")
  elseif status == 0 or not status then
    return "could not reach the CAD: check the address and that this server can reach it"
  end
  return ("HTTP %s %s"):format(status, body or "")
end

--- POST to the CAD; cb(data | nil, status, rawBody). url / token default to the saved settings.
function Api.post(path, body, cb, url, token)
  if not url then
    url, token = Settings.get()
  end
  if url == "" or (token or "") == "" then
    return cb(nil, -1, "not set up")
  end

  PerformHttpRequest(url .. "/integrations/fivem" .. path, function(status, response)
    local data
    if response and response ~= "" then
      local ok, decoded = pcall(json.decode, response)
      if ok then data = decoded end
    end
    if status ~= 200 then
      return cb(nil, status, response)
    end
    cb(data, status, response)
  end, "POST", json.encode(body or {}), {
    ["Content-Type"] = "application/json",
    ["snaily-cad-api-token"] = token,
  })
end

--- the same, waiting for the answer (call from a thread / handler)
function Api.await(path, body, url, token)
  local p = promise.new()
  Api.post(path, body, function(data, status, raw)
    p:resolve({ data = data, status = status, raw = raw })
  end, url, token)
  local result = Citizen.Await(p)
  return result.data, result.status, result.raw
end
