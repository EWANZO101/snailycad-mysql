fx_version "cerulean"
game "gta5"
node_version "22"

name "sna-sync"
description "Sync SnailyCAD with FiveM: unit status, 911 calls, panic button, live alerts"
author "Casper Iversen, SnailyCAD community"
version "0.15.0"
repository "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem"

dependency "chat"

ui_page "nui/index.html"

files {
  "nui/index.html",
  "nui/style.css",
  "nui/app.js",
}

server_script "server/server.js"
client_script "client/client.js"
