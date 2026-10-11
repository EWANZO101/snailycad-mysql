#!/bin/bash
# SnailyCAD one-line installer for Ubuntu.
#
#   curl -fsSL <url>/scripts/installer/install.sh | sudo bash
#
# Keeps everything in one folder so it is easy to throw away:
#   $INSTALL_DIR/app        the CAD (git clone)
#   $INSTALL_DIR/runtime    its own Node.js + pnpm (the system Node.js is not touched)
#   $INSTALL_DIR/installer  manifest of what was added outside the folder, wizard token
# Outside the folder it only adds what the manifest lists (systemd units, firewall rules,
# the database and its user, MariaDB if you let the wizard install it).
# Remove it all with: sudo bash $INSTALL_DIR/uninstall.sh
#
# Then it starts a setup wizard in the browser on http://<server-ip>:<wizard port>.
#
# Environment:
#   SNAILY_NAME         install name: folder /opt/<name>, service <name>   (default: snailycad)
#   SNAILY_DIR          install folder                                      (default: /opt/$SNAILY_NAME)
#   SNAILY_REPO         git repository (URL or local path) to install from
#   SNAILY_BRANCH       branch to install                                   (default: feat/mysql-support)
#   SNAILY_WIZARD_PORT  port of the setup wizard                            (default: 3100)
#   SNAILY_NODE_MAJOR   Node.js major version                               (default: 22)
set -euo pipefail

NAME="${SNAILY_NAME:-snailycad}"
INSTALL_DIR="${SNAILY_DIR:-/opt/$NAME}"
REPO="${SNAILY_REPO:-https://github.com/SnailyCAD/snaily-cadv4.git}"
BRANCH="${SNAILY_BRANCH:-feat/mysql-support}"
WIZARD_PORT="${SNAILY_WIZARD_PORT:-3100}"
NODE_MAJOR="${SNAILY_NODE_MAJOR:-22}"
PNPM_VERSION="9.0.4"

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
BOLD="\033[1m"
NC="\033[0m"

log() { echo -e "${GREEN}[*]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
fail() {
    echo -e "${RED}[x]${NC} $1" >&2
    exit 1
}

[[ $EUID -eq 0 ]] || fail "Run this as root (e.g. with sudo)."
[[ "$NAME" =~ ^[a-z][a-z0-9-]{0,30}$ ]] || fail "SNAILY_NAME must be lowercase letters, numbers and dashes."
[[ "$WIZARD_PORT" =~ ^[0-9]+$ ]] || fail "SNAILY_WIZARD_PORT must be a number."

# in a subshell: os-release sets NAME, which would replace ours
if [[ -r /etc/os-release ]] && ! (. /etc/os-release && [[ "${ID:-}" == ubuntu || "${ID_LIKE:-}" == *ubuntu* || "${ID:-}" == debian ]]); then
    warn "This installer is made for Ubuntu; $(. /etc/os-release && echo "${PRETTY_NAME:-this OS}") is not tested."
fi

case "$(uname -m)" in
    x86_64) NODE_ARCH="x64" ;;
    aarch64 | arm64) NODE_ARCH="arm64" ;;
    *) fail "Unsupported CPU architecture: $(uname -m)" ;;
esac

if [[ -e "$INSTALL_DIR" ]]; then
    fail "$INSTALL_DIR already exists. Remove the old install first: sudo bash $INSTALL_DIR/uninstall.sh"
fi
if systemctl list-unit-files "$NAME.service" 2>/dev/null | grep -q "^$NAME.service"; then
    fail "A systemd service named $NAME already exists. Pick another name with SNAILY_NAME=..."
fi
if (exec 3<>"/dev/tcp/127.0.0.1/$WIZARD_PORT") 2>/dev/null; then
    fail "Port $WIZARD_PORT is already in use. Pick another one with SNAILY_WIZARD_PORT=..."
fi

# --- system packages (only the missing ones) -----------------------------------

missing=()
for pair in git:git curl:curl xz:xz-utils sha256sum:coreutils; do
    command -v "${pair%%:*}" >/dev/null 2>&1 || missing+=("${pair#*:}")
