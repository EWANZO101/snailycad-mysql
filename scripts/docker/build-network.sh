#!/bin/sh
# Network fallbacks for the Docker image build, so a host with broken container networking still
# builds. Each RUN gets a fresh /etc/resolv.conf, so every RUN that downloads calls this first.
#
#   build-network.sh dns                 use public DNS servers when Docker's DNS can't resolve
#   build-network.sh apt <package>...    apt-get install, trying other Debian mirrors on failure
set -u

log() { echo "[snailycad build] $*"; }

fix_dns() {
    getent hosts deb.debian.org >/dev/null 2>&1 && getent hosts registry.npmjs.org >/dev/null 2>&1 && return 0
    log "Docker's DNS can't resolve the package servers; using public DNS (1.1.1.1, 8.8.8.8, 9.9.9.9)"
    if ! printf 'nameserver 1.1.1.1\nnameserver 8.8.8.8\nnameserver 9.9.9.9\n' > /etc/resolv.conf 2>/dev/null; then
        log "could not change the DNS servers of the build"
    fi
}

apt_install() {
    # IPv4 only, short timeouts and retries: broken IPv6 or a flaky mirror would otherwise hang apt
    # for minutes before failing
    printf 'Acquire::ForceIPv4 "true";\nAcquire::Retries "2";\nAcquire::http::Timeout "20";\nAcquire::https::Timeout "20";\n' \
        > /etc/apt/apt.conf.d/99snailycad-network
    # a stalled connection can trickle along without ever hitting apt's timeouts: cap each attempt
    apt_try() {
        timeout 150 apt-get update && timeout 300 apt-get install -y --no-install-recommends "$@"
    }

    apt_try "$@" && return 0
    # other official mirrors (http: ca-certificates isn't installed yet)
    for mirror in http://ftp.debian.org http://cdn-fastly.deb.debian.org http://ftp.us.debian.org \
        http://ftp.de.debian.org http://ftp.uk.debian.org; do
        log "apt-get failed; trying the Debian mirror $mirror"
        for file in /etc/apt/sources.list.d/debian.sources /etc/apt/sources.list; do
            [ -f "$file" ] || continue
            sed -i -E \
                -e "s#https?://[^ ]+/debian-security#http://security.debian.org/debian-security#g" \
                -e "s#https?://[^ ]+/debian( |\$)#$mirror/debian\\1#g" "$file"
        done
        apt_try "$@" && return 0
    done
    log "Could not download $*: Docker containers on this machine can't reach the Debian servers."
    log "Check the machine's internet, its firewall / VPN, and Docker's DNS (\"dns\" in /etc/docker/daemon.json)."
    return 1
}

case "${1:-}" in
    dns) fix_dns ;;
    apt) shift; fix_dns; apt_install "$@" ;;
    *) echo "usage: $0 dns | apt <package>..." >&2; exit 2 ;;
esac
