fx_version "cerulean"
game "gta5"
lua54 "yes"

name "snailycad-radio"
description "SnailyCAD Radio: push-to-talk radio shared with the CAD's browser dispatchers"
author "SnailyCAD community"
version "1.0.0"
repository "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem/snailycad-radio"

ui_page "html/index.html"

files {
  "html/index.html",
  "html/style.css",
  "html/app.js",
  "html/chunks/*.js",
}

shared_scripts {
  "config.lua",
  "shared/locale.lua",
}

server_scripts {
  "server/access.lua",
  "server/main.lua",
}

client_scripts {
  "client/voice.lua",
  "client/prop.lua",
  "client/main.lua",
  "client/nearby.lua",
}
