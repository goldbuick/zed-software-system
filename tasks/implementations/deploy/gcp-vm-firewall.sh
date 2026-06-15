#!/bin/sh
# Open TCP 4175 for instances tagged zss-server (VM path from the GCP plan).
# Usage: GCP_PROJECT_ID=your-project [GCP_FW_RULE=allow-zss-4175] [GCP_VM_TAG=zss-server] [GCP_APP_PORT=4175] sh scripts/gcp-vm-firewall.sh
set -eu

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found." >&2
  exit 1
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"

gcloud config set project "$GCP_PROJECT_ID"

RULE="${GCP_FW_RULE:-allow-zss-4175}"
TAG="${GCP_VM_TAG:-zss-server}"
PORT="${GCP_APP_PORT:-4175}"

gcloud config set project "$GCP_PROJECT_ID"

if gcloud compute firewall-rules describe "$RULE" >/dev/null 2>&1; then
  echo "Firewall rule $RULE already exists."
  exit 0
fi

gcloud compute firewall-rules create "$RULE" \
  --allow "tcp:${PORT}" \
  --target-tags="$TAG"

echo "Created $RULE (tcp:${PORT} for instances tagged $TAG)."
