#!/bin/sh
set -e

# The data directory belongs to whoever created it on the host - root under
# Coolify, the user on a workstation. Take ownership, then drop the privileges
# that were only needed for that.
user="${APP_UID:-1000}:${APP_GID:-1000}"
chown -R "$user" /data 2>/dev/null || true

exec su-exec "$user" roadmap
