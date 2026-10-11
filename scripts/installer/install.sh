#!/bin/bash
# SnailyCAD one-line installer for Ubuntu.
#
#   Docker:      curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-docker.sh | sudo bash
#   Ubuntu:      curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install-ubuntu.sh | sudo bash
#   Ask me:      curl -fsSL https://raw.githubusercontent.com/EWANZO101/snailycad-mysql/main/scripts/installer/install.sh | sudo bash
#
# install-docker.sh and install-ubuntu.sh run this script with --docker / --ubuntu, which picks
# the install method up front so the wizard skips that step.
#
# This only starts the setup wizard (python3, which Ubuntu ships). Everything else is installed
# from the wizard in the browser, one button per requirement: system tools, Node.js + pnpm or
# Docker, the CAD itself, its database.
#
# Everything lives in one folder so it is easy to throw away:
#   $INSTALL_DIR/app        the CAD (git clone, made by the wizard)
#   $INSTALL_DIR/runtime    its own Node.js + pnpm (standalone method; system Node.js untouched)
#   $INSTALL_DIR/installer  the wizard, its token and a manifest of everything added outside
#                           the folder (packages, services, firewall rules, database, Docker)
# Remove it all with: sudo bash $INSTALL_DIR/uninstall.sh
#
# Environment:
#   SNAILY_NAME         install name: folder /opt/<name>, service <name>   (default: snailycad)
#   SNAILY_DIR          install folder                                      (default: /opt/$SNAILY_NAME)
#   SNAILY_REPO         git repository (GitHub URL or local path) to install from
#   SNAILY_BRANCH       branch to install                                   (default: main)
#   SNAILY_WIZARD_PORT  port of the setup wizard                            (default: 3100)
#   SNAILY_METHOD       docker or ubuntu, same as --docker / --ubuntu
#
# Options:
#   --docker            run the CAD in Docker containers, with a MariaDB container
#   --ubuntu            run the CAD directly on Ubuntu with Node.js (alias: --standalone)
set -euo pipefail

NAME="${SNAILY_NAME:-snailycad}"
INSTALL_DIR="${SNAILY_DIR:-/opt/$NAME}"
REPO="${SNAILY_REPO:-https://github.com/EWANZO101/snailycad-mysql.git}"
BRANCH="${SNAILY_BRANCH:-main}"
WIZARD_PORT="${SNAILY_WIZARD_PORT:-3100}"
WIZARD_FILES=(wizard-server.py wizard.html uninstall.sh)
METHOD="${SNAILY_METHOD:-}"

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

while [[ $# -gt 0 ]]; do
    case "$1" in
        --docker) METHOD=docker ;;
        --ubuntu | --standalone) METHOD=standalone ;;
        *) fail "Unknown option: $1 (use --docker or --ubuntu)" ;;
    esac
    shift
done
case "$METHOD" in
    "" | docker | standalone) ;;
    ubuntu) METHOD=standalone ;;
    *) fail "SNAILY_METHOD must be docker or ubuntu." ;;
esac

[[ $EUID -eq 0 ]] || fail "Run this as root (e.g. with sudo)."
[[ "$NAME" =~ ^[a-z][a-z0-9-]{0,30}$ ]] || fail "SNAILY_NAME must be lowercase letters, numbers and dashes."
[[ "$WIZARD_PORT" =~ ^[0-9]+$ ]] || fail "SNAILY_WIZARD_PORT must be a number."

# in a subshell: os-release sets NAME, which would replace ours
if [[ -r /etc/os-release ]] && ! (. /etc/os-release && [[ "${ID:-}" == ubuntu || "${ID_LIKE:-}" == *ubuntu* || "${ID:-}" == debian ]]); then
    warn "This installer is made for Ubuntu; $(. /etc/os-release && echo "${PRETTY_NAME:-this OS}") is not tested."
fi

if [[ -e "$INSTALL_DIR" ]]; then
    fail "$INSTALL_DIR already exists. Remove the old install first: sudo bash $INSTALL_DIR/uninstall.sh"
fi
if systemctl list-unit-files "$NAME.service" 2>/dev/null | grep -q "^$NAME.service"; then
    fail "A systemd service named $NAME already exists. Pick another name with SNAILY_NAME=..."
fi
if (exec 3<>"/dev/tcp/127.0.0.1/$WIZARD_PORT") 2>/dev/null; then
    fail "Port $WIZARD_PORT is already in use. Pick another one with SNAILY_WIZARD_PORT=..."
fi

# --- folder + manifest ----------------------------------------------------------

mkdir -p "$INSTALL_DIR/installer"
chmod 700 "$INSTALL_DIR/installer"
MANIFEST="$INSTALL_DIR/installer/manifest.env"
cat > "$MANIFEST" <<EOF
# What this install added outside $INSTALL_DIR. Read by uninstall.sh.
NAME=$NAME
INSTALL_DIR=$INSTALL_DIR
REPO=$REPO
BRANCH=$BRANCH
EOF
if [[ -n "$METHOD" ]]; then
    # chosen by the install command: the wizard skips its method step
    printf 'METHOD=%s\nMETHOD_PRESET=1\n' "$METHOD" >> "$MANIFEST"
