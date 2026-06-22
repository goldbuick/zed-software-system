#!/bin/sh
# Record pinned wanix npm version — runtime loads from jsDelivr CDN (see wanixvmassets.ts).

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PUBLIC="$ROOT/ops/fixtures/wanix"
NPM_PKG="$ROOT/node_modules/wanix/package.json"

if [ ! -f "$NPM_PKG" ]; then
  echo "missing $NPM_PKG — run yarn install" >&2
  exit 1
fi

mkdir -p "$PUBLIC"
NPM_VERSION="$(node -p "require('$NPM_PKG').version")"
cat >"$PUBLIC/BUILD_ID" <<EOF_INNER
wanix-npm=$NPM_VERSION
runtime=cdn.jsdelivr.net/npm/wanix@0.4.0-alpha8/dist
generated=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF_INNER

echo "wanix runtime pin recorded (CDN) in $PUBLIC/BUILD_ID"
