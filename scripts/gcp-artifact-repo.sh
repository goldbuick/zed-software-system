#!/bin/sh
# Create Artifact Registry Docker repo (if missing) and configure docker credential helper.
# Usage: GCP_PROJECT_ID=your-project [GCP_REGION=us-central1] [AR_REPO=zss-repo] sh scripts/gcp-artifact-repo.sh
set -eu

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found. Install: https://cloud.google.com/sdk/docs/install" >&2
  exit 1
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"

REGION="${GCP_REGION:-us-central1}"
REPO="${AR_REPO:-zss-repo}"
REGISTRY_HOST="${REGION}-docker.pkg.dev"

gcloud config set project "$GCP_PROJECT_ID"

if ! gcloud artifacts repositories describe "$REPO" --location="$REGION" >/dev/null 2>&1; then
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="ZSS images"
else
  echo "Repository $REPO already exists in $REGION."
fi

gcloud auth configure-docker "$REGISTRY_HOST" --quiet

echo "Docker can push to ${REGISTRY_HOST}/${GCP_PROJECT_ID}/${REPO}"
