#!/bin/sh
# Print (and optionally run via SSH) the docker run command for the VM path. Run on the VM after Docker is installed.
# On the VM, set IMAGE to your Artifact Registry image URI or use Docker Hub ellium12/zed-software-system.
#
# Remote usage (from your laptop, after VM exists):
#   GCP_PROJECT_ID=p GCP_ZONE=us-west1-a GCP_VM_NAME=zss-vm GCP_PUSH_IMAGE=... sh scripts/gcp-vm-docker-run.sh
#
# Local usage (already SSH'd into the VM):
#   GCP_RUN_LOCAL=1 GCP_PUSH_IMAGE=us-central1-docker.pkg.dev/.../zss:latest sh scripts/gcp-vm-docker-run.sh
set -eu

: "${GCP_PUSH_IMAGE:?set GCP_PUSH_IMAGE to the full image URI (e.g. us-central1-docker.pkg.dev/PROJECT/zss-repo/zss:latest)}"

PORT="${GCP_APP_PORT:-4175}"
VOL="${GCP_DOCKER_VOLUME:-zss-data}"

runline="docker run -d --restart unless-stopped -p ${PORT}:${PORT} -v ${VOL}:/data -e ZSS_SERVER_PORT=${PORT} ${GCP_PUSH_IMAGE}"

if [ "${GCP_RUN_LOCAL:-0}" = "1" ]; then
  echo "Running on local machine (VM shell):"
  sh -c "$runline"
  exit 0
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID (or use GCP_RUN_LOCAL=1 on the VM)}"
ZONE="${GCP_ZONE:-us-west1-a}"
NAME="${GCP_VM_NAME:-zss-vm}"

echo "Run this on the VM (after: sudo apt update && sudo apt install -y docker.io && sudo usermod -aG docker \$USER):"
echo ""
echo "$runline"
echo ""
echo "Or from your laptop:"
echo "gcloud compute ssh $NAME --zone=$ZONE --project=$GCP_PROJECT_ID --command=\"sudo $runline\""
