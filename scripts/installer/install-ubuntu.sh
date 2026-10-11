#!/bin/bash
# One-line SnailyCAD install: Ubuntu standalone (the CAD runs directly with Node.js).
#
#   curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-ubuntu.sh | sudo bash
#
# Runs install.sh --ubuntu; every SNAILY_* option of install.sh works here too.
set -euo pipefail
BASE="${SNAILY_INSTALLER_URL:-https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/${SNAILY_BRANCH:-main}/scripts/installer}"
curl -fsSL "$BASE/install.sh" | bash -s -- --ubuntu
