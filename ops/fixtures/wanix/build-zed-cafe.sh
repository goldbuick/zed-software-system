#!/bin/sh
# Build zed-cafe.wasm (Go js/wasm) into cafe/public/wanix/ for prod + dev.
#
# Prereq: Go toolchain (brew install go)

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SRC="$ROOT/ops/fixtures/wanix/zed-cafe"
OUT="$ROOT/cafe/public/wanix/zed-cafe.wasm"

if ! command -v go >/dev/null 2>&1; then
  echo "go not found — install Go (brew install go) to build zed-cafe.wasm" >&2
  exit 1
fi

if [ ! -f "$SRC/main.go" ]; then
  echo "missing $SRC/main.go" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"
(
  cd "$SRC"
  GOOS=js GOARCH=wasm go build -o zed-cafe.wasm .
)
cp "$SRC/zed-cafe.wasm" "$OUT"
echo "zed-cafe.wasm written to $OUT"