done
if [[ ${#missing[@]} -gt 0 ]]; then
    log "Installing ${missing[*]}..."
    export DEBIAN_FRONTEND=noninteractive
    apt-get update -qq
    apt-get install -y -qq "${missing[@]}" ca-certificates >/dev/null
fi

# --- folder + manifest ----------------------------------------------------------

mkdir -p "$INSTALL_DIR/installer" "$INSTALL_DIR/runtime"
chmod 700 "$INSTALL_DIR/installer"
MANIFEST="$INSTALL_DIR/installer/manifest.env"
cat > "$MANIFEST" <<EOF
# What this install added outside $INSTALL_DIR. Read by uninstall.sh.
NAME=$NAME
INSTALL_DIR=$INSTALL_DIR
EOF

# --- Node.js + pnpm, private to this install ----------------------------------

log "Downloading Node.js $NODE_MAJOR (private copy in $INSTALL_DIR/runtime)..."
NODE_DIST="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
SHASUMS=$(curl -fsSL "$NODE_DIST/SHASUMS256.txt") || fail "Could not reach nodejs.org."
NODE_FILE=$(echo "$SHASUMS" | awk '{print $2}' | grep -E "^node-v[0-9.]+-linux-${NODE_ARCH}\.tar\.xz$" | head -1)
[[ -n "$NODE_FILE" ]] || fail "Could not find a Node.js $NODE_MAJOR download for linux-$NODE_ARCH."
curl -fsSL "$NODE_DIST/$NODE_FILE" -o "$INSTALL_DIR/runtime/$NODE_FILE"
(cd "$INSTALL_DIR/runtime" && echo "$SHASUMS" | grep " $NODE_FILE\$" | sha256sum -c --quiet -) \
    || fail "Node.js download checksum mismatch."
mkdir -p "$INSTALL_DIR/runtime/node"
tar -xJf "$INSTALL_DIR/runtime/$NODE_FILE" -C "$INSTALL_DIR/runtime/node" --strip-components=1
rm -f "$INSTALL_DIR/runtime/$NODE_FILE"
export PATH="$INSTALL_DIR/runtime/node/bin:$PATH"
log "Node.js $(node -v) ready."

log "Installing pnpm $PNPM_VERSION..."
npm install -g --silent --no-fund --no-audit "pnpm@$PNPM_VERSION" >/dev/null
log "pnpm $(pnpm -v) ready."

# --- the CAD --------------------------------------------------------------------

# --depth is ignored for plain local paths, file:// keeps the clone shallow
CLONE_FROM="$REPO"
[[ -d "$REPO" ]] && CLONE_FROM="file://$(cd "$REPO" && pwd)"
log "Downloading SnailyCAD ($BRANCH)..."
git clone -q --depth 1 --branch "$BRANCH" "$CLONE_FROM" "$INSTALL_DIR/app" \
    || fail "Could not clone $REPO (branch $BRANCH)."
cp "$INSTALL_DIR/app/scripts/installer/uninstall.sh" "$INSTALL_DIR/uninstall.sh"
chmod 700 "$INSTALL_DIR/uninstall.sh"
cat >> "$MANIFEST" <<EOF
REPO=$REPO
BRANCH=$BRANCH
EOF

# --- firewall -------------------------------------------------------------------

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    ufw allow "$WIZARD_PORT/tcp" comment "$NAME setup wizard" >/dev/null
    echo "UFW_PORT=$WIZARD_PORT" >> "$MANIFEST"
    log "Firewall: opened port $WIZARD_PORT for the setup wizard (closed again when you finish)."
fi

# --- setup wizard -----------------------------------------------------------------

TOKEN=$(head -c 18 /dev/urandom | od -An -tx1 | tr -d ' \n')
echo "$TOKEN" > "$INSTALL_DIR/installer/token"
chmod 600 "$INSTALL_DIR/installer/token"

WIZARD_UNIT="$NAME-installer"
echo "SERVICE=$WIZARD_UNIT" >> "$MANIFEST"
systemd-run --quiet --unit="$WIZARD_UNIT" --collect \
    --property=WorkingDirectory="$INSTALL_DIR" \
    --setenv=PATH="$INSTALL_DIR/runtime/node/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin" \
    --setenv=SNAILY_INSTALL_DIR="$INSTALL_DIR" \
    --setenv=SNAILY_WIZARD_PORT="$WIZARD_PORT" \
    "$INSTALL_DIR/runtime/node/bin/node" "$INSTALL_DIR/app/scripts/installer/wizard-server.mjs" \
    || fail "Could not start the setup wizard."

for _ in $(seq 1 20); do
    (exec 3<>"/dev/tcp/127.0.0.1/$WIZARD_PORT") 2>/dev/null && break
    sleep 0.5
done
(exec 3<>"/dev/tcp/127.0.0.1/$WIZARD_PORT") 2>/dev/null \
    || fail "The setup wizard did not start. See: journalctl -u $WIZARD_UNIT"

IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1)
echo
echo -e "${BOLD}SnailyCAD setup wizard is running. Open this link in your browser:${NC}"
echo
echo -e "    ${GREEN}http://${IP:-<server-ip>}:${WIZARD_PORT}/?token=${TOKEN}${NC}"
echo
echo "Everything lives in $INSTALL_DIR. To remove it all again:"
echo "    sudo bash $INSTALL_DIR/uninstall.sh"
echo
