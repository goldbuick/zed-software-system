#!/bin/sh
# Vend Wanix browser runtime into cafe/public/wanix/.
#
# Prereq: yarn install (wanix npm package)

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
PUBLIC="$ROOT/cafe/public/wanix"
NPM_DIST="$ROOT/node_modules/wanix/dist"

if [ ! -f "$NPM_DIST/wanix.min.js" ]; then
  echo "missing $NPM_DIST — run yarn install" >&2
  exit 1
fi

mkdir -p "$PUBLIC"
cp "$NPM_DIST/wanix.min.js" "$NPM_DIST/wanix.wasm" "$PUBLIC/"
if [ -f "$NPM_DIST/wanix.debug.wasm" ]; then
  cp "$NPM_DIST/wanix.debug.wasm" "$PUBLIC/"
fi

NPM_VERSION="$(node -p "require('$ROOT/node_modules/wanix/package.json').version")"
cat >"$PUBLIC/BUILD_ID" <<EOF
wanix-npm=$NPM_VERSION
generated=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "wanix runtime written to $PUBLIC"
