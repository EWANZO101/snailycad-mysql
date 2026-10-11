#!/bin/bash
# One-click CAD update, started from Admin > Dashboard > Update CAD.
#
# UPDATE_MODE=git (default): the standalone update method from
#   https://docs.snailycad.org/docs/installations/updating/methods/standalone
#   (stash local changes, pull origin/main), then restarts the service, whose start script
#   installs dependencies, builds and starts the CAD.
# UPDATE_MODE=docker: the Docker update method from
#   https://docs.snailycad.org/docs/installations/updating/methods/docker
#   (stash, pull, build the images while the old containers keep running, then `up -d`).
#   Must run on the Docker host, not inside a container.
# UPDATE_MODE=local: no pull. Restarts the service so the latest local build is applied.
#
# Progress is written to the status page (STATUS_FILE) when it exists.
set -u

PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVICE_NAME="${SNAILYCAD_SERVICE_NAME:-start-snaily-cadv4}"
if [[ -n "${SNAILY_STATUS_DIR:-}" ]]; then
    STATUS_DIR="$SNAILY_STATUS_DIR"
elif [[ -d /var/www/snaily-status ]]; then
    STATUS_DIR=/var/www/snaily-status
else
    STATUS_DIR="$PROJECT_DIR/.snaily-cache/status"
fi
mkdir -p "$STATUS_DIR" 2>/dev/null || true
STATUS_FILE="$STATUS_DIR/status.json"
UPDATE_MODE="${UPDATE_MODE:-git}"
COMPOSE_FILE="${UPDATE_COMPOSE_FILE:-production.docker-compose.yml}"
BRANCH="${UPDATE_BRANCH:-main}"
LOG_FILE="$PROJECT_DIR/start.log"
STARTED_AT=$(date +%s)

log() { echo "[*] [update] $1" >> "$LOG_FILE"; }
fail() {
    echo "[x] [update] $1" >> "$LOG_FILE"
    status failed
    exit 1
}

status() {
    local dir
    dir=$(dirname "$STATUS_FILE")
    [[ -d "$dir" ]] || return 0
    printf '{"phase":"%s","startedAt":%s,"phaseStartedAt":%s,"estimatedSeconds":%s}\n' \
        "$1" "$STARTED_AT" "$(date +%s)" "${2:-420}" > "$STATUS_FILE.tmp" && mv -f "$STATUS_FILE.tmp" "$STATUS_FILE"
}

cd "$PROJECT_DIR" || fail "Project directory not found."
status preparing

# live log for the status page (scripts/status-server.mjs). The CAD still owns the client port at
# this point, so it only publishes the log until start.sh takes over.
STATUS_SERVER="$PROJECT_DIR/scripts/status-server.mjs"
if [[ -f "$STATUS_SERVER" ]] && command -v node >/dev/null 2>&1; then
    pkill -f "$PROJECT_DIR/scripts/status-server.mjs" 2>/dev/null || true
    node "$STATUS_SERVER" --status "$STATUS_FILE" --log "$LOG_FILE" \
        --out "$(dirname "$STATUS_FILE")/log.json" --port "${PORT_CLIENT:-3000}" >/dev/null 2>&1 &
    sleep 1
fi

log "Update started (mode: $UPDATE_MODE)."

pull_latest() {
    command -v git >/dev/null 2>&1 || fail "git is not installed."

    if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
        log "Saving local changes with git stash."
        git stash push -m "pre-update-$(date +%F-%H%M%S)" >> "$LOG_FILE" 2>&1 || fail "Could not stash local changes."
    fi

    log "Pulling the latest version from origin/$BRANCH."
    git fetch origin "$BRANCH" >> "$LOG_FILE" 2>&1 || fail "Could not reach the git remote."
    git pull --ff-only origin "$BRANCH" >> "$LOG_FILE" 2>&1 \
        || fail "Could not fast-forward to origin/$BRANCH (local commits?). Update manually."
    log "Now at $(git rev-parse --short HEAD)."
}

if [[ "$UPDATE_MODE" == "docker" ]]; then
    [[ -f /.dockerenv ]] && fail "Docker updates must run on the host, not inside a container."
    command -v docker >/dev/null 2>&1 || fail "docker is not installed."
    pull_latest
    status building
    log "Building the Docker images ($COMPOSE_FILE)."
    docker compose -f "$COMPOSE_FILE" build >> "$LOG_FILE" 2>&1 || fail "docker compose build failed."
    status starting
    log "Starting the updated containers."
    docker compose -f "$COMPOSE_FILE" up -d >> "$LOG_FILE" 2>&1 || fail "docker compose up failed."
    log "Update finished."
    status running
    exit 0
fi

if [[ "$UPDATE_MODE" == "git" ]]; then
    pull_latest
else
    log "Local mode: applying the latest local build."
fi

log "Restarting $SERVICE_NAME (installs, builds and starts when needed)."
systemctl restart "$SERVICE_NAME" || fail "Could not restart $SERVICE_NAME."
