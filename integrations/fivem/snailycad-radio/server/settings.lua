--[[
  Where the CAD is and the CAD API token, from (in this order):
    1. server.cfg: set snailycad_radio_api_url "..." / set snailycad_radio_api_token "..."
    2. saved settings: the in-game setup (/radiosetup) or the console command snailyradio_setup
  Read live: a `set` in the console or a save in game applies without a restart.
  The token never leaves the server.
]]

Settings = {}

local function trimUrl(url)
  url = (url or ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub("/+$", "")
  -- "https://cad-api.example.com" -> ".../v1"
  if url ~= "" and not url:match("/v1$") then url = url .. "/v1" end
  return url
end

--- url, token, where they came from ("server.cfg" | "saved" | "none")
function Settings.get()
  local url = trimUrl(GetConvar("snailycad_radio_api_url", ""))
  local token = GetConvar("snailycad_radio_api_token", "")
  if url ~= "" and token ~= "" then
    return url, token, "server.cfg"
  end

  url = trimUrl(GetResourceKvpString("apiUrl"))
  token = GetResourceKvpString("apiToken") or ""
  if url ~= "" and token ~= "" then
    return url, token, "saved"
  end
  return "", "", "none"
end

function Settings.isConfigured()
  local _, _, source = Settings.get()
  return source ~= "none"
end

function Settings.save(url, token)
  SetResourceKvp("apiUrl", trimUrl(url))
  SetResourceKvp("apiToken", token)
end

function Settings.clear()
  DeleteResourceKvp("apiUrl")
  DeleteResourceKvp("apiToken")
end

--- safe to show: the address and the last 4 characters of the token
function Settings.describe()
  local url, token, source = Settings.get()
  return {
    url = url,
    tokenHint = token ~= "" and ("…" .. token:sub(-4)) or nil,
    source = source,
    overriddenByServerCfg = source == "server.cfg" and GetResourceKvpString("apiUrl") ~= nil,
  }
end

--[[
  Checks a CAD address and token: asks the CAD for a radio token (like a player would).
  cb({ ok, message, wsUrl, transport, channels })
]]
function Settings.check(url, token, cb)
  url = trimUrl(url)
  if url == "" or (token or "") == "" then
    return cb({ ok = false, message = "Enter the CAD API address and the CAD API token." })
  end
  if not url:match("^https?://") then
    return cb({ ok = false, message = "The address must start with http:// or https://" })
  end

  PerformHttpRequest(url .. "/radio/external/token", function(status, response)
    if status == 200 then
      local ok, data = pcall(json.decode, response or "")
      if ok and type(data) == "table" and data.token then
        return cb({
          ok = true,
          message = ("Connected: %d channel(s)."):format(#(data.channels or {})),
          wsUrl = data.wsUrl,
          transport = data.transport,
          channels = data.channels or {},
        })
      end
      return cb({ ok = false, message = "That address answered, but it isn't a SnailyCAD API with the radio." })
    elseif status == 401 then
      return cb({ ok = false, message = "Wrong token, or the API token is turned off in the CAD (CAD Settings > API Token)." })
    elseif status == 400 then
      return cb({ ok = false, message = "The CAD refused: turn on the Radio in CAD Settings > Features." })
    elseif status == 404 then
      return cb({ ok = false, message = "Not found: use the CAD API address (it ends with /v1) and a CAD with the radio update." })
    end
    cb({ ok = false, message = ("Could not reach the CAD (HTTP %s). Check the address and that the server can reach it."):format(status) })
  end, "POST", json.encode({ name = "radio setup check", identity = "fivem:setup-check", kind = "game" }), {
    ["Content-Type"] = "application/json",
    ["snaily-cad-api-token"] = token,
  })
end
