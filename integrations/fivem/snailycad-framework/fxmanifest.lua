fx_version "cerulean"
game "gta5"
lua54 "yes"

name "snailycad-framework"
description "SnailyCAD framework sync: ESX / QBCore / Qbox characters, vehicles and duty in the CAD"
author "SnailyCAD community"
version "1.0.0"
repository "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem/snailycad-framework"

shared_scripts {
  "config.lua",
  "shared/colours.lua",
  "shared/mapping.lua",
}

server_scripts {
  "server/settings.lua",
  "server/api.lua",
  "server/framework.lua",
  "server/main.lua",
  "server/vehicles.lua",
  "server/commands.lua",
}

client_scripts {
  "client/main.lua",
}
