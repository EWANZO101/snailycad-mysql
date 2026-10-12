--[[
  Tests for the data mapping and the framework adapters, with fake ESX / QBCore / Qbox objects and
  a fake oxmysql. Plain Lua 5.4, no FiveM needed:

    lua tests/mapping_test.lua        (from the resource folder)
]]

local root = (arg and arg[0] and arg[0]:match("^(.*)tests/[^/]+$")) or "./"

local passed, failed = 0, 0
local function eq(actual, expected, label)
  if actual == expected then
    passed = passed + 1
  else
    failed = failed + 1
    print(("FAIL %s: expected %s, got %s"):format(label, tostring(expected), tostring(actual)))
  end
end

-- --- a tiny JSON decoder (FiveM has json.decode) ---------------------------------------------------

local function decodeJson(text)
  local pos = 1
  local function ws() pos = text:find("[^%s]", pos) or #text + 1 end
  local value
  local function str()
    local out = {}
    pos = pos + 1
    while true do
      local c = text:sub(pos, pos)
      if c == '"' then pos = pos + 1 break end
      if c == "\\" then pos = pos + 1 c = text:sub(pos, pos) end
      out[#out + 1] = c
      pos = pos + 1
    end
    return table.concat(out)
  end
  function value()
    ws()
    local c = text:sub(pos, pos)
    if c == "{" then
      local t = {}
      pos = pos + 1
      ws()
      if text:sub(pos, pos) == "}" then pos = pos + 1 return t end
      while true do
        ws()
        local k = str()
        ws()
        pos = pos + 1 -- :
        t[k] = value()
        ws()
        local d = text:sub(pos, pos)
        pos = pos + 1
        if d == "}" then return t end
      end
    elseif c == "[" then
      local t = {}
      pos = pos + 1
      ws()
      if text:sub(pos, pos) == "]" then pos = pos + 1 return t end
      while true do
        t[#t + 1] = value()
        ws()
        local d = text:sub(pos, pos)
        pos = pos + 1
        if d == "]" then return t end
      end
    elseif c == '"' then
      return str()
    elseif text:sub(pos, pos + 3) == "true" then
      pos = pos + 4 return true
    elseif text:sub(pos, pos + 4) == "false" then
      pos = pos + 5 return false
    elseif text:sub(pos, pos + 3) == "null" then
      pos = pos + 4 return nil
    end
    local number = text:match("^-?%d+%.?%d*[eE]?[-+]?%d*", pos)
    pos = pos + #number
    return math.tointeger(tonumber(number)) or tonumber(number)
  end
  return value()
end

-- --- fake FiveM ----------------------------------------------------------------------------------

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

json = { decode = decodeJson, encode = function() return "{}" end }
GetHashKey = joaat
Wait = function() end
promise = {
  new = function()
    local p = {}
    function p:resolve(v) self.value = v end
    return p
  end,
}
Citizen = { Await = function(p) return p.value end }
GetPlayerIdentifiers = function()
  return { "license:abc123", "discord:111111111111111111", "steam:110000100000000", "ip:127.0.0.1" }
end

local running = {}
GetResourceState = function(name) return running[name] and "started" or "missing" end

local tables = {}
local fakeOxmysql = {}
function fakeOxmysql:query(sql, params, cb)
  if sql:find("INFORMATION_SCHEMA") then
    local cols = {}
    for name in pairs(tables[params[1]] and tables[params[1]].columns or {}) do cols[#cols + 1] = { name = name } end
    return cb(cols)
  end
  if sql:find("FROM owned_vehicles") then
    local rows = {}
    for _, row in ipairs(tables.owned_vehicles.rows) do
      if row.owner == params[1] then rows[#rows + 1] = row end
    end
    return cb(rows)
  end
  if sql:find("FROM player_vehicles") then
    local rows = {}
    for _, row in ipairs(tables.player_vehicles.rows) do
      if row.citizenid == params[1] then rows[#rows + 1] = row end
    end
    return cb(rows)
  end
  if sql:find("FROM vehicles") then return cb(tables.vehicles.rows) end
  if sql:find("phone_number FROM users") then return cb({ { phone_number = "555-1234" } }) end
  cb({})
end

local players = {}
local fakeEsx = { GetPlayerFromId = function(source) return players[source] end }
local fakeQb = {
  Functions = { GetPlayer = function(source) return players[source] end },
  Shared = { Vehicles = { sultan = { name = "Sultan", brand = "Karin" }, adder = { name = "Adder" } } },
}

exports = setmetatable({
  oxmysql = fakeOxmysql,
  es_extended = { getSharedObject = function() return fakeEsx end },
  ["qb-core"] = { GetCoreObject = function() return fakeQb end },
  qbx_core = {
    GetPlayer = function(_, source) return players[source] end,
    GetVehiclesByName = function() return fakeQb.Shared.Vehicles end,
  },
}, { __call = function() end })

-- --- load the resource ---------------------------------------------------------------------------

dofile(root .. "config.lua")
dofile(root .. "shared/colours.lua")
dofile(root .. "shared/mapping.lua")
dofile(root .. "server/framework.lua")

-- --- Mapping -------------------------------------------------------------------------------------

eq(Mapping.parseDate("17/01/1998", "DD/MM/YYYY"), "1998-01-17", "ESX DD/MM/YYYY")
eq(Mapping.parseDate("01/02/1998", "DD/MM/YYYY"), "1998-02-01", "ESX day first")
eq(Mapping.parseDate("01/02/1998", "MM/DD/YYYY"), "1998-01-02", "ESX month first")
eq(Mapping.parseDate("12/31/1998", "DD/MM/YYYY"), "1998-12-31", "second part > 12 is the day")
eq(Mapping.parseDate("1998/01/17", "YYYY/MM/DD"), "1998-01-17", "ESX year first")
eq(Mapping.parseDate("1990-05-20"), "1990-05-20", "QBCore ISO")
eq(Mapping.parseDate("20.05.1990"), "1990-05-20", "dots")
eq(Mapping.parseDate("00-00-0000"), nil, "Qbox placeholder")
eq(Mapping.parseDate("31/02/1990"), nil, "31 February")
eq(Mapping.parseDate("29/02/2000"), "2000-02-29", "leap day")
eq(Mapping.parseDate("29/02/1900"), nil, "1900 isn't a leap year")
eq(Mapping.parseDate(""), nil, "empty")
eq(Mapping.parseDate(nil), nil, "nil")
eq(Mapping.parseDate(643161600000), "1990-05-20", "timestamp ms")
eq(Mapping.parseDate(643161600), "1990-05-20", "timestamp s")

eq(Mapping.gender("m"), "Male", "ESX m")
eq(Mapping.gender("F"), "Female", "ESX F")
eq(Mapping.gender(0), "Male", "QB 0")
eq(Mapping.gender(1), "Female", "QB 1")
eq(Mapping.gender("1"), "Female", "QB '1'")
eq(Mapping.gender("m", { male = "Man" }), "Man", "custom gender name")
eq(Mapping.gender("nonbinary", { nonbinary = "Non-binary" }), "Non-binary", "custom gender key")
eq(Mapping.gender(nil), nil, "no gender")

eq(Mapping.height(180), "180", "height")
eq(Mapping.height("175.6"), "176", "height rounds")
eq(Mapping.height(0), nil, "no height")

eq(Mapping.colour(0), "Metallic Black", "colour 0")
eq(Mapping.colour(1), "Metallic Graphite Black", "colour 1")
eq(Mapping.colour(27), "Metallic Red", "colour 27")
eq(Mapping.colour(111), "Metallic White", "colour 111")
eq(Mapping.colour(159), "Brushed Gold", "colour 159")
eq(Mapping.colour({ 255, 0, 16 }), "Custom #FF0010", "custom colour")
eq(Mapping.colour(5, { 1, 2, 3 }), "Custom #010203", "custom primary wins")
eq(Mapping.colour(nil), nil, "no colour")

eq(Mapping.plate("  ab 123  "), "AB 123", "plate trim + caps")
eq(Mapping.signedHash(3078201489), -1216765807, "unsigned hash")
eq(Mapping.signedHash(-1216765807), -1216765807, "signed hash")
eq(Mapping.steamDecimal("110000100000000"), "76561197960265728", "steam hex")
eq(joaat("adder"), -1216765807, "joaat(adder)")

local id, character = Mapping.esxCharacter({
  identifier = "char1:abc", firstName = " Pierre ", lastName = "Jordaan", dateOfBirth = "17/01/1998",
  sex = "m", height = 120, phoneNumber = 5551234,
}, { dateFormat = "DD/MM/YYYY", genders = Config.Character.genders })
eq(id, "char1:abc", "esx id")
eq(character.firstName, "Pierre", "esx first name trimmed")
eq(character.dateOfBirth, "1998-01-17", "esx dob")
eq(character.gender, "Male", "esx gender")
eq(character.height, "120", "esx height")
eq(character.phoneNumber, "5551234", "esx phone number")
eq(Mapping.esxCharacter({ identifier = "char1:new" }), nil, "esx character without identity")
local _, noPhone = Mapping.esxCharacter({ identifier = "x", firstName = "A", lastName = "B", phoneNumber = "1" }, { phone = false, height = false })
eq(noPhone.phoneNumber, nil, "phone off")

local qid, qchar = Mapping.qbCharacter({
  citizenid = "ABC12345",
  charinfo = { firstname = "John", lastname = "Doe", birthdate = "1990-05-20", gender = 1, phone = "5559876" },
})
eq(qid, "ABC12345", "qb id")
eq(qchar.dateOfBirth, "1990-05-20", "qb dob")
eq(qchar.gender, "Female", "qb gender")
eq(qchar.phoneNumber, "5559876", "qb phone")
eq(qchar.height, nil, "qb no height")
eq(Mapping.qbCharacter({ citizenid = "X", charinfo = {} }), nil, "qb without names")

local skipped, reason = Mapping.esxVehicle({ plate = "POL 1", job = "police" }, {}, {}, {})
eq(skipped, nil, "esx job vehicle skipped")
eq(reason, "jobVehicle", "esx job vehicle reason")
local boat, boatReason = Mapping.esxVehicle({ plate = "B1", type = "boat" }, {}, {}, { types = { "car" } })
eq(boat, nil, "esx type filter")
eq(boatReason, "type", "esx type filter reason")

-- --- ESX adapter ---------------------------------------------------------------------------------

running = { es_extended = true, oxmysql = true }
tables = {
  users = { columns = { identifier = true, phone_number = true } },
  owned_vehicles = {
    columns = { owner = true, plate = true, vehicle = true, type = true, job = true },
    rows = {
      { owner = "char1:abc", plate = "AB 123  ", vehicle = '{"model":-1216765807,"plate":"AB 123","color1":27}', type = "car" },
      { owner = "char1:abc", plate = "XY 999", vehicle = '{"model":3078201489,"color1":0,"customPrimaryColor":[10,20,30]}', type = "car" },
      { owner = "char1:abc", plate = "UNK 1", vehicle = '{"model":12345,"color1":4}', type = "car" },
      { owner = "char1:abc", plate = "POL 1", vehicle = '{"model":1}', type = "car", job = "police" },
      { owner = "char2:other", plate = "OTHER", vehicle = "{}", type = "car" },
    },
  },
  vehicles = { columns = { model = true, name = true }, rows = { { model = "adder", name = "Adder" }, { model = "sultan", name = "Sultan" } } },
}
eq(Framework.init(), "esx", "detects ESX")

players[1] = {
  identifier = "char1:abc",
  job = { name = "police", onDuty = true },
}
-- ESX: xPlayer.get(key) is a closure, called with a dot
players[1].get = function(key)
  return ({ firstName = "Pierre", lastName = "Jordaan", dateofbirth = "17/01/1998", sex = "m", height = 180 })[key]
end

local esxId, esxChar = Framework.getCharacter(1)
eq(esxId, "char1:abc", "ESX adapter id")
eq(esxChar.lastName, "Jordaan", "ESX adapter name")
eq(esxChar.phoneNumber, "555-1234", "ESX adapter phone from users table")
local _, registered = Framework.getCharacter(1, { firstname = "New", lastname = "Name", dateofbirth = "02/03/2001", sex = "f" })
eq(registered.firstName, "New", "ESX esx_identity override")
eq(registered.gender, "Female", "ESX override gender")

local job, onDuty = Framework.getJob(1)
eq(job, "police", "ESX job")
eq(onDuty, true, "ESX duty")
players[1].job.onDuty = false
eq(select(2, Framework.getJob(1)), false, "ESX off duty")
players[1].job.onDuty = nil
eq(select(2, Framework.getJob(1)), true, "old ESX without duty = on duty")

local ids = Framework.getIdentifiers(1)
eq(ids.discordId, "111111111111111111", "discord id")
eq(ids.steamId, "76561197960265728", "steam id decimal")
eq(ids.license, "abc123", "license")

Framework.loadModelNames()
local vehicles, unknown = Framework.getVehicles("char1:abc")
eq(#vehicles, 3, "ESX vehicles (job vehicle skipped)")
eq(vehicles[1].plate, "AB 123", "ESX plate")
eq(vehicles[1].model, "adder", "ESX model name from the vehicles table")
eq(vehicles[1].label, "Adder", "ESX label")
eq(vehicles[1].color, "Metallic Red", "ESX colour")
eq(vehicles[2].hash, -1216765807, "ESX unsigned hash -> signed")
eq(vehicles[2].color, "Custom #0A141E", "ESX custom colour")
eq(vehicles[3].model, nil, "ESX unknown model")
eq(#unknown, 1, "one hash to ask the client")
eq(unknown[1], 12345, "unknown hash")
Framework.rememberClientNames({ ["12345"] = { model = "MYCAR", label = "My Car" } })
Framework.applyModelNames(vehicles)
eq(vehicles[3].model, "mycar", "client named the model")
eq(vehicles[3].label, "My Car", "client label")

-- --- QBCore adapter ------------------------------------------------------------------------------

running = { ["qb-core"] = true, oxmysql = true }
tables.player_vehicles = {
  columns = {},
  rows = {
    { citizenid = "ABC12345", plate = "QB 123", vehicle = "sultan", hash = "970598228", mods = '{"color1":64,"plate":"QB 123"}' },
    { citizenid = "ABC12345", plate = "QB 456", vehicle = "unknowncar", hash = "-5", mods = "" },
  },
}
Framework.name = nil
eq(Framework.init(), "qbcore", "detects QBCore")
players[2] = {
  PlayerData = {
    citizenid = "ABC12345",
    charinfo = { firstname = "John", lastname = "Doe", birthdate = "1990-05-20", gender = 0, phone = "5559876" },
    job = { name = "ambulance", onduty = true },
    metadata = { callsign = "1A-12" },
  },
}
local qbId, qbChar = Framework.getCharacter(2)
eq(qbId, "ABC12345", "QB citizenid")
eq(qbChar.gender, "Male", "QB gender 0")
local qbJob, qbDuty = Framework.getJob(2)
eq(qbJob, "ambulance", "QB job")
eq(qbDuty, true, "QB on duty")
players[2].PlayerData.job.onduty = false
eq(select(2, Framework.getJob(2)), false, "QB off duty")
local qbVehicles = Framework.getVehicles("ABC12345")
eq(#qbVehicles, 2, "QB vehicles")
eq(qbVehicles[1].model, "sultan", "QB model")
eq(qbVehicles[1].label, "Sultan", "QB label from shared vehicles")
eq(qbVehicles[1].color, "Metallic Blue", "QB colour")
eq(qbVehicles[1].hash, 970598228, "QB hash")
eq(qbVehicles[2].label, nil, "QB unknown label")
eq(Config.Jobs.ambulance.unitType, "ems-fd", "ambulance -> ems-fd")
eq(Framework.getPlayerData(2).metadata.callsign, "1A-12", "callsign source")

-- --- Qbox adapter --------------------------------------------------------------------------------

running = { qbx_core = true, ["qb-core"] = true, oxmysql = true }
Framework.name = nil
eq(Framework.init(), "qbox", "detects Qbox before qb-core")
local qbxId = Framework.getCharacter(2)
eq(qbxId, "ABC12345", "Qbox citizenid")
eq(#Framework.getVehicles("ABC12345"), 2, "Qbox vehicles")

-- no database: no vehicle sync
running = { qbx_core = true }
eq(Framework.getVehicles("ABC12345"), nil, "no oxmysql -> nil")

-- --- appearance (hair / eye colour) and CAD defaults ---------------------------------------------

local looks = Mapping.appearance('{"hair_color_1":0,"eye_color":3}')
eq(looks.hairColor, "Black", "skinchanger hair colour (JSON text)")
eq(looks.eyeColor, "Ocean Blue", "skinchanger eye colour")
looks = Mapping.appearance({ hair = { style = 4, color = 10 }, eyeColor = 6 })
eq(looks.hairColor, "Blonde", "illenium / fivem-appearance hair colour")
eq(looks.eyeColor, "Hazel", "illenium / fivem-appearance eye colour")
looks = Mapping.appearance({ hair = { item = 2, texture = 18 }, eye_color = { item = 0 } })
eq(looks.hairColor, "Red", "qb-clothing hair colour")
eq(looks.eyeColor, "Green", "qb-clothing eye colour")
eq(Mapping.appearance("not json").hairColor, nil, "bad skin -> nothing")
eq(Mapping.appearance({ hair_color_1 = 99 }).hairColor, nil, "unknown palette index -> nothing")

local _, withLooks = Mapping.esxCharacter({
  identifier = "char1:x", firstName = "Ben", lastName = "Jja", dateOfBirth = "01/01/1999", sex = "m",
  height = 175, skin = '{"hair_color_1":5,"eye_color":5}',
}, { dateFormat = "DD/MM/YYYY", address = "Los Santos", weight = " 80 " })
eq(withLooks.hairColor, "Light Brown", "ESX character gets the hair colour")
eq(withLooks.eyeColor, "Dark Brown", "ESX character gets the eye colour")
eq(withLooks.address, "Los Santos", "address from Config.Character")
eq(withLooks.weight, "80", "weight from Config.Character, trimmed")
eq(withLooks.ethnicity, nil, "no ethnicity configured -> nil (the CAD picks)")

-- --- licences -----------------------------------------------------------------------------------

local licenceOptions = {
  map = { drivers = { "drive", "drive_bike", "drive_truck", "driver" }, weapon = { "weapon" },
    water = { "boat" }, hunting = { "hunting" } },
  categories = { drive = "Class C", drive_truck = "Class A", drive_bike = "Class M" },
}
local esxKnown = { dmv = true, drive = true, drive_bike = true, drive_truck = true, weapon = true, boat = true }
local held, categories = Mapping.licences({ drive = true, drive_truck = true }, esxKnown, licenceOptions)
eq(held.drivers, true, "drive -> driver's licence held")
eq(held.weapon, false, "no weapon licence -> false")
eq(held.water, false, "no boat licence -> false")
eq(held.hunting, nil, "server has no hunting licence -> left out")
eq(table.concat(categories, ","), "Class A,Class C", "categories of the held licences, sorted")
held = Mapping.licences({ dmv = true }, esxKnown, licenceOptions)
eq(held.drivers, false, "only the dmv permit -> no driver's licence")
eq(Mapping.licences({}, {}, licenceOptions), nil, "server without licences -> nil")
held = Mapping.licences({ driver = true }, { driver = true, weapon = true, business = true }, licenceOptions)
eq(held.drivers, true, "QBCore metadata.licences.driver")
eq(held.weapon, false, "QBCore weapon licence not held")

print(("%d passed, %d failed"):format(passed, failed))
if failed > 0 then os.exit(1) end
