#!/bin/sh
# Compile ops/fixtures/wanix/*.wat to matching .wasm via wabt wat2wasm.

set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
DIR="$ROOT/ops/fixtures/wanix"

resolve_wat2wasm() {
  if [ -x "$ROOT/node_modules/.bin/wat2wasm" ]; then
    echo "$ROOT/node_modules/.bin/wat2wasm"
    return 0
  fi
  if command -v wat2wasm >/dev/null 2>&1; then
    command -v wat2wasm
    return 0
  fi
  return 1
}

WAT2WASM="$(resolve_wat2wasm)" || {
  echo "wat2wasm not found — run yarn install (wabt devDependency) or brew install wabt" >&2
  exit 1
}

found=0
for wat in "$DIR"/*.wat; do
  [ -f "$wat" ] || continue
  found=1
  out="${wat%.wat}.wasm"
  echo "wat2wasm $(basename "$wat") -> $(basename "$out")"
  "$WAT2WASM" "$wat" -o "$out"
done

if [ "$found" -eq 0 ]; then
  echo "no .wat files in $DIR" >&2
  exit 1
fi

echo "wanix wasm build ok ($DIR)"
