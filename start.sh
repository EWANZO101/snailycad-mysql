#!/bin/bash
# SnailyCAD start script.
#
# Only reinstalls dependencies when pnpm-lock.yaml (or the Node.js major
# version) changed, and only rebuilds when build-relevant sources changed since
# the last successful build. See sh/docs/SYSTEM-REQUIREMENTS.md.
#
# Usage: ./start.sh [--force-build] [--force-install] [--no-build] [--help]
# Original script backups: sh/start.sh.bak, sh/start.sh.bak2
set -e
set -o pipefail

# Colors for better readability
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
NC="\033[0m" # No Color

# Function to print status messages
log() {
    echo -e "${GREEN}[*]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[!]${NC} $1"
}

error_exit() {
    echo -e "${RED}[x]${NC} $1" >&2
    write_status failed
    exit 1
}

# project folder: where this script lives (override with PROJECT_DIR)
PROJECT_DIR="${PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"

# --- Status page --------------------------------------------------------------
# While the CAD installs/builds/restarts, scripts/status-server.mjs serves a progress page with a
# live (filtered) log on PORT_CLIENT. Set SNAILY_STATUS_DIR (e.g. /var/www/snaily-status) to also
# write the status files where nginx can serve them as a fallback page.
if [[ -n "${SNAILY_STATUS_DIR:-}" ]]; then
    STATUS_DIR="$SNAILY_STATUS_DIR"
else
    STATUS_DIR="$PROJECT_DIR/.snaily-cache/status"
fi
mkdir -p "$STATUS_DIR" 2>/dev/null || true
STATUS_FILE="$STATUS_DIR/status.json"
LOG_FILE="${SNAILY_LOG_FILE:-$PROJECT_DIR/start.log}"
STATUS_SERVER_PID=""
if [[ -z "${PORT_CLIENT:-}" && -f "$PROJECT_DIR/.env" ]]; then
    PORT_CLIENT=$(grep -E '^[[:space:]]*PORT_CLIENT[[:space:]]*=' "$PROJECT_DIR/.env" | tail -1 | cut -d= -f2- | tr -d "\"' ")
fi
PORT_CLIENT="${PORT_CLIENT:-3000}"
DEPLOY_STARTED_AT=$(date +%s)
DEFAULT_ESTIMATE_SECONDS=420

estimated_seconds() {
    local f="$PROJECT_DIR/.snaily-cache/last-deploy-seconds"
    if [[ -f "$f" ]] && [[ "$(cat "$f")" =~ ^[0-9]+$ ]]; then
        cat "$f"
    else
        echo "$DEFAULT_ESTIMATE_SECONDS"
    fi
}

write_status() {
    local phase="$1" estimate="${2:-$(estimated_seconds)}"
    local dir tmp
    dir=$(dirname "$STATUS_FILE")
    [[ -d "$dir" ]] || return 0
    tmp="$STATUS_FILE.$$.tmp"
    printf '{"phase":"%s","startedAt":%s,"phaseStartedAt":%s,"estimatedSeconds":%s}\n' \
        "$phase" "$DEPLOY_STARTED_AT" "$(date +%s)" "$estimate" > "$tmp" 2>/dev/null \
        && chmod 644 "$tmp" && mv -f "$tmp" "$STATUS_FILE"
    return 0
}

# keeps a copy of this script's output in $LOG_FILE (systemd may already append to it)
ensure_log_file() {
    local current
    current=$(readlink -f /proc/$$/fd/1 2>/dev/null || true)
    if [[ "$current" != "$(readlink -f "$LOG_FILE" 2>/dev/null || echo "$LOG_FILE")" ]]; then
        exec > >(tee -a "$LOG_FILE") 2>&1
    fi
}