fi

# --- python3 (the wizard) --------------------------------------------------------

if ! command -v python3 >/dev/null 2>&1; then
    log "Installing python3 for the setup wizard..."
    echo "APT_PACKAGE=python3" >> "$MANIFEST"
    DEBIAN_FRONTEND=noninteractive apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq python3 >/dev/null
fi

# --- wizard files -------------------------------------------------------------------

log "Downloading the setup wizard..."
if [[ -d "$REPO" ]]; then
    for f in "${WIZARD_FILES[@]}"; do
        git -C "$REPO" show "$BRANCH:scripts/installer/$f" > "$INSTALL_DIR/installer/$f" \
            || fail "Could not read scripts/installer/$f from $REPO ($BRANCH)."
    done
else
    if [[ "$REPO" =~ ^https://github\.com/([^/]+)/([^/]+)$ ]]; then
        RAW="https://raw.githubusercontent.com/${BASH_REMATCH[1]}/${BASH_REMATCH[2]%.git}/$BRANCH/scripts/installer"
    else
        RAW="${SNAILY_RAW_BASE:-}"
        [[ -n "$RAW" ]] || fail "Set SNAILY_RAW_BASE to the raw-file URL of scripts/installer for $REPO."
    fi
    command -v curl >/dev/null 2>&1 || fail "curl is needed to download the wizard: apt-get install curl"
    for f in "${WIZARD_FILES[@]}"; do
        curl -fsSL "$RAW/$f" -o "$INSTALL_DIR/installer/$f" || fail "Could not download $RAW/$f"
    done
fi
mv "$INSTALL_DIR/installer/uninstall.sh" "$INSTALL_DIR/uninstall.sh"
chmod 700 "$INSTALL_DIR/uninstall.sh"

# --- firewall -------------------------------------------------------------------

if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
    echo "UFW_PORT=$WIZARD_PORT" >> "$MANIFEST"
    ufw allow "$WIZARD_PORT/tcp" comment "$NAME setup wizard" >/dev/null
    log "Firewall: opened port $WIZARD_PORT for the setup wizard (closed again when you finish)."
fi

# --- start the wizard -----------------------------------------------------------------

TOKEN=$(head -c 18 /dev/urandom | od -An -tx1 | tr -d ' \n')
echo "$TOKEN" > "$INSTALL_DIR/installer/token"
chmod 600 "$INSTALL_DIR/installer/token"

WIZARD_UNIT="$NAME-installer"
echo "SERVICE=$WIZARD_UNIT" >> "$MANIFEST"
WIZARD_CMD=(python3 -u "$INSTALL_DIR/installer/wizard-server.py")
if command -v systemd-run >/dev/null 2>&1 && [[ -d /run/systemd/system ]]; then
    systemd-run --quiet --unit="$WIZARD_UNIT" --collect \
        --property=WorkingDirectory="$INSTALL_DIR" \
        --setenv=SNAILY_INSTALL_DIR="$INSTALL_DIR" \
        --setenv=SNAILY_WIZARD_PORT="$WIZARD_PORT" \
        "${WIZARD_CMD[@]}" || fail "Could not start the setup wizard."
    LOGS="journalctl -u $WIZARD_UNIT"
else
    SNAILY_INSTALL_DIR="$INSTALL_DIR" SNAILY_WIZARD_PORT="$WIZARD_PORT" \
        nohup "${WIZARD_CMD[@]}" > "$INSTALL_DIR/installer/wizard.log" 2>&1 &
    LOGS="cat $INSTALL_DIR/installer/wizard.log"
fi

for _ in $(seq 1 20); do
    (exec 3<>"/dev/tcp/127.0.0.1/$WIZARD_PORT") 2>/dev/null && break
    sleep 0.5
done
(exec 3<>"/dev/tcp/127.0.0.1/$WIZARD_PORT") 2>/dev/null || fail "The setup wizard did not start. See: $LOGS"

IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1)
echo
case "$METHOD" in
    docker) echo -e "Install method: ${BOLD}Docker${NC}" ;;
    standalone) echo -e "Install method: ${BOLD}Ubuntu (standalone, Node.js)${NC}" ;;
esac
echo -e "${BOLD}SnailyCAD setup wizard is running. Open this link in your browser:${NC}"
echo
echo -e "    ${GREEN}http://${IP:-<server-ip>}:${WIZARD_PORT}/?token=${TOKEN}${NC}"
echo
echo "Everything lives in $INSTALL_DIR. To remove it all again:"
echo "    sudo bash $INSTALL_DIR/uninstall.sh"
echo
