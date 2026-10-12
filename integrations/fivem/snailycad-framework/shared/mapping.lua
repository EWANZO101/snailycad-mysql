--[[
  Turns framework data (ESX xPlayer / users rows, QBCore & Qbox PlayerData / player_vehicles rows)
  into what the CAD API expects. Pure functions without FiveM natives, so they can be tested with
  plain Lua (see tests/mapping_test.lua).
]]

Mapping = {}

local function trim(value)
  if type(value) ~= "string" then return nil end
  value = value:gsub("^%s+", ""):gsub("%s+$", "")
  if value == "" then return nil end
  return value
end
Mapping.trim = trim

local function isLeapYear(year)
  return (year % 4 == 0 and year % 100 ~= 0) or year % 400 == 0
end

local function validDate(year, month, day)
  if not year or not month or not day then return nil end
  if year < 1850 or year > 2200 or month < 1 or month > 12 or day < 1 then return nil end
  local days = { 31, isLeapYear(year) and 29 or 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31 }
  if day > days[month] then return nil end
  return ("%04d-%02d-%02d"):format(year, month, day)
end

--- a date of birth from any framework -> "YYYY-MM-DD" (nil when it can't be read)
--- format: how day-first dates are stored ("DD/MM/YYYY", "MM/DD/YYYY" or "YYYY/MM/DD")
function Mapping.parseDate(value, format)
  if type(value) == "number" then
    -- a timestamp (ms or s), e.g. from an ox_lib date input
    local seconds = value > 100000000000 and math.floor(value / 1000) or math.floor(value)
    local date = os.date("!*t", seconds)
    return validDate(date.year, date.month, date.day)
  end
  value = trim(value)
  if not value then return nil end

  local a, b, c = value:match("^(%d+)[%-/%.](%d+)[%-/%.](%d+)")
  a, b, c = tonumber(a), tonumber(b), tonumber(c)
  if not a then return nil end

  -- year first: YYYY-MM-DD (QBCore, Qbox, ISO) or YYYY/MM/DD
  if a > 31 then return validDate(a, b, c) end
  if c < 100 then return nil end

  -- year last: day / month order from the setting, unless the numbers say otherwise
  local monthFirst = format == "MM/DD/YYYY"
  if a > 12 then monthFirst = false elseif b > 12 then monthFirst = true end
  if monthFirst then return validDate(c, a, b) end
  return validDate(c, b, a)
end

--- the framework's gender ("m", "f", 0, 1, "male", ...) -> the CAD gender's name
function Mapping.gender(value, names)
  names = names or {}
  local key
  if value == 0 or value == "0" then
    key = "male"
  elseif value == 1 or value == "1" then
    key = "female"
  elseif type(value) == "string" then
    local lower = value:lower()
    if lower == "m" or lower == "male" or lower == "man" then
      key = "male"
    elseif lower == "f" or lower == "female" or lower == "woman" then
      key = "female"
    else
      return names[lower] or trim(value)
    end
  end
  if not key then return nil end
  return names[key] or (key == "male" and "Male" or "Female")
end

--- height in cm -> a string for the CAD (nil when unknown)
function Mapping.height(value)
  local number = tonumber(value)
  if not number or number <= 0 then return nil end
  return tostring(math.floor(number + 0.5))
end

local function phone(value)
  if type(value) == "number" then return tostring(math.floor(value)) end
  return trim(value)
end

-- GTA hair colour palette (0-63) -> a plain colour name, close enough for a CAD record
Mapping.HAIR_COLOURS = {
  [0] = "Black", "Dark Brown", "Dark Brown", "Brown", "Brown", "Light Brown", "Light Brown",
  "Light Brown", "Dark Blonde", "Dark Blonde", "Blonde", "Blonde", "Light Blonde", "Light Blonde",
  "Platinum Blonde", "Platinum Blonde", "Strawberry Blonde", "Auburn", "Red", "Red", "Dark Red",
  "Dark Red", "Copper", "Copper", "Brown", "Brown", "Grey", "Grey", "Light Grey", "White",
  "Purple", "Purple", "Purple", "Pink", "Pink", "Pink", "Teal", "Teal", "Blue", "Green", "Green",
  "Green", "Lime", "Lime", "Yellow", "Yellow", "Orange", "Orange", "Orange", "Red", "Red",
  "Dark Red", "Dark Red", "Red", "Dark Red", "Brown", "Dark Blonde", "Dark Brown", "Dark Brown",
  "Light Brown", "Blonde", "Black", "Blonde", "Blonde",
}

-- GTA eye colours (0-31), as the character creator names them
Mapping.EYE_COLOURS = {
  [0] = "Green", "Emerald", "Light Blue", "Ocean Blue", "Light Brown", "Dark Brown", "Hazel",
  "Dark Gray", "Light Gray", "Pink", "Yellow", "Purple", "Blackout", "Shades of Gray",
  "Tequila Sunrise", "Atomic", "Warp", "ECola", "Space Ranger", "Ying Yang", "Bullseye", "Lizard",
  "Dragon", "Extra Terrestrial", "Goat", "Smiley", "Possessed", "Demon", "Infected", "Alien",
  "Undead", "Zombie",
}

local function paletteName(palette, value)
  local index = math.tointeger(tonumber(value))
  if not index then return nil end
  return palette[index]
end

--[[
  Hair and eye colour from a saved skin, whatever the clothing script:
    skinchanger (ESX):              { hair_color_1 = n, eye_color = n }
    fivem-appearance / illenium:    { hair = { color = n }, eyeColor = n }
    qb-clothing:                    { hair = { texture = n }, eye_color = { item = n } }
  skin: a table or its JSON text. Returns { hairColor, eyeColor } (either may be nil).
]]
function Mapping.appearance(skin)
  if type(skin) == "string" then
    local ok, decoded = pcall(json.decode, skin)
    skin = ok and decoded or nil
  end
  if type(skin) ~= "table" then return {} end

  local hair, eye
  if skin.hair_color_1 ~= nil then hair = skin.hair_color_1 end
  if type(skin.hair) == "table" then
    if skin.hair.color ~= nil then hair = skin.hair.color
    elseif skin.hair.texture ~= nil then hair = skin.hair.texture end
  end
  if skin.eyeColor ~= nil then eye = skin.eyeColor end
  if skin.eye_color ~= nil then
    eye = type(skin.eye_color) == "table" and skin.eye_color.item or skin.eye_color
  end

  return {
    hairColor = paletteName(Mapping.HAIR_COLOURS, hair),
    eyeColor = paletteName(Mapping.EYE_COLOURS, eye),
  }
end

-- what the game doesn't know (weight, address, ethnicity): Config.Character defaults
local function addDefaults(character, data, options)
  local looks = Mapping.appearance(data.skin)
  character.hairColor = looks.hairColor
  character.eyeColor = looks.eyeColor
  character.weight = trim(options.weight)
  character.address = trim(options.address)
  character.ethnicity = trim(options.ethnicity)
  return character
end

--[[
  ESX: data = {
    identifier,            -- xPlayer.identifier (char1:license..., the stable character id)
    firstName, lastName,   -- xPlayer.get("firstName") / get("lastName"), or users.firstname
    dateOfBirth, sex, height, phoneNumber,
  }
  returns characterId, character (nil when the character has no identity yet)
]]
function Mapping.esxCharacter(data, options)
  options = options or {}
  local firstName, lastName = trim(data.firstName), trim(data.lastName)
  if not data.identifier or not firstName or not lastName then return nil end
  return data.identifier, addDefaults({
    firstName = firstName,
    lastName = lastName,
    dateOfBirth = Mapping.parseDate(data.dateOfBirth, options.dateFormat),
    gender = Mapping.gender(data.sex, options.genders),
    height = options.height ~= false and Mapping.height(data.height) or nil,
    phoneNumber = options.phone ~= false and phone(data.phoneNumber) or nil,
  }, data, options)
end

--[[
  QBCore / Qbox: PlayerData = { citizenid, charinfo = { firstname, lastname, birthdate, gender,
  phone }, metadata = { height? } }
]]
function Mapping.qbCharacter(playerData, options, skin)
  options = options or {}
  if type(playerData) ~= "table" or not playerData.citizenid then return nil end
  local info = playerData.charinfo or {}
  local firstName, lastName = trim(info.firstname), trim(info.lastname)
  if not firstName or not lastName then return nil end
  local metadata = playerData.metadata or {}
  return playerData.citizenid, addDefaults({
    firstName = firstName,
    lastName = lastName,
    dateOfBirth = Mapping.parseDate(info.birthdate, "YYYY/MM/DD"),
    gender = Mapping.gender(info.gender, options.genders),
    height = options.height ~= false and Mapping.height(info.height or metadata.height) or nil,
    phoneNumber = options.phone ~= false and phone(info.phone) or nil,
  }, { skin = skin }, options)
end

--- a paint index or a custom { r, g, b } -> a colour name
function Mapping.colour(value, customValue)
  if type(customValue) == "table" and customValue[1] then
    value = customValue
  end
  if type(value) == "table" then
    local r, g, b = tonumber(value[1] or value.r), tonumber(value[2] or value.g), tonumber(value[3] or value.b)
    if r and g and b then return ("Custom #%02X%02X%02X"):format(r, g, b) end
    return nil
  end
  local index = tonumber(value)
  if not index then return nil end
  return (VehicleColours or {})[math.floor(index)]
end

--- plates are padded with spaces in game; the CAD stores them trimmed and in capitals
function Mapping.plate(value)
  value = trim(value)
  return value and value:upper() or nil
end

--- unsigned -> signed 32 bit (the game's GetHashKey form)
function Mapping.signedHash(value)
  local number = tonumber(value)
  if not number then return nil end
  number = math.floor(number)
  if number > 2147483647 then number = number - 4294967296 end
  return number
end

local function contains(list, value)
  for _, item in ipairs(list or {}) do
    if item == value then return true end
  end
  return false
end

--[[
  ESX owned_vehicles row: { plate, vehicle (props, decoded), type, job }
  names: hash (signed) -> { model = "adder", label = "Adder" } (from the vehicles table / clients)
  returns the vehicle for the CAD, or nil + a reason to skip it
]]
function Mapping.esxVehicle(row, props, names, options)
  options = options or {}
  if options.skipJobVehicles ~= false and trim(row.job) then return nil, "jobVehicle" end
  if options.types and #options.types > 0 and not contains(options.types, row.type or "car") then
    return nil, "type"
  end
  props = type(props) == "table" and props or {}
  local plate = Mapping.plate(row.plate or props.plate)
  if not plate then return nil, "noPlate" end
  local hash = Mapping.signedHash(props.model)
  local name = hash and names and names[hash] or {}
  return {
    plate = plate,
    hash = hash,
    model = name.model,
    label = name.label,
    color = Mapping.colour(props.color1, props.customPrimaryColor),
  }
end

--[[
  QBCore / Qbox player_vehicles row: { plate, vehicle = "adder", hash, mods (decoded) }
  shared: spawn name -> { name = "Adder", brand = "Truffade" } (QBCore.Shared.Vehicles)
]]
function Mapping.qbVehicle(row, mods, shared)
  mods = type(mods) == "table" and mods or {}
  local plate = Mapping.plate(row.plate or mods.plate)
  if not plate then return nil, "noPlate" end
  local model = trim(row.vehicle)
  local info = model and shared and shared[model] or {}
  local hash = Mapping.signedHash(row.hash or mods.model)
  return {
    plate = plate,
    hash = hash,
    model = model,
    label = trim(info.name),
    color = Mapping.colour(mods.color1, mods.customPrimaryColor),
  }
end

--- steam:110000100000000 (hex) -> 76561197960265728 (decimal, like the CAD stores it)
function Mapping.steamDecimal(hex)
  local decimal = math.tointeger(tonumber(hex, 16))
  return decimal and tostring(decimal) or nil
end
