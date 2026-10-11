--[[
  Runs the whole server side of the resource against a real CAD API, with a fake FiveM runtime
  and a fake ESX or QBCore. Needs curl, and a TEST CAD (it creates citizens, vehicles and changes
  unit statuses):

    SNAILY_URL=http://127.0.0.1:8080/v1 SNAILY_TOKEN=... SNAILY_DISCORD=<a CAD user's Discord id> \
      FRAMEWORK=esx lua tests/integration_test.lua
]]

local root = (arg and arg[0] and arg[0]:match("^(.*)tests/[^/]+$")) or "./"
local URL = assert(os.getenv("SNAILY_URL"), "set SNAILY_URL")
local TOKEN = assert(os.getenv("SNAILY_TOKEN"), "set SNAILY_TOKEN")
local DISCORD = os.getenv("SNAILY_DISCORD") or "111111111111111111"
local FRAMEWORK = os.getenv("FRAMEWORK") or "esx"

-- --- JSON ----------------------------------------------------------------------------------------

local function encode(value)
  local kind = type(value)
  if kind == "nil" then return "null" end
  if kind == "boolean" or kind == "number" then return tostring(value) end
  if kind == "string" then
    return '"' .. value:gsub('[%c"\\]', function(c)
      return ({ ['"'] = '\\"', ["\\"] = "\\\\", ["\n"] = "\\n" })[c] or ("\\u%04x"):format(c:byte())
    end) .. '"'
  end
  -- like FiveM: a table with only 1..n keys (or no keys) is an array
  local n = 0
  for _ in pairs(value) do n = n + 1 end
  if n == #value then
    local parts = {}
    for _, item in ipairs(value) do parts[#parts + 1] = encode(item) end
    return "[" .. table.concat(parts, ",") .. "]"
  end
  local parts = {}
  for k, v in pairs(value) do parts[#parts + 1] = encode(tostring(k)) .. ":" .. encode(v) end
  return "{" .. table.concat(parts, ",") .. "}"
end

local function decode(text)
  -- good enough for the CAD's answers: let a JS-like parser do it via Lua patterns is overkill;
  -- turn JSON into a Lua table constructor
  local lua = text:gsub('"([^"]-)"%s*:', '["%1"]='):gsub("%[", "{"):gsub("%]", "}")
  lua = lua:gsub('{"([^"]-)"}=', '["%1"]='):gsub("null", "nil")
  local fn = load("return " .. lua)
  return fn and fn() or nil
end

-- --- fake FiveM runtime --------------------------------------------------------------------------

local now = 0
local threads = {}
function CreateThread(fn)
  threads[#threads + 1] = { co = coroutine.create(fn), wake = now }
end
function Wait(ms)
  coroutine.yield(ms or 0)
end
function SetTimeout(ms, fn)
  CreateThread(function() Wait(ms) fn() end)
end
local function run(untilMs)
  while true do
    local nextThread
    for _, thread in ipairs(threads) do
      if coroutine.status(thread.co) ~= "dead" and (not nextThread or thread.wake < nextThread.wake) then
        nextThread = thread
      end
    end
    if not nextThread or nextThread.wake > untilMs then break end
    now = math.max(now, nextThread.wake)
    local ok, ms = coroutine.resume(nextThread.co)
    if not ok then error(ms) end
    nextThread.wake = now + (tonumber(ms) or 0)
  end
  now = untilMs
end

promise = {
  new = function()
    local p = {}
    function p:resolve(v) self.done = true self.value = v end
    return p
  end,
}
Citizen = {
  Await = function(p)
    while not p.done do Wait(10) end
    return p.value
  end,
}

local requests = {}
function PerformHttpRequest(url, cb, method, body, headers)
  local file = os.tmpname()
  local f = assert(io.open(file, "w"))
  f:write(body or "")
  f:close()
  local cmd = ("curl -s -X %s -H 'Content-Type: application/json' -H 'snaily-cad-api-token: %s' --data-binary @%s -w '\\n%%{http_code}' '%s'")
    :format(method or "GET", headers["snaily-cad-api-token"], file, url)
  local pipe = assert(io.popen(cmd))
  local out = pipe:read("a")
  pipe:close()
  os.remove(file)
  local response, status = out:match("^(.*)\n(%d+)$")
  requests[#requests + 1] = { url = url, body = body, status = tonumber(status), response = response }
  cb(tonumber(status) or 0, response)
end

json = { encode = encode, decode = decode }
local convars = {
  snailycad_framework_api_url = URL,
  snailycad_framework_api_token = TOKEN,
  sv_projectName = "^2Test ^7RP",
}
function GetConvar(name, default) return convars[name] or default end
local kvp = {}
function GetResourceKvpString(k) return kvp[k] end
function SetResourceKvp(k, v) kvp[k] = v end
function DeleteResourceKvp(k) kvp[k] = nil end
function GetCurrentResourceName() return "snailycad-framework" end
function GetResourceMetadata() return "1.0.0" end
function GetPlayers() return { "1" } end
function GetPlayerName(id) return "TestPlayer" .. tostring(id) end
function GetPlayerPing() return 40 end
function GetPlayerIdentifiers() return { "license:abc123", "discord:" .. DISCORD } end
function IsPlayerAceAllowed() return true end

local function joaat(input)
  local hash = 0
  for i = 1, #input do
    hash = (hash + input:lower():byte(i)) & 0xFFFFFFFF
    hash = (hash + (hash << 10)) & 0xFFFFFFFF
    hash = hash ~ (hash >> 6)
  end
  hash = (hash + (hash << 3)) & 0xFFFFFFFF
  hash = hash ~ (hash >> 11)
  hash = (hash + (hash << 15)) & 0xFFFFFFFF
  if hash > 0x7FFFFFFF then hash = hash - 0x100000000 end
  return hash
end
GetHashKey = joaat

local handlers, netHandlers, commands, exported = {}, {}, {}, {}
function AddEventHandler(name, fn)
  handlers[name] = handlers[name] or {}
  table.insert(handlers[name], fn)
end
function RegisterNetEvent(name, fn)
  if fn then netHandlers[name] = fn end
end
function RegisterCommand(name, fn) commands[name] = fn end
local function trigger(name, src, ...)
  for _, fn in ipairs(handlers[name] or {}) do
    source = src
    fn(...)
  end
end
-- the game: names model hashes like client/main.lua would
function TriggerClientEvent(name, target, requestId, hashes)
  if name == "snailycad-framework:resolveModels" then
    local names = {}
    for _, hash in ipairs(hashes) do names[tostring(hash)] = { model = "CUSTOMCAR", label = "Custom Car" } end
    source = target
    netHandlers["snailycad-framework:models"](requestId, names)
  end
end

local running = { oxmysql = true }
running[FRAMEWORK == "esx" and "es_extended" or "qb-core"] = true
function GetResourceState(name) return running[name] and "started" or "missing" end

local stamp = tostring(os.time())
local CHAR_ID = FRAMEWORK == "esx" and ("char1:itest" .. stamp) or ("IT" .. stamp:sub(-6))
local plate1, plate2 = "IT" .. stamp:sub(-5), "IU" .. stamp:sub(-5)
local oxmysql = {}
function oxmysql:query(sql, params, cb)
  if sql:find("INFORMATION_SCHEMA") then
    if params[1] == "owned_vehicles" then return cb({ { name = "type" }, { name = "job" } }) end
    if params[1] == "vehicles" then return cb({ { name = "model" } }) end
    if params[1] == "users" then return cb({ { name = "phone_number" } }) end
    return cb({})
  end
  if sql:find("FROM vehicles") then return cb({ { model = "sultan", name = "Sultan" } }) end
  if sql:find("phone_number") then return cb({ { phone_number = "555-0199" } }) end
  if sql:find("FROM owned_vehicles") then
    return cb({
      { plate = plate1, vehicle = encode({ model = joaat("sultan"), color1 = 27 }), type = "car" },
      { plate = plate2, vehicle = encode({ model = 777, color1 = 0 }), type = "car" },
      { plate = "POLICE1", vehicle = "{}", type = "car", job = "police" },
    })
  end
  if sql:find("FROM player_vehicles") then
    return cb({
      { plate = plate1, vehicle = "sultan", hash = tostring(joaat("sultan")), mods = encode({ color1 = 64 }) },
    })
  end
  cb({})
end

local job = { name = "police", onDuty = true, onduty = true }
local identity = { firstName = "Integration", lastName = "Tester" .. stamp:sub(-4), dateofbirth = "02/03/1995", sex = "f", height = 170 }
local xPlayer = {
  identifier = CHAR_ID,
  job = job,
  get = function(key) return identity[key] end,
}
local qbPlayer = {
  PlayerData = {
    source = 1,
    citizenid = CHAR_ID,
    charinfo = { firstname = identity.firstName, lastname = identity.lastName, birthdate = "1995-03-02", gender = 1, phone = "5550199" },
    job = job,
    metadata = {},
  },
}
local fakeEsx = { GetPlayerFromId = function(id) return tonumber(id) == 1 and xPlayer or nil end }
local fakeQb = {
  Functions = { GetPlayer = function(id) return tonumber(id) == 1 and qbPlayer or nil end },
  Shared = { Vehicles = { sultan = { name = "Sultan" } } },
}
exports = setmetatable({
  oxmysql = oxmysql,
  es_extended = { getSharedObject = function() return fakeEsx end },
  ["qb-core"] = { GetCoreObject = function() return fakeQb end },
}, {
  __call = function(_, name, fn) exported[name] = fn end,
})

-- --- load the resource ---------------------------------------------------------------------------

for _, file in ipairs({ "config.lua", "shared/colours.lua", "shared/mapping.lua", "server/settings.lua",
  "server/api.lua", "server/framework.lua", "server/main.lua", "server/commands.lua" }) do
  dofile(root .. file)
end
Config.Unlinked = "skip"
Config.Vehicles.createModels = true

local passed, failed = 0, 0
local function check(condition, label)
  if condition then passed = passed + 1 else failed = failed + 1 print("FAIL " .. label) end
end
local function last(path)
  for i = #requests, 1, -1 do
    if requests[i].url:find(path, 1, true) then return requests[i], decode(requests[i].response or "") end
  end
end
local function count(path)
  local n = 0
  for _, r in ipairs(requests) do if r.url:find(path, 1, true) then n = n + 1 end end
  return n
end

run(5000) -- start: detects the framework, syncs the player already online
check(Framework.name == FRAMEWORK, "framework detected")
local request, answer = last("/characters")
check(request and request.status == 200, "character sync answered 200")
print("start sync ->", request and request.response)
check(answer and (answer.result == "created" or answer.result == "linked"), "citizen created")
check(answer and answer.vehicles and #answer.vehicles.created >= 1, "vehicles registered")
local _, duty = last("/duty")
print("duty on load ->", duty and (duty.result .. " " .. tostring(duty.reason or "")))

-- rename in game -> same citizen updated
identity.lastName = identity.lastName .. "x"
qbPlayer.PlayerData.charinfo.lastname = identity.lastName
commands.snailyframework_sync(0, { "1" })
run(now + 3000)
local _, renamed = last("/characters")
check(renamed and renamed.result == "updated", "rename -> updated")
check(renamed and answer and renamed.citizenId == answer.citizenId, "rename -> same citizen")

-- off duty in game
local dutyRequests = count("/duty")
job.onDuty, job.onduty = false, false
trigger(FRAMEWORK == "esx" and "esx:setJob" or "QBCore:Server:SetDuty", 1, 1, job)
run(now + 2000)
local _, off = last("/duty")
check(count("/duty") > dutyRequests, "duty change sent")
check(off and (off.result == "offDuty" or off.result == "unchanged"), "off duty")
print("off duty ->", off and off.result)

-- on duty again
job.onDuty, job.onduty = true, true
trigger(FRAMEWORK == "esx" and "esx:setJob" or "QBCore:Server:SetDuty", 1, 1, job)
run(now + 2000)
local _, on = last("/duty")
check(on and on.result == "onDuty", "on duty")
print("on duty ->", on and on.result, on and on.units and on.units[1])

-- no change: the poll doesn't send anything
local before = count("/duty")
run(now + 60000)
check(count("/duty") == before, "no duty request without a change")

-- the check command
commands.snailyframework_check(0, {})
run(now + 2000)
local checkRequest = last("/check")
check(checkRequest and checkRequest.status == 200, "check answered 200")

-- leaving sets the unit off duty
trigger("playerDropped", 1, "quit")
run(now + 2000)
local _, left = last("/duty")
check(left and (left.result == "offDuty"), "off duty on leave")

print(("%d passed, %d failed (%d requests)"):format(passed, failed, #requests))
if failed > 0 then os.exit(1) end
