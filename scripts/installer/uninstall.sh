#!/bin/bash
# Removes a SnailyCAD install made by scripts/installer/install.sh, using the manifest it kept of
# everything it added outside the install folder. Copied to <install folder>/uninstall.sh.
#
# usage: sudo bash /opt/snailycad/uninstall.sh [--yes]
set -uo pipefail

# everything runs from main(), which bash parses fully before this script deletes its own folder
main() {
    [[ $EUID -eq 0 ]] || { echo "Run this as root (e.g. with sudo)." >&2; exit 1; }

    local dir manifest
    dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    manifest="$dir/installer/manifest.env"
    [[ -f "$manifest" ]] || { echo "No installer manifest in $dir; is this a SnailyCAD install folder?" >&2; exit 1; }

    local NAME="" INSTALL_DIR="" SERVICE="" CAD_SERVICE="" DB_NAME="" DB_USER="" DB_ADMIN="" APT_MARIADB=""
    local -a UFW_PORTS=() APT_PACKAGES=()
    local key value
    while IFS='=' read -r key value; do
        case "$key" in
            NAME) NAME="$value" ;;
            INSTALL_DIR) INSTALL_DIR="$value" ;;
            SERVICE) SERVICE="$value" ;;
            CAD_SERVICE) CAD_SERVICE="$value" ;;
            DB_NAME) DB_NAME="$value" ;;
            DB_USER) DB_USER="$value" ;;
            DB_ADMIN) DB_ADMIN="$value" ;;
            UFW_PORT) UFW_PORTS+=("$value") ;;
            APT_PACKAGE) APT_PACKAGES+=("$value") ;;
            APT_MARIADB) APT_MARIADB="$value" ;;
        esac
    done < "$manifest"

    [[ "$INSTALL_DIR" == "$dir" ]] || { echo "Manifest is for $INSTALL_DIR, not $dir. Stopping." >&2; exit 1; }

    echo "This permanently removes:"
    echo "  - $INSTALL_DIR (the CAD, its build, Node.js copy and logs)"
    [[ -n "$CAD_SERVICE" ]] && echo "  - systemd service $CAD_SERVICE"
    [[ -n "$DB_NAME" ]] && echo "  - database $DB_NAME and MySQL user $DB_USER (all CAD data)"
    [[ ${#UFW_PORTS[@]} -gt 0 ]] && echo "  - firewall rules for port(s) ${UFW_PORTS[*]}"
    [[ "$APT_MARIADB" == 1 ]] && echo "  - the MariaDB server it installed (and every database in it)"
    [[ ${#APT_PACKAGES[@]} -gt 0 ]] && echo "  - package(s) ${APT_PACKAGES[*]}"
    if [[ "${1:-}" != "--yes" ]]; then
        local answer
        read -r -p "Continue? [y/N] " answer < /dev/tty
        [[ "$answer" == [yY]* ]] || { echo "Cancelled."; exit 0; }
    fi

    if [[ -n "$SERVICE" ]]; then
        systemctl stop "$SERVICE" 2>/dev/null
    fi
    if [[ -n "$CAD_SERVICE" ]]; then
        echo "[*] Removing service $CAD_SERVICE..."
        systemctl disable --now "$CAD_SERVICE" 2>/dev/null
        rm -f "/etc/systemd/system/$CAD_SERVICE.service"
        systemctl daemon-reload
        systemctl reset-failed "$CAD_SERVICE" 2>/dev/null
    fi
    # the CAD's start script also runs a status page server from the install folder
    pkill -f "$INSTALL_DIR/app/" 2>/dev/null

    if [[ -n "$DB_NAME" && "$APT_MARIADB" != 1 && "$DB_ADMIN" == socket ]]; then
        echo "[*] Dropping database $DB_NAME and user $DB_USER..."
        mysql -uroot -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; DROP USER IF EXISTS '$DB_USER'@'localhost'; DROP USER IF EXISTS '$DB_USER'@'127.0.0.1';" \
            || echo "[!] Could not drop the database; remove it by hand." >&2
    elif [[ -n "$DB_NAME" && "$APT_MARIADB" != 1 ]]; then
        echo "[!] The database $DB_NAME is on a server this installer did not manage; drop it there yourself." >&2
    fi

    if [[ "$APT_MARIADB" == 1 ]]; then
        echo "[*] Removing MariaDB..."
        systemctl stop mariadb 2>/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get purge -y -qq 'mariadb-server*' 'mariadb-client*' >/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq >/dev/null
        rm -rf /var/lib/mysql /etc/mysql/mariadb.conf.d
    fi
    if [[ ${#APT_PACKAGES[@]} -gt 0 ]]; then
        echo "[*] Removing ${APT_PACKAGES[*]}..."
        DEBIAN_FRONTEND=noninteractive apt-get purge -y -qq "${APT_PACKAGES[@]}" >/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq >/dev/null
    fi

    local port
    for port in "${UFW_PORTS[@]}"; do
        ufw delete allow "$port/tcp" >/dev/null 2>&1
    done

    echo "[*] Deleting $INSTALL_DIR..."
    cd /
    rm -rf --one-file-system "$INSTALL_DIR"
    echo "[*] Done. SnailyCAD ($NAME) is gone."
}

main "$@"
exit
