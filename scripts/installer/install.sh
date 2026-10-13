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
#   SNAILY_ACTION       new or uninstall: what to do when SnailyCAD is already installed, for
#                       runs without a terminal to ask in (default: ask)
#
# Running the command again on a server that already has SnailyCAD asks whether to install
# another one next to it (its own name, folder, ports and database) or to uninstall one.
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
ACTION="${SNAILY_ACTION:-}"

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

# --- already installed? ------------------------------------------------------------

port_in_use() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }
service_exists() { systemctl list-unit-files "$1.service" 2>/dev/null | grep -q "^$1.service"; }
name_taken() { [[ -e "/opt/$1" ]] || service_exists "$1" || service_exists "$1-installer"; }
# `curl ... | sudo bash` reads this script from stdin: questions go to the terminal instead
can_ask() { [[ -r /dev/tty ]] && { : < /dev/tty; } 2>/dev/null; }
ask() {
    local answer
    read -r -p "$1" answer < /dev/tty || answer=""
    echo "$answer"
}

# every install this script made: a folder with installer/manifest.env (name, folder, service)
INSTALLS=()
for manifest in /opt/*/installer/manifest.env "${SNAILY_DIR:+$SNAILY_DIR/installer/manifest.env}"; do
    [[ -n "$manifest" && -f "$manifest" ]] || continue
    dir="$(dirname "$(dirname "$manifest")")"
    [[ " ${INSTALLS[*]} " == *" $dir "* ]] || INSTALLS+=("$dir")
done

manifest_get() { grep -m1 "^$2=" "$1/installer/manifest.env" 2>/dev/null | cut -d= -f2- || true; }

describe_install() {
    local dir="$1" name service state
    name="$(manifest_get "$dir" NAME)"
    service="$(manifest_get "$dir" CAD_SERVICE)"
    if [[ -n "$service" ]]; then
        state="$(systemctl is-active "$service" 2>/dev/null || true)"
    elif [[ -n "$(manifest_get "$dir" DOCKER_PROJECT)" ]]; then
        state="docker"
    else
        state="setup not finished"
    fi
    printf '%-16s %-26s %s' "${name:-?}" "$dir" "${state:-unknown}"
}

if [[ ${#INSTALLS[@]} -gt 0 && ( -z "${SNAILY_NAME:-}${SNAILY_DIR:-}" || -e "$INSTALL_DIR" ) ]]; then
    echo
    echo -e "${BOLD}SnailyCAD is already installed on this server:${NC}"
    for i in "${!INSTALLS[@]}"; do
        echo "  $((i + 1))) $(describe_install "${INSTALLS[$i]}")"
    done
    echo
    if [[ -z "$ACTION" ]]; then
        can_ask || fail "Run this in a terminal to choose, or set SNAILY_ACTION=new (another install) or SNAILY_ACTION=uninstall."
        echo "What would you like to do?"
        echo "  1) Install another SnailyCAD next to it"
        echo "  2) Uninstall a SnailyCAD"
        echo "  3) Cancel"
        case "$(ask "Choose [1-3]: ")" in
            1) ACTION=new ;;
            2) ACTION=uninstall ;;
            *) echo "Cancelled."; exit 0 ;;
        esac
    fi

    case "$ACTION" in
        uninstall)
            target="${INSTALLS[0]}"
            if [[ ${#INSTALLS[@]} -gt 1 ]]; then
                can_ask || fail "Several installs: run the one you want: sudo bash <folder>/uninstall.sh"
                pick="$(ask "Which one do you want to uninstall? [1-${#INSTALLS[@]}]: ")"
                [[ "$pick" =~ ^[0-9]+$ ]] && ((pick >= 1 && pick <= ${#INSTALLS[@]})) || fail "No install number $pick."
                target="${INSTALLS[$((pick - 1))]}"
            fi
            [[ -f "$target/uninstall.sh" ]] || fail "$target/uninstall.sh is missing."
            log "Uninstalling $(manifest_get "$target" NAME) ($target)..."
            # its own questions (what to remove, confirm) come from uninstall.sh
            exec bash "$target/uninstall.sh"
            ;;
        new)
            # the next free name: snailycad-2, snailycad-3, ...
            base="${SNAILY_NAME:-snailycad}"
            suggestion="$base"
            n=2
            while name_taken "$suggestion"; do
                suggestion="$base-$n"
                n=$((n + 1))
            done
            NAME="$suggestion"
            if can_ask && [[ -z "${SNAILY_ACTION:-}" ]]; then
                while true; do
                    answer="$(ask "Name for the new install (folder /opt/<name>, service <name>) [$NAME]: ")"
                    answer="${answer:-$NAME}"
                    if [[ ! "$answer" =~ ^[a-z][a-z0-9-]{0,30}$ ]]; then
                        warn "Use lowercase letters, numbers and dashes (starting with a letter)."
                    elif name_taken "$answer"; then
                        warn "$answer is already used on this server; pick another name."
                    else
                        NAME="$answer"
                        break
                    fi
                done
            fi
            INSTALL_DIR="/opt/$NAME"
            log "Installing another SnailyCAD as $NAME in $INSTALL_DIR."
            ;;
        *) fail "SNAILY_ACTION must be new or uninstall." ;;
    esac
fi

if [[ -e "$INSTALL_DIR" ]]; then
    fail "$INSTALL_DIR already exists. Remove the old install first: sudo bash $INSTALL_DIR/uninstall.sh"
fi
if service_exists "$NAME"; then
    fail "A systemd service named $NAME already exists. Pick another name with SNAILY_NAME=..."
fi
if port_in_use "$WIZARD_PORT"; then
    [[ -z "${SNAILY_WIZARD_PORT:-}" ]] || fail "Port $WIZARD_PORT is already in use. Pick another one with SNAILY_WIZARD_PORT=..."
    # another install's wizard (or anything else) has the default port: take the next free one
    for port in $(seq $((WIZARD_PORT + 1)) $((WIZARD_PORT + 100))); do
        port_in_use "$port" || { WIZARD_PORT="$port"; break; }
    done
    port_in_use "$WIZARD_PORT" && fail "No free port for the setup wizard near 3100. Set SNAILY_WIZARD_PORT=..."
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
    port_in_use "$WIZARD_PORT" && break
    sleep 0.5
done
port_in_use "$WIZARD_PORT" || fail "The setup wizard did not start. See: $LOGS"

# the wizard answers on every address: from the internet (public IP), from the local network
# (LAN IP) and on this machine
LOCAL_IP=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+(\.[0-9]+){3}$' | head -1 || true)
PUBLIC_IP=""
if command -v curl >/dev/null 2>&1; then
    for url in https://api.ipify.org https://ifconfig.me/ip https://icanhazip.com; do
        PUBLIC_IP=$(curl -fsS --max-time 4 "$url" 2>/dev/null | tr -d '[:space:]' || true)
        [[ "$PUBLIC_IP" =~ ^[0-9]+(\.[0-9]+){3}$ ]] && break
        PUBLIC_IP=""
    done
fi
echo
[[ "$NAME" != snailycad ]] && echo -e "Install name: ${BOLD}$NAME${NC}"
case "$METHOD" in
    docker) echo -e "Install method: ${BOLD}Docker${NC}" ;;
    standalone) echo -e "Install method: ${BOLD}Ubuntu (standalone, Node.js)${NC}" ;;
esac
echo -e "${BOLD}SnailyCAD setup wizard is running. Open one of these links in your browser:${NC}"
echo
if [[ -n "$PUBLIC_IP" ]]; then
    echo -e "    Public (internet):   ${GREEN}http://${PUBLIC_IP}:${WIZARD_PORT}/?token=${TOKEN}${NC}"
fi
if [[ -n "$LOCAL_IP" && "$LOCAL_IP" != "$PUBLIC_IP" ]]; then
    echo -e "    Local network:       ${GREEN}http://${LOCAL_IP}:${WIZARD_PORT}/?token=${TOKEN}${NC}"
fi
echo -e "    On this machine:     ${GREEN}http://localhost:${WIZARD_PORT}/?token=${TOKEN}${NC}"
if [[ -n "$PUBLIC_IP" && -n "$LOCAL_IP" && "$LOCAL_IP" != "$PUBLIC_IP" ]]; then
    echo
    echo "The public link needs port $WIZARD_PORT forwarded to this machine (router / cloud firewall)."
fi
echo
echo "Everything lives in $INSTALL_DIR. To remove it all again:"
echo "    sudo bash $INSTALL_DIR/uninstall.sh"
echo
