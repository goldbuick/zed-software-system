#!/usr/bin/env bash
# Build ZSS lang compiler → cafe/public/wasm/lang/
# Requires Emscripten on PATH (source emsdk_env.sh).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
OUT_DIR="$REPO_ROOT/cafe/public/wasm/lang"
BUILDID_FILE="$SCRIPT_DIR/langbuildid.ts"
WRAPPER_SRC="$SCRIPT_DIR/zss_lang_compile.cpp"

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
        echo "▶ Using Emscripten from $envscript"
        return 0
      fi
    fi
  done

  echo "error: emcc not found — install Emscripten and retry:" >&2
  echo "  git clone https://github.com/emscripten-core/emsdk.git .emsdk" >&2
  echo "  cd .emsdk && ./emsdk install latest && ./emsdk activate latest" >&2
  echo "  source .emsdk/emsdk_env.sh && yarn build:lang" >&2
  return 1
}

ensureemscripten

echo "▶ Building ZSS lang compiler → WebAssembly"
echo "  Source: $SCRIPT_DIR"
echo "  Output: $OUT_DIR"

EXPORTED_FUNS=(
  "_zss_compile"
  "_zss_compile_result_free"
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
  "$WRAPPER_SRC" \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='ZssLang' \
  -s EXPORT_ES6=1 \
  -s "EXPORTED_FUNCTIONS=$EXPORT_JSON" \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","UTF8ToString","getValue","setValue"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -s INITIAL_MEMORY=16777216 \
  -s STACK_SIZE=8388608 \
  -s NO_EXIT_RUNTIME=1 \
  -s ASSERTIONS=0 \
  -s ENVIRONMENT='web,worker' \
  -o "$OUT_DIR/zss_lang.js"

# Emscripten assigns createWasm()'s {} return over wasmExports; strip that regression.
sed -i.bak 's/var wasmExports=createWasm()/var wasmExports;createWasm()/g' "$OUT_DIR/zss_lang.js"
rm -f "$OUT_DIR/zss_lang.js.bak"

BUILD_ID=$(date +%s)
cat > "$BUILDID_FILE" <<EOF
/** Bumped by \`yarn build:lang\` — busts browser cache when wasm changes on same commit. */
export const LANG_BUILD_ID = '${BUILD_ID}'
EOF

echo "✓ Build successful"
echo "  $OUT_DIR/zss_lang.js"
echo "  $OUT_DIR/zss_lang.wasm"
echo "  langbuildid.ts → LANG_BUILD_ID=${BUILD_ID}"
