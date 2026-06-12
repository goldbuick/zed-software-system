#!/bin/sh
# Vend Wanix browser runtime + minimal WASI bundle into cafe/public/wanix/.
#
# Prereqs:
#   brew install progrium/taps/wanix
#   brew install wabt
#   yarn install   # npm wanix@0.4.0-alpha8

set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$ROOT/cafe/public/wanix"
BUNDLE_SRC="$ROOT/scripts/wanix/bundle-src"
NPM_DIST="$ROOT/node_modules/wanix/dist"

command -v wanix >/dev/null 2>&1 || {
  echo "wanix CLI not found — brew install progrium/taps/wanix" >&2
  exit 1
}

command -v wat2wasm >/dev/null 2>&1 || {
  echo "wat2wasm not found — brew install wabt" >&2
  exit 1
}

if [ ! -f "$NPM_DIST/wanix.min.js" ]; then
  echo "missing $NPM_DIST — run yarn install" >&2
  exit 1
fi

mkdir -p "$PUBLIC"
mkdir -p "$BUNDLE_SRC/bundle"

wat2wasm "$ROOT/scripts/wanix/hello.wat" -o "$ROOT/scripts/wanix/hello.wasm"

rm -rf "$BUNDLE_SRC"
wanix bundle init "$BUNDLE_SRC"
mkdir -p "$BUNDLE_SRC/bundle"
cp "$ROOT/scripts/wanix/hello.wasm" "$BUNDLE_SRC/bundle/hello.wasm"

wanix bundle pack "$BUNDLE_SRC" "$PUBLIC/wasi-minimal.bundle.tgz"

cp "$ROOT/scripts/wanix/hello.wasm" "$PUBLIC/hello.wasm"
cp "$NPM_DIST/wanix.min.js" "$NPM_DIST/wanix.wasm" "$PUBLIC/"

WANIX_CLI_VERSION="$(wanix 2>&1 | head -1 || true)"
NPM_VERSION="$(node -p "require('$ROOT/node_modules/wanix/package.json').version")"
cat >"$PUBLIC/BUILD_ID" <<EOF
wanix-cli=$WANIX_CLI_VERSION
wanix-npm=$NPM_VERSION
generated=$(date -u +%Y-%m-%dT%H:%M:%SZ)
EOF

echo "wanix assets written to $PUBLIC"
