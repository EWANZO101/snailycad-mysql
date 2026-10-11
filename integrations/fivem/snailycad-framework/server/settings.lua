--[[
  Where the CAD is and the CAD API token, from (in this order):
    1. server.cfg: set snailycad_framework_api_url "..." / set snailycad_framework_api_token "..."
    2. saved settings: the console command snailyframework_setup <url> <token>
    3. snailycad-radio's server.cfg settings: set snailycad_radio_api_url / _api_token
  Read live: a `set` in the console applies without a restart. The token never leaves the server.
]]

Settings = {}

local function trimUrl(url)
  url = (url or ""):gsub("^%s+", ""):gsub("%s+$", ""):gsub("/+$", "")
  -- "https://cad-api.example.com" -> ".../v1"
  if url ~= "" and not url:match("/v1$") then url = url .. "/v1" end
  return url
end

--- url, token, where they came from ("server.cfg" | "saved" | "radio" | "none")
function Settings.get()
  local url = trimUrl(GetConvar("snailycad_framework_api_url", ""))
  local token = GetConvar("snailycad_framework_api_token", "")
  if url ~= "" and token ~= "" then
    return url, token, "server.cfg"
  end

  url = trimUrl(GetResourceKvpString("apiUrl"))
  token = GetResourceKvpString("apiToken") or ""
  if url ~= "" and token ~= "" then
    return url, token, "saved"
  end

  url = trimUrl(GetConvar("snailycad_radio_api_url", ""))
  token = GetConvar("snailycad_radio_api_token", "")
  if url ~= "" and token ~= "" then
    return url, token, "radio"
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

Settings.trimUrl = trimUrl
