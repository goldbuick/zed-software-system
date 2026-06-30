#!/bin/sh
# Build ops/fixtures/wanix Go wasm binaries.
#
# Usage: build.sh [all|wasi|zed-cafe|gojs]
# Default (no args): all (= wasi + zed-cafe)
#
# Prereq: Go toolchain + git submodule update --init submodules/wanix

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
WANIX_DIR="$ROOT/ops/fixtures/wanix"
WANIX_SUBMODULE="$ROOT/submodules/wanix"
ZED_CAFE_FIXTURE="$WANIX_DIR/zed-cafe.wasm"
ZED_CAFE_PUBLIC="$ROOT/cafe/public/wanix/zed-cafe.wasm"
GOJS_SRC="$WANIX_SUBMODULE/test/gojs"
GOJS_OUT="$WANIX_DIR/gojscheck.wasm"

WASI_FIXTURES="hello hold termbridge zedcaferead zedcafewrite zedcafewritebad zedcafelist"

require_go() {
  if ! command -v go >/dev/null 2>&1; then
    echo "go not found — install Go (brew install go) to build wanix fixtures" >&2
    exit 1
  fi
}

require_wanix_submodule() {
  if [ ! -d "$WANIX_SUBMODULE" ]; then
    echo "missing $WANIX_SUBMODULE — run: git submodule update --init submodules/wanix" >&2
    exit 1
  fi
}

require_root_gomod() {
  if [ ! -f "$WANIX_DIR/go.mod" ]; then
    echo "missing $WANIX_DIR/go.mod" >&2
    exit 1
  fi
}

build_wasi() {
  require_root_gomod
  require_wanix_submodule
  for name in $WASI_FIXTURES; do
    if [ ! -d "$WANIX_DIR/$name" ]; then
      echo "missing fixture package $WANIX_DIR/$name" >&2
      exit 1
    fi
    echo "go build $name -> ${name}.wasm"
    (
      cd "$WANIX_DIR"
      GOOS=wasip1 GOARCH=wasm CGO_ENABLED=0 go build \
        -ldflags="-s -w" \
        -o "$WANIX_DIR/${name}.wasm" \
        "./$name"
    )
  done
  echo "wanix Go WASI wasm build ok ($WANIX_DIR)"
}

build_zed_cafe() {
  require_root_gomod
  require_wanix_submodule
  if [ ! -f "$WANIX_DIR/zed-cafe/main.go" ]; then
    echo "missing $WANIX_DIR/zed-cafe/main.go" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$ZED_CAFE_PUBLIC")"
  echo "go build zed-cafe -> zed-cafe.wasm"
  (
    cd "$WANIX_DIR"
    GOOS=js GOARCH=wasm go build -o zed-cafe.wasm ./zed-cafe
  )
  cp "$ZED_CAFE_FIXTURE" "$ZED_CAFE_PUBLIC"
  echo "zed-cafe.wasm written to $ZED_CAFE_FIXTURE (copied to $ZED_CAFE_PUBLIC)"
}

build_gojs() {
  require_wanix_submodule
  if [ ! -f "$GOJS_SRC/main.go" ]; then
    echo "missing $GOJS_SRC/main.go — run: git submodule update --init submodules/wanix" >&2
    exit 1
  fi
  mkdir -p "$(dirname "$GOJS_OUT")"
  echo "go build gojs -> gojscheck.wasm"
  (
    cd "$GOJS_SRC"
    GOOS=js GOARCH=wasm go build -o gojscheck.wasm .
  )
  cp "$GOJS_SRC/gojscheck.wasm" "$GOJS_OUT"
  echo "gojscheck.wasm written to $GOJS_OUT"
}

build_all() {
  build_wasi
  build_zed_cafe
}

require_go

TARGET="${1:-all}"

case "$TARGET" in
  all)
    build_all
    ;;
  wasi)
    build_wasi
    ;;
  zed-cafe)
    build_zed_cafe
    ;;
  gojs)
    build_gojs
    ;;
  *)
    echo "usage: $0 [all|wasi|zed-cafe|gojs]" >&2
    exit 1
    ;;
esac
