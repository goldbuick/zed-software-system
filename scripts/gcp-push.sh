#!/bin/sh
# Tag local image zss:local and push to Artifact Registry (run yarn docker:build first).
# Usage: GCP_PROJECT_ID=your-project [GCP_REGION=us-central1] [AR_REPO=zss-repo] [GCP_IMAGE_TAG=latest] sh scripts/gcp-push.sh
set -eu

if ! command -v docker >/dev/null 2>&1; then
  echo "docker not found." >&2
  exit 1
fi

: "${GCP_PROJECT_ID:?set GCP_PROJECT_ID}"

REGION="${GCP_REGION:-us-central1}"
REPO="${AR_REPO:-zss-repo}"
TAG="${GCP_IMAGE_TAG:-latest}"
IMAGE_LOCAL="${GCP_IMAGE_LOCAL:-zss:local}"
REGISTRY="${REGION}-docker.pkg.dev/${GCP_PROJECT_ID}/${REPO}/zss:${TAG}"

if ! docker image inspect "$IMAGE_LOCAL" >/dev/null 2>&1; then
  echo "Local image $IMAGE_LOCAL not found. Run: yarn docker:build" >&2
  exit 1
fi

docker tag "$IMAGE_LOCAL" "$REGISTRY"
docker push "$REGISTRY"

echo "Pushed $REGISTRY"
