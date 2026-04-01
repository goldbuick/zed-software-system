#!/bin/sh
# Run the published ZSS image with --network host and a named volume for /data.
# See docs/deploy-aws-ec2.md and docs/deploy-digitalocean.md.
#
# On the VM (after Docker is installed):
#   VM_RUN_LOCAL=1 sh scripts/vm-zss-docker-run.sh
#
# From your laptop over SSH:
#   VM_SSH_HOST=1.2.3.4 VM_SSH_USER=ubuntu VM_SSH_IDENTITYFILE=~/.ssh/key.pem sh scripts/vm-zss-docker-run.sh
#
# Env (optional): ZSS_IMAGE, ZSS_DATA_VOLUME, ZSS_PORT, VM_SSH_HOST, VM_SSH_USER (default ubuntu),
# VM_SSH_IDENTITYFILE, VM_RUN_LOCAL=1
set -eu

ZSS_IMAGE="${ZSS_IMAGE:-ellium12/zed-software-system:latest}"
VOL="${ZSS_DATA_VOLUME:-zss-data}"
PORT="${ZSS_PORT:-4175}"

rundocker() {
  docker pull "$ZSS_IMAGE"
  docker rm -f zss 2>/dev/null || true
  docker run -d --name zss --restart unless-stopped \
    --network host \
    -v "${VOL}:/data" \
    -e "ZSS_SERVER_PORT=${PORT}" \
    -e ZSS_DATA_DIR=/data \
    "$ZSS_IMAGE"
}

if [ "${VM_RUN_LOCAL:-0}" = "1" ]; then
  echo "Running ZSS container locally (VM_RUN_LOCAL=1)..."
  rundocker
  exit 0
fi

HOST="${VM_SSH_HOST:-}"
if [ -z "$HOST" ]; then
  echo "Set VM_RUN_LOCAL=1 on the VM, or set VM_SSH_HOST (and optional VM_SSH_USER, VM_SSH_IDENTITYFILE) to run over SSH." >&2
  echo "Wrappers: scripts/aws-ec2-docker-run.sh, scripts/digitalocean-docker-run.sh" >&2
  exit 1
fi

USER="${VM_SSH_USER:-ubuntu}"
IDENT="${VM_SSH_IDENTITYFILE:-}"
SSH_CMD="ssh"
if [ -n "$IDENT" ]; then
  SSH_CMD="ssh -i $IDENT"
fi

echo "Running on ${USER}@${HOST} via SSH..."
REMOTE="docker pull $ZSS_IMAGE && docker rm -f zss 2>/dev/null || true; docker run -d --name zss --restart unless-stopped --network host -v ${VOL}:/data -e ZSS_SERVER_PORT=${PORT} -e ZSS_DATA_DIR=/data $ZSS_IMAGE"
$SSH_CMD -o StrictHostKeyChecking=accept-new "${USER}@${HOST}" "$REMOTE"
