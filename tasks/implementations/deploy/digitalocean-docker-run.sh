#!/bin/sh
# DigitalOcean Droplet helper for scripts/vm-zss-docker-run.sh.
# Set DO_DROPLET_HOST to the Droplet public IP, then run from your laptop.
# Optional: DO_DROPLET_USER (default root), DO_DROPLET_SSH_KEY, DO_RUN_LOCAL=1 on the Droplet.
#
# Example (laptop):
#   DO_DROPLET_HOST=1.2.3.4 DO_DROPLET_SSH_KEY=$HOME/.ssh/id_ed25519 sh scripts/digitalocean-docker-run.sh
#
# Example (already SSH'd into the Droplet):
#   DO_RUN_LOCAL=1 sh scripts/digitalocean-docker-run.sh
set -eu

DIR=$(dirname "$0")
export VM_SSH_HOST="${DO_DROPLET_HOST:-${VM_SSH_HOST:-}}"
export VM_SSH_USER="${DO_DROPLET_USER:-${VM_SSH_USER:-root}}"
export VM_SSH_IDENTITYFILE="${DO_DROPLET_SSH_KEY:-${VM_SSH_IDENTITYFILE:-}}"
export VM_RUN_LOCAL="${DO_RUN_LOCAL:-${VM_RUN_LOCAL:-0}}"

exec sh "$DIR/vm-zss-docker-run.sh"
