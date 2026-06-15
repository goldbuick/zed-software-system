#!/bin/sh
# Compile fixtures/wanix/*.c to matching .wasm when wasi-sdk is available.

set -e

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DIR="$ROOT/fixtures/wanix"

resolve_wasi_clang() {
  if [ -n "$WASI_SDK_PATH" ] && [ -x "$WASI_SDK_PATH/bin/clang" ]; then
    echo "$WASI_SDK_PATH/bin/clang"
    return 0
  fi
  if [ -x /opt/wasi-sdk/bin/clang ]; then
    echo /opt/wasi-sdk/bin/clang
    return 0
  fi
  if command -v brew >/dev/null 2>&1; then
    prefix="$(brew --prefix wasi-sdk 2>/dev/null)" || true
    if [ -n "$prefix" ] && [ -x "$prefix/bin/clang" ]; then
      echo "$prefix/bin/clang"
      return 0
    fi
  fi
  return 1
}

CLANG="$(resolve_wasi_clang)" || {
  echo "wasi-sdk not found — skipping C wasm build"
  echo "install: brew install wasi-sdk  or set WASI_SDK_PATH to a wasi-sdk install"
  echo "see fixtures/wanix/README.md"
  exit 0
}

SYSROOT="$("$CLANG" --print-sysroot 2>/dev/null)" || SYSROOT=""
CLANG_FLAGS="--target=wasm32-wasi -nostdlib -Wl,--no-entry -Wl,--export=_start"
if [ -n "$SYSROOT" ]; then
  CLANG_FLAGS="$CLANG_FLAGS --sysroot=$SYSROOT"
fi

found=0
for src in "$DIR"/*.c; do
  [ -f "$src" ] || continue
  found=1
  out="${src%.c}.wasm"
  echo "clang $(basename "$src") -> $(basename "$out")"
  "$CLANG" $CLANG_FLAGS -o "$out" "$src"
done

if [ "$found" -eq 0 ]; then
  echo "no .c files in $DIR" >&2
  exit 1
fi

echo "wanix C wasm build ok ($DIR)"
