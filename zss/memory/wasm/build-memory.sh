#!/usr/bin/env bash
# Build zss_memory → cafe/public/wasm/memory/
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
OUT_DIR="$REPO_ROOT/cafe/public/wasm/memory"
SRC="$SCRIPT_DIR/zss_memory.cpp"

mkdir -p "$OUT_DIR"

ensureemscripten() {
  if command -v emcc >/dev/null 2>&1; then
    return 0
  fi
  local candidates=(
    "$REPO_ROOT/.emsdk/emsdk_env.sh"
    "${EMSDK:+$EMSDK/emsdk_env.sh}"
    "$HOME/emsdk/emsdk_env.sh"
  )
  for envscript in "${candidates[@]}"; do
    if [[ -f "$envscript" ]]; then
      # shellcheck disable=SC1090
      source "$envscript"
      if command -v emcc >/dev/null 2>&1; then
        return 0
      fi
    fi
  done
  echo "error: emcc not found" >&2
  return 1
}

ensureemscripten

EXPORTED_FUNS=(
  "_zss_memory_init"
  "_zss_memory_free"
  "_zss_memory_import_json"
  "_zss_memory_export_json"
  "_zss_memory_export_wire_json"
  "_zss_memory_run_op"
  "_zss_memory_free_string"
  "_malloc"
  "_free"
)

EXPORT_JSON=$(printf '"%s",' "${EXPORTED_FUNS[@]}" | sed 's/,$//')
EXPORT_JSON="[$EXPORT_JSON]"

emcc \
  -O3 \
  -std=c++14 \
  -I "$SCRIPT_DIR" \
  -fno-exceptions \
  -DJSON_NOEXCEPTION \
  "$SRC" \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='ZssMemory' \
  -s EXPORT_ES6=1 \
  -s "EXPORTED_FUNCTIONS=$EXPORT_JSON" \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","UTF8ToString","stringToUTF8","lengthBytesUTF8","getValue","setValue"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s STACK_SIZE=8388608 \
  -s NO_EXIT_RUNTIME=1 \
  -s ASSERTIONS=0 \
  -s ENVIRONMENT='web,node,worker' \
  -o "$OUT_DIR/zss_memory.js"

echo "✓ zss_memory wasm → $OUT_DIR"
