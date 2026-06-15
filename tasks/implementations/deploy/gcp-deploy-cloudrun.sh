#!/bin/sh
# Deploy the pushed image to Cloud Run (ZSS_SERVER_PORT matches container port 8080).
# Usage: GCP_PROJECT_ID=your-project [GCP_REGION=us-central1] [AR_REPO=zss-repo] [GCP_IMAGE_TAG=latest] [GCP_RUN_SERVICE=zss-service] sh scripts/gcp-deploy-cloudrun.sh
set -eu

if ! command -v gcloud >/dev/null 2>&1; then
  echo "gcloud not found." >&2
  exit 1
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"

REGION="${GCP_REGION:-us-central1}"
REPO="${AR_REPO:-zss-repo}"
TAG="${GCP_IMAGE_TAG:-latest}"
SERVICE="${GCP_RUN_SERVICE:-zss-service}"
IMAGE="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO}/zss:${TAG}"

gcloud config set project "$GCP_PROJECT_ID"

gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --port 8080 \
  --set-env-vars "ZSS_SERVER_PORT=8080,ZSS_DATA_DIR=/data" \
  --allow-unauthenticated