# progress page + live log on the client port while the CAD isn't running
start_status_server() {
    local server="$PROJECT_DIR/scripts/status-server.mjs" page="$PROJECT_DIR/scripts/status-page/index.html"
    [[ -f "$server" ]] || return 0
    command -v node >/dev/null 2>&1 || return 0

    # keep nginx's fallback copy of the page in sync
    if [[ "$STATUS_DIR" == /var/www/* && -f "$page" ]]; then
        cp -f "$page" "$STATUS_DIR/building.html" 2>/dev/null || true
    fi

    pkill -f "$PROJECT_DIR/scripts/status-server.mjs" 2>/dev/null || true
    node "$server" --status "$STATUS_FILE" --log "$LOG_FILE" --out "$STATUS_DIR/log.json" \
        --port "${PORT_CLIENT:-3000}" --page "$page" >/dev/null 2>&1 &
    STATUS_SERVER_PID=$!
}

# frees the client port right before the CAD starts (the server keeps publishing the log)
release_status_port() {
    [[ -n "$STATUS_SERVER_PID" ]] || return 0
    kill -USR1 "$STATUS_SERVER_PID" 2>/dev/null || return 0
    for _ in $(seq 1 20); do
        if ! (exec 3<>"/dev/tcp/127.0.0.1/${PORT_CLIENT:-3000}") 2>/dev/null; then
            return 0
        fi
        sleep 0.25
    done
}

# marks the status as running once the client answers, without blocking startup
mark_running_when_up() {
    (
        for _ in $(seq 1 180); do
            if curl -s -o /dev/null -m 3 "http://127.0.0.1:${PORT_CLIENT:-3000}/auth/login"; then
                write_status running
                exit 0
            fi
            sleep 5
        done
    ) &
}

usage() {
    cat <<'EOF'
Usage: ./start.sh [options]

  --force-build     Rebuild even if no source changes were detected.
  --force-install   Run "pnpm install" even if pnpm-lock.yaml is unchanged.
  --no-build        Never build; start the existing build (fails if none exists).
  -h, --help        Show this help.

Environment:
  SNAILY_BUILD_HEAP_MB   Override the Node.js heap size (MB) used for install/build.
EOF
}

CACHE_DIR="$PROJECT_DIR/.snaily-cache"
INSTALL_STAMP="$CACHE_DIR/install.sha256"
BUILD_STAMP="$CACHE_DIR/build.sha256"

FORCE_BUILD=0
FORCE_INSTALL=0
NO_BUILD=0

# Paths whose changes require a rebuild (relative to PROJECT_DIR).
BUILD_PATHS=(apps packages scripts package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json)

parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --force-build) FORCE_BUILD=1 ;;
            --force-install) FORCE_INSTALL=1 ;;
            --no-build) NO_BUILD=1 ;;
            -h|--help) usage; exit 0 ;;
            *) usage >&2; error_exit "Unknown option: $1" ;;
        esac
        shift
    done
    if [[ $FORCE_BUILD -eq 1 && $NO_BUILD -eq 1 ]]; then
        error_exit "--force-build and --no-build cannot be used together."
    fi
}

sha_stdin() {
    sha256sum | cut -d' ' -f1
}

# --- System resources -------------------------------------------------------

detect_resources() {
    MEM_MB=0
    SWAP_MB=0
    if [[ -r /proc/meminfo ]]; then
        MEM_MB=$(awk '/^MemTotal:/ {print int($2/1024)}' /proc/meminfo)
        SWAP_MB=$(awk '/^SwapTotal:/ {print int($2/1024)}' /proc/meminfo)
    fi
    CPUS=$(nproc 2>/dev/null || getconf _NPROCESSORS_ONLN 2>/dev/null || echo 0)

    if [[ $MEM_MB -gt 0 ]]; then
        log "System: ${CPUS} CPU(s), ${MEM_MB} MB RAM, ${SWAP_MB} MB swap."
    else
        warn "Could not read /proc/meminfo; skipping memory checks."
    fi

    # A "2 GB" VPS usually reports ~1.9 GB MemTotal, hence the 1800 MB threshold.
    if [[ $MEM_MB -gt 0 && $MEM_MB -lt 1800 ]]; then
        warn "Less than 2 GB RAM detected (${MEM_MB} MB). SnailyCAD requires at least 2 GB."
    fi
    if [[ $CPUS -gt 0 && $CPUS -lt 2 ]]; then
        warn "Only ${CPUS} CPU detected. SnailyCAD requires at least 2 vCPUs; builds will be slow."
    fi
    if [[ $MEM_MB -gt 0 && $MEM_MB -lt 3800 ]] && pgrep -x postgres >/dev/null 2>&1; then
        warn "PostgreSQL runs on this machine with less than 4 GB RAM (${MEM_MB} MB). 4 GB is recommended."
    fi

    # Heap limit for install/build. A cap, not a reservation.
    if [[ -n "${SNAILY_BUILD_HEAP_MB:-}" ]]; then
        BUILD_HEAP_MB="$SNAILY_BUILD_HEAP_MB"
    elif [[ $MEM_MB -eq 0 ]]; then
        BUILD_HEAP_MB=2048
    elif [[ $MEM_MB -lt 3000 ]]; then
        BUILD_HEAP_MB=1536
    elif [[ $MEM_MB -lt 6000 ]]; then
        BUILD_HEAP_MB=2048
    else
        BUILD_HEAP_MB=4096
    fi

    # Respect a heap size the user already set in NODE_OPTIONS.
    if [[ "${NODE_OPTIONS:-}" == *max-old-space-size* ]]; then
        BUILD_NODE_OPTIONS="$NODE_OPTIONS"
    else
        BUILD_NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=${BUILD_HEAP_MB}"
    fi
}

warn_if_build_may_oom() {
    if [[ $MEM_MB -gt 0 && $((MEM_MB + SWAP_MB)) -lt 3800 ]]; then
        warn "RAM + swap is only $((MEM_MB + SWAP_MB)) MB. The build may be killed (OOM)."
        warn "Add at least 2 GB of swap; see sh/docs/SYSTEM-REQUIREMENTS.md."
    fi
}

# --- Install ----------------------------------------------------------------

install_hash() {
    {
        echo "node-major:$(node -p 'process.versions.node.split(".")[0]')"
        sha256sum < pnpm-lock.yaml
    } | sha_stdin
}

maybe_install() {
    [[ -f pnpm-lock.yaml ]] || error_exit "pnpm-lock.yaml not found in $PROJECT_DIR."

    local current previous=""
    current=$(install_hash)
    [[ -f "$INSTALL_STAMP" ]] && previous=$(cat "$INSTALL_STAMP")

    if [[ $FORCE_INSTALL -eq 0 && -d node_modules && "$current" == "$previous" ]]; then
        log "pnpm-lock.yaml unchanged; skipping dependency install."
        return 0
    fi

    write_status installing
    log "Installing dependencies with pnpm..."
    # --frozen-lockfile: trust pnpm-lock.yaml as committed instead of re-resolving it against the
    # registry (faster on a fresh clone, where it always matches package.json anyway) - the same
    # flag the Docker image's install already uses. If pnpm-lock.yaml and package.json ever drift
    # (e.g. a hand edit), this now fails loudly instead of silently rewriting the lockfile; run
    # `pnpm install` manually (or ./start.sh --force-install) to repair it.
    NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm install --frozen-lockfile --prefer-offline \
        || error_exit "Failed to install dependencies."

    install_hash > "$INSTALL_STAMP"
}

# --- Build ------------------------------------------------------------------

# Only env vars that are baked into the build trigger a rebuild.
build_env_lines() {
    local f
    for f in .env apps/client/.env; do
        if [[ -f "$f" ]]; then
            echo "env-file:$f"
            grep -E '^[[:space:]]*(export[[:space:]]+)?(NEXT_PUBLIC_[A-Z0-9_]*|NODE_ENV|SENTRY_[A-Z0-9_]*)[[:space:]]*=' "$f" || true
        fi
    done
}

build_hash() {
    {
        echo "head:$(git rev-parse HEAD)"
        echo "node-major:$(node -p 'process.versions.node.split(".")[0]')"
        echo "lock:$(sha256sum < pnpm-lock.yaml)"
        # Contents of every modified, deleted or untracked (non-ignored) file.
        git ls-files -m -o --exclude-standard -z -- "${BUILD_PATHS[@]}" \
            | sort -zu \
            | while IFS= read -r -d '' f; do
                if [[ -f "$f" ]]; then
                    echo "file:$f:$(sha256sum < "$f")"
                else
                    echo "deleted:$f"
                fi
            done
        build_env_lines
    } | sha_stdin
}

build_outputs_exist() {
    [[ -f apps/client/.next/BUILD_ID && -f apps/api/dist/main.js ]]
}

# Fallback when this is not a git checkout: any source newer than the stamp.
sources_newer_than_stamp() {
    [[ -f "$BUILD_STAMP" ]] || return 0
    local newer
    newer=$(find apps packages scripts package.json pnpm-lock.yaml .env \
        \( -name node_modules -o -name .next -o -name dist -o -name .turbo \) -prune -o \
        -type f -newer "$BUILD_STAMP" -print -quit 2>/dev/null || true)
    [[ -n "$newer" ]]
}

maybe_build() {
    if [[ $NO_BUILD -eq 1 ]]; then
        build_outputs_exist || error_exit "--no-build given but no existing build was found."
        log "--no-build given; starting the existing build."
        return 0
    fi

    local use_git=0 current="" previous="" reason=""
    if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        use_git=1
        current=$(build_hash)
        [[ -f "$BUILD_STAMP" ]] && previous=$(cat "$BUILD_STAMP")
    fi

    if [[ $FORCE_BUILD -eq 1 ]]; then
        reason="--force-build given"
    elif ! build_outputs_exist; then
        reason="no existing build output"
    elif [[ $use_git -eq 1 && "$current" != "$previous" ]]; then
        reason="source changes detected"
    elif [[ $use_git -eq 0 ]] && sources_newer_than_stamp; then
        reason="source files newer than last build"
    fi

    if [[ -z "$reason" ]]; then
        log "No source changes since the last successful build; skipping build (use --force-build to override)."
        return 0
    fi

    warn_if_build_may_oom
    write_status building
    log "Building the project (${reason}; Node heap limit: ${BUILD_NODE_OPTIONS})..."
    NODE_OPTIONS="$BUILD_NODE_OPTIONS" pnpm run build || error_exit "Failed to build the project."
    BUILT_THIS_RUN=1

    # Store the pre-build hash: a change made while building is rebuilt next time.
    if [[ $use_git -eq 1 ]]; then
        echo "$current" > "$BUILD_STAMP"
    else
        date +%s > "$BUILD_STAMP"
    fi
}

# Function to deploy the project
deploy_project() {
    log "Starting project deployment..."

    if [[ ! -d "$PROJECT_DIR" ]]; then
        error_exit "Directory $PROJECT_DIR not found or inaccessible."
    fi

    cd "$PROJECT_DIR" || error_exit "Failed to change directory to $PROJECT_DIR."

    # Ensure git and pnpm are available
    command -v git >/dev/null 2>&1 || error_exit "git not found. Please install git."
    command -v pnpm >/dev/null 2>&1 || error_exit "pnpm not found. Please install pnpm."
    command -v node >/dev/null 2>&1 || error_exit "node not found. Please install Node.js."
    command -v sha256sum >/dev/null 2>&1 || error_exit "sha256sum not found. Please install coreutils."

    mkdir -p "$CACHE_DIR" || error_exit "Failed to create cache directory $CACHE_DIR."

    export NEXT_TELEMETRY_DISABLED=1
    detect_resources

    # Git sync disabled so local edits survive restarts (backup: sh/start.sh.bak)
#   # Git operations
#   log "Stashing any local changes..."
#   git stash save "pre-deploy-$(date +%F-%T)" >/dev/null 2>&1 || warn "No changes to stash."

#   log "Fetching latest changes from origin/main..."
#   git fetch origin main || error_exit "Failed to fetch from git."

#   log "Pulling latest changes..."
#   git reset --hard origin/main || error_exit "Failed to reset to latest commit."

    # Install dependencies (only when the lockfile changed). Before copy-env, which needs
    # node_modules (dotenv) and so fails on a fresh clone.
    maybe_install

    # Copy environment settings
    log "Copying environment settings..."
    if ! node scripts/copy-env.mjs --client --api; then
        error_exit "Failed to copy environment settings."
    fi

    # Build the project (only when sources changed)
    maybe_build

    # how long this update took until startup, used for the next status page estimate
    if [[ "$BUILT_THIS_RUN" -eq 1 ]]; then
        echo $(( $(date +%s) - DEPLOY_STARTED_AT + 30 )) > "$CACHE_DIR/last-deploy-seconds"
    fi

    # Start the project (runtime keeps Node's default heap sizing)
    write_status starting
    release_status_port
    mark_running_when_up
    log "Starting the project..."
    pnpm run start || error_exit "Failed to start the project."

    log "✅ Deployment completed successfully."
}

# Execute deployment
BUILT_THIS_RUN=0
parse_args "$@"
ensure_log_file
write_status preparing
start_status_server
deploy_project
