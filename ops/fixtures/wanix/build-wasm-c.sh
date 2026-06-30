#!/bin/sh
# Compile ops/fixtures/wanix/*.c to matching .wasm — requires wasi-sdk.

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DIR="$ROOT/ops/fixtures/wanix"

print_install_help() {
  echo "wasi-sdk required for Wanix C fixtures." >&2
  echo "" >&2
  echo "Install:" >&2
  echo "  sh ops/fixtures/wanix/install-wasi-sdk.sh" >&2
  echo "" >&2
  echo "Or unpack a release to /opt/wasi-sdk and set WASI_SDK_PATH if needed." >&2
  echo "Docs: ops/fixtures/wanix/README.md" >&2
}

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

verify_wasi_clang() {
  clang="$1"
  if [ ! -x "$clang" ]; then
    echo "wasi-sdk clang not executable: $clang" >&2
    return 1
  fi
  if ! "$clang" --version >/dev/null 2>&1; then
    echo "wasi-sdk clang failed --version: $clang" >&2
    echo "If bin/clang-22 is missing, re-extract the release tarball or run install-wasi-sdk.sh" >&2
    return 1
  fi
  return 0
}

CLANG="$(resolve_wasi_clang)" || {
  print_install_help
  exit 1
}

verify_wasi_clang "$CLANG" || {
  print_install_help
  exit 1
}

SYSROOT="$("$CLANG" --print-sysroot 2>/dev/null)" || SYSROOT=""
CLANG_FLAGS="--target=wasm32-wasip1 -nostdlib -Wl,--no-entry -Wl,--export=_start"
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
