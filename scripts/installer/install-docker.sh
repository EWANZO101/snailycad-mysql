#!/bin/bash
# One-line SnailyCAD install: Docker (the CAD and a MariaDB database in containers).
#
#   curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-docker.sh | sudo bash
#
# Runs install.sh --docker; every SNAILY_* option of install.sh works here too.
set -euo pipefail
BASE="${SNAILY_INSTALLER_URL:-https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/${SNAILY_BRANCH:-main}/scripts/installer}"
curl -fsSL "$BASE/install.sh" | bash -s -- --docker
