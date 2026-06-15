#!/bin/sh
# Create an e2-micro Ubuntu VM tagged for the ZSS firewall rule (Always Free eligible region/type — verify current GCP docs).
# Usage: GCP_PROJECT_ID=your-project [GCP_ZONE=us-west1-a] [GCP_VM_NAME=zss-vm] [GCP_VM_TAG=zss-server] sh scripts/gcp-vm-create.sh
set -eu

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found." >&2
  exit 1
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"

ZONE="${GCP_ZONE:-us-west1-a}"
NAME="${GCP_VM_NAME:-zss-vm}"
TAG="${GCP_VM_TAG:-zss-server}"

gcloud config set project "$GCP_PROJECT_ID"

gcloud compute instances create "$NAME" \
  --zone="$ZONE" \
  --machine-type=e2-micro \
  --tags="$TAG" \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud

echo "Instance $NAME created. Install Docker on the VM, then run scripts/gcp-vm-docker-run.sh (see comments inside)."
