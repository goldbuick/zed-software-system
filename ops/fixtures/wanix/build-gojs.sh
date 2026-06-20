#!/bin/sh
# Build upstream gojscheck.wasm (Go js/wasm) into cafe/public/wanix/.
#
# Prereq: Go toolchain (brew install go)

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$ROOT/submodules/wanix/test/gojs"
OUT="$ROOT/cafe/public/wanix/gojscheck.wasm"

if ! command -v go >/dev/null 2>&1; then
  echo "go not found — install Go (brew install go) to build gojscheck.wasm" >&2
  exit 1
fi

if [ ! -f "$SRC/main.go" ]; then
  echo "missing $SRC/main.go — run: git submodule update --init submodules/wanix" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
(
  cd "$SRC"
  GOOS=js GOARCH=wasm go build -o gojscheck.wasm .
)
cp "$SRC/gojscheck.wasm" "$OUT"
echo "gojscheck.wasm written to $OUT"
