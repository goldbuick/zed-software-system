#!/bin/sh
# Enable Artifact Registry and Cloud Run. Optionally enable Compute Engine for the VM path.
# Usage: GCP_PROJECT_ID=your-project [GCP_ENABLE_COMPUTE=1] sh scripts/gcp-enable-apis.sh
set -eu

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found. Install: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID to your GCP project id}"

gcloud config set project "$GCP_PROJECT_ID"

gcloud services enable run.googleapis.com artifactregistry.googleapis.com

if [ "${GCP_ENABLE_COMPUTE:-0}" = "1" ]; then
  gcloud services enable compute.googleapis.com
fi

echo "Enabled APIs for project $GCP_PROJECT_ID (Compute: ${GCP_ENABLE_COMPUTE:-0})."
