#!/bin/sh
# Compile ops/fixtures/wanix/wasi/* Go WASI fixtures to ops/fixtures/wanix/*.wasm
#
# Prereq: Go toolchain (brew install go)

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
OUTDIR="$ROOT/ops/fixtures/wanix"
SRC="$OUTDIR/wasi"

if ! command -v go >/dev/null 2>&1; then
  echo "go not found — install Go (brew install go) to build wanix WASI fixtures" >&2
  exit 1
fi

if [ ! -f "$SRC/go.mod" ]; then
  echo "missing $SRC/go.mod" >&2
  exit 1
fi

FIXTURES="hello hold termbridge zedcaferead zedcafewrite zedcafewritebad zedcafelist"

for name in $FIXTURES; do
  if [ ! -d "$SRC/$name" ]; then
    echo "missing fixture package $SRC/$name" >&2
    exit 1
  fi
  echo "go build $name -> ${name}.wasm"
  (
    cd "$SRC"
    GOOS=wasip1 GOARCH=wasm CGO_ENABLED=0 go build \
      -ldflags="-s -w" \
      -o "$OUTDIR/${name}.wasm" \
      "./$name"
  )
done

echo "wanix Go WASI wasm build ok ($OUTDIR)"
