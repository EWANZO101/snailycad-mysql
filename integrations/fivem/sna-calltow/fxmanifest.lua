fx_version "cerulean"
game "gta5"
node_version "22"

name "sna-calltow"
description "/sn-calltow: request a tow truck through SnailyCAD"
author "Casper Iversen, SnailyCAD community"
version "0.15.2"
repository "https://github.com/EWANZO101/snailycad-mysql/tree/main/integrations/fivem"

dependency "chat"

server_script "server/server.js"
client_script "client/client.js"
