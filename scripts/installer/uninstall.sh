#!/bin/bash
# Removes a SnailyCAD install made by scripts/installer/install.sh, using the manifest it kept of
# everything it added outside the install folder. Copied to <install folder>/uninstall.sh.
#
# usage: sudo bash /opt/snailycad/uninstall.sh [--yes] [--keep=<item>,<item>...]
#
#   --yes     don't ask before removing
#   --keep    leave these in place (comma-separated). Admin > Dashboard > Danger zone passes the
#             items you untick there:
#               database   the CAD's database and MySQL user (all CAD data)
#               db-server  the MariaDB / PostgreSQL server the wizard installed (keeping the database
#                          keeps it too)
#               docker     Docker itself, when the wizard installed it
#               runtime    the private Node.js + pnpm in <install folder>/runtime
#               caches     pnpm's package store, npm's cache and Prisma's engine cache in root's home
#               firewall   the ufw rules the wizard opened
#               pkg:<name> one apt package the wizard installed, e.g. pkg:git
set -uo pipefail

# everything runs from main(), which bash parses fully before this script deletes its own folder
main() {
    [[ $EUID -eq 0 ]] || { echo "Run this as root (e.g. with sudo)." >&2; exit 1; }

    local assume_yes="" keep_list="" arg
    for arg in "$@"; do
        case "$arg" in
            --yes) assume_yes=1 ;;
            --keep=*) keep_list="${arg#--keep=}" ;;
            *) echo "Unknown option: $arg" >&2; exit 1 ;;
        esac
    done
    keeping() { [[ ",$keep_list," == *",$1,"* ]]; }

    local dir manifest
    dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    manifest="$dir/installer/manifest.env"
    [[ -f "$manifest" ]] || { echo "No installer manifest in $dir; is this a SnailyCAD install folder?" >&2; exit 1; }

    local NAME="" INSTALL_DIR="" SERVICE="" CAD_SERVICE="" CONTROL_SERVICE="" DB_NAME="" DB_USER="" DB_ADMIN="" APT_MARIADB=""
    local DOCKER_PROJECT="" DOCKER_NETWORK="" APT_DOCKER="" DB_ENGINE="" APT_POSTGRES=""
    local DOCKER_COMPOSE_FILE="production.docker-compose.yml"
    local -a UFW_PORTS=() APT_PACKAGES=()
    local key value
    while IFS='=' read -r key value; do
        case "$key" in
            NAME) NAME="$value" ;;
            INSTALL_DIR) INSTALL_DIR="$value" ;;
            SERVICE) SERVICE="$value" ;;
            CAD_SERVICE) CAD_SERVICE="$value" ;;
            CONTROL_SERVICE) CONTROL_SERVICE="$value" ;;
            DB_NAME) DB_NAME="$value" ;;
            DB_USER) DB_USER="$value" ;;
            DB_ADMIN) DB_ADMIN="$value" ;;
            UFW_PORT) UFW_PORTS+=("$value") ;;
            APT_PACKAGE) keeping "pkg:$value" || APT_PACKAGES+=("$value") ;;
            APT_MARIADB) APT_MARIADB="$value" ;;
            DOCKER_PROJECT) DOCKER_PROJECT="$value" ;;
            DOCKER_NETWORK) DOCKER_NETWORK="$value" ;;
            APT_DOCKER) APT_DOCKER="$value" ;;
            DB_ENGINE) DB_ENGINE="$value" ;;
            APT_POSTGRES) APT_POSTGRES="$value" ;;
            DOCKER_COMPOSE_FILE) DOCKER_COMPOSE_FILE="$value" ;;
        esac
    done < "$manifest"

    [[ "$INSTALL_DIR" == "$dir" ]] || { echo "Manifest is for $INSTALL_DIR, not $dir. Stopping." >&2; exit 1; }

    # other SnailyCAD installs on this server share what the first one installed: the database
    # server, Docker, apt packages and download caches stay while any of them is left
    local -a others=()
    local other
    for other in /opt/*/installer/manifest.env; do
        [[ -f "$other" ]] || continue
        other="$(dirname "$(dirname "$other")")"
        [[ "$other" == "$dir" ]] || others+=("$other")
    done
    if [[ ${#others[@]} -gt 0 ]]; then
        echo "Other SnailyCAD installs on this server: ${others[*]}"
        echo "Keeping what they share: the database server, Docker, packages and caches."
        keep_list="${keep_list:+$keep_list,}db-server,docker,caches"
        APT_PACKAGES=()
    fi

    # what to remove. Removing the MariaDB server takes every database in it, so keeping the
    # CAD's database keeps the server too.
    local drop_db="" remove_mariadb="" remove_postgres="" remove_docker="" remove_runtime=1 remove_caches=1 remove_firewall=1
    [[ -n "$DB_NAME" ]] && ! keeping database && drop_db=1
    [[ "$APT_MARIADB" == 1 ]] && ! keeping db-server && ! keeping database && remove_mariadb=1
    [[ "$APT_POSTGRES" == 1 ]] && ! keeping db-server && ! keeping database && remove_postgres=1
    local remove_db_server="$remove_mariadb$remove_postgres"
    [[ "$APT_DOCKER" == 1 ]] && ! keeping docker && remove_docker=1
    keeping runtime && remove_runtime=""
    keeping caches && remove_caches=""
    keeping firewall && remove_firewall=""
    [[ ${#UFW_PORTS[@]} -eq 0 ]] && remove_firewall=""

    # pnpm's store lives outside the install folder; ask the CAD's own pnpm where, before it's gone
    local -a cache_dirs=()
    if [[ -n "$remove_caches" ]]; then
        local pnpm_bin="$INSTALL_DIR/runtime/node/bin/pnpm" store
        if [[ -x "$pnpm_bin" ]]; then
            store=$(PATH="$INSTALL_DIR/runtime/node/bin:$PATH" HOME=/root "$pnpm_bin" store path 2>/dev/null)
            [[ -n "$store" && "$store" == /root/* ]] && cache_dirs+=("$store")
        fi
        cache_dirs+=(/root/.npm /root/.cache/prisma /root/.cache/node/corepack)
    fi

    echo "This permanently removes:"
    if [[ -n "$remove_runtime" ]]; then
        echo "  - $INSTALL_DIR (the CAD, its build, Node.js + pnpm and logs)"
    else
        echo "  - $INSTALL_DIR except runtime/ (Node.js + pnpm are kept)"
    fi
    [[ -n "$CAD_SERVICE" ]] && echo "  - systemd service $CAD_SERVICE"
    [[ -n "$CONTROL_SERVICE" ]] && echo "  - systemd service $CONTROL_SERVICE (the Control Panel)"
    [[ -n "$DOCKER_PROJECT" ]] && echo "  - Docker containers, images and data of project $DOCKER_PROJECT"
    [[ -n "$DOCKER_NETWORK" ]] && echo "  - Docker network $DOCKER_NETWORK"
    [[ -n "$remove_docker" ]] && echo "  - Docker itself (it was installed by the wizard), with all its data"
    [[ -n "$drop_db" ]] && echo "  - database $DB_NAME and database user $DB_USER (all CAD data)"
    [[ -n "$remove_firewall" ]] && echo "  - firewall rules for port(s) ${UFW_PORTS[*]}"
    [[ -n "$remove_mariadb" ]] && echo "  - the MariaDB server it installed (and every database in it)"
    [[ -n "$remove_postgres" ]] && echo "  - the PostgreSQL server it installed (and every database in it)"
    [[ ${#APT_PACKAGES[@]} -gt 0 ]] && echo "  - package(s) ${APT_PACKAGES[*]}"
    [[ ${#cache_dirs[@]} -gt 0 ]] && echo "  - download caches: ${cache_dirs[*]}"
    [[ -n "$keep_list" ]] && echo "Keeping: ${keep_list//,/, }"
    if [[ -z "$assume_yes" ]]; then
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
    if [[ -n "$CONTROL_SERVICE" ]]; then
        echo "[*] Removing service $CONTROL_SERVICE..."
        systemctl disable --now "$CONTROL_SERVICE" 2>/dev/null
        rm -f "/etc/systemd/system/$CONTROL_SERVICE.service"
        systemctl daemon-reload
        systemctl reset-failed "$CONTROL_SERVICE" 2>/dev/null
    fi
    # the CAD's start script also runs a status page server from the install folder; without
    # systemd the wizard runs under nohup
    pkill -f "$INSTALL_DIR/app/" 2>/dev/null
    pkill -f "$INSTALL_DIR/installer/wizard-server.py" 2>/dev/null
    pkill -f "$INSTALL_DIR/installer/control-server.py" 2>/dev/null

    if [[ -n "$DOCKER_PROJECT" ]] && command -v docker >/dev/null 2>&1; then
        echo "[*] Removing Docker containers, images and volumes of $DOCKER_PROJECT..."
        if [[ -f "$INSTALL_DIR/app/$DOCKER_COMPOSE_FILE" ]]; then
            (cd "$INSTALL_DIR/app" && docker compose -p "$DOCKER_PROJECT" -f "$DOCKER_COMPOSE_FILE" \
                down --rmi all --volumes --remove-orphans)
        fi
    fi
    if [[ -n "$DOCKER_NETWORK" ]] && command -v docker >/dev/null 2>&1; then
        docker network rm "$DOCKER_NETWORK" >/dev/null 2>&1 \
            || echo "[!] Docker network $DOCKER_NETWORK is still used by other containers; left in place." >&2
    fi

    if [[ -n "$drop_db" && -z "$remove_db_server" && "$DB_ADMIN" == socket && "$DB_ENGINE" == postgresql ]]; then
        echo "[*] Dropping PostgreSQL database $DB_NAME and user $DB_USER..."
        (cd /tmp && runuser -u postgres -- psql -q -v ON_ERROR_STOP=1 \
            -c "DROP DATABASE IF EXISTS \"$DB_NAME\" WITH (FORCE)" -c "DROP ROLE IF EXISTS \"$DB_USER\"") \
            || echo "[!] Could not drop the database; remove it by hand." >&2
    elif [[ -n "$drop_db" && -z "$remove_db_server" && "$DB_ADMIN" == socket ]]; then
        echo "[*] Dropping database $DB_NAME and user $DB_USER..."
        mysql -uroot -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; DROP USER IF EXISTS '$DB_USER'@'localhost'; DROP USER IF EXISTS '$DB_USER'@'127.0.0.1';" \
            || echo "[!] Could not drop the database; remove it by hand." >&2
    elif [[ -n "$drop_db" && -z "$remove_db_server" ]]; then
        echo "[!] The database $DB_NAME is on a server this installer did not manage; drop it there yourself." >&2
    elif [[ -n "$DB_NAME" && -z "$drop_db" ]]; then
        echo "[*] Keeping database $DB_NAME and user $DB_USER."
    fi

    if [[ -n "$remove_mariadb" ]]; then
        echo "[*] Removing MariaDB..."
        systemctl stop mariadb 2>/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get purge -y -qq 'mariadb-server*' 'mariadb-client*' >/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq >/dev/null
        rm -rf /var/lib/mysql /etc/mysql/mariadb.conf.d
    fi
    if [[ -n "$remove_postgres" ]]; then
        echo "[*] Removing PostgreSQL..."
        systemctl stop postgresql 2>/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get purge -y -qq 'postgresql*' >/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get autoremove -y -qq >/dev/null
        rm -rf /var/lib/postgresql /etc/postgresql /var/log/postgresql
    fi
    if [[ -n "$remove_docker" ]]; then
        systemctl stop docker.socket docker containerd 2>/dev/null
    fi
    if [[ ${#APT_PACKAGES[@]} -gt 0 ]]; then
        echo "[*] Removing ${APT_PACKAGES[*]}..."
        DEBIAN_FRONTEND=noninteractive apt-get purge -y -qq "${APT_PACKAGES[@]}" >/dev/null
        DEBIAN_FRONTEND=noninteractive apt-get autoremove --purge -y -qq >/dev/null
    fi
    if [[ -n "$remove_docker" ]]; then
        rm -rf /var/lib/docker /var/lib/containerd /etc/docker
        ip link delete docker0 2>/dev/null
    fi

    local port
    if [[ -n "$remove_firewall" ]]; then
        for port in "${UFW_PORTS[@]}"; do
            ufw delete allow "$port/tcp" >/dev/null 2>&1
        done
    fi

    local cache
    for cache in "${cache_dirs[@]}"; do
        if [[ -e "$cache" ]]; then
            echo "[*] Deleting $cache..."
            rm -rf --one-file-system "$cache"
        fi
    done

    cd /
    if [[ -n "$remove_runtime" ]]; then
        echo "[*] Deleting $INSTALL_DIR..."
        rm -rf --one-file-system "$INSTALL_DIR"
    else
        echo "[*] Deleting $INSTALL_DIR (keeping runtime/)..."
        find "$INSTALL_DIR" -mindepth 1 -maxdepth 1 ! -name runtime -exec rm -rf --one-file-system {} +
    fi
    echo "[*] Done. SnailyCAD ($NAME) is gone."
}

main "$@"
exit
