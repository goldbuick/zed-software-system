#!/bin/sh
set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT/ops/tools/wanixbridge"
go build -o wanix-bridge .
PUBLIC_BASE="${ZSS_URL:-https://localhost:7777}"
PUBLIC_BASE="${PUBLIC_BASE%/}"
exec ./wanix-bridge \
  --listen 0.0.0.0:7654 \
  --public-base "$PUBLIC_BASE" \
  "$@"
