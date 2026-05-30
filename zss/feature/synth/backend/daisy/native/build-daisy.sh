#!/usr/bin/env bash
# Build ZSS DaisySP synth → cafe/public/wasm/daisy/
# Requires Emscripten on PATH (source emsdk_env.sh).
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../../../../.." && pwd)"
DAISY_SRC="$SCRIPT_DIR/DaisySP/Source"
DAISY_LGPL_SRC="$SCRIPT_DIR/DaisySP-LGPL/Source"
WRAPPER_SRC="$SCRIPT_DIR/zss_daisy_synth.cpp"
OUT_DIR="$REPO_ROOT/cafe/public/wasm/daisy"

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
  echo "  source .emsdk/emsdk_env.sh && yarn build:daisy" >&2
  return 1
}

ensureemscripten

echo "▶ Building ZSS DaisySP synth → WebAssembly"
echo "  Source: $DAISY_SRC"
echo "  Output: $OUT_DIR"

DAISY_CPPS=(
  "$DAISY_SRC/Control/adsr.cpp"
  "$DAISY_SRC/Control/phasor.cpp"
  "$DAISY_SRC/Drums/analogbassdrum.cpp"
  "$DAISY_SRC/Drums/synthbassdrum.cpp"
  "$DAISY_SRC/Dynamics/crossfade.cpp"
  "$DAISY_SRC/Dynamics/limiter.cpp"
  "$DAISY_SRC/Effects/autowah.cpp"
  "$DAISY_SRC/Effects/chorus.cpp"
  "$DAISY_SRC/Effects/decimator.cpp"
  "$DAISY_SRC/Effects/overdrive.cpp"
  "$DAISY_SRC/Filters/svf.cpp"
  "$DAISY_SRC/PhysicalModeling/KarplusString.cpp"
  "$DAISY_SRC/PhysicalModeling/drip.cpp"
  "$DAISY_SRC/PhysicalModeling/modalvoice.cpp"
  "$DAISY_SRC/PhysicalModeling/resonator.cpp"
  "$DAISY_SRC/PhysicalModeling/stringvoice.cpp"
  "$DAISY_SRC/Synthesis/oscillator.cpp"
  "$DAISY_SRC/Utility/dcblock.cpp"
  "$DAISY_LGPL_SRC/Effects/reverbsc.cpp"
  "$DAISY_LGPL_SRC/Dynamics/compressor.cpp"
)

EXPORTED_FUNS=(
  "_zss_init"
  "_zss_control_ptr"
  "_zss_control_len"
  "_zss_process"
  "_zss_razzle_tag"
  "_malloc"
  "_free"
)

EXPORT_JSON=$(printf '"%s",' "${EXPORTED_FUNS[@]}" | sed 's/,$//')
EXPORT_JSON="[$EXPORT_JSON]"

emcc \
  -O3 \
  -msimd128 \
  -std=c++14 \
  -I "$DAISY_SRC" \
  -I "$DAISY_SRC/Control" \
  -I "$DAISY_SRC/Drums" \
  -I "$DAISY_SRC/Dynamics" \
  -I "$DAISY_SRC/Effects" \
  -I "$DAISY_SRC/Filters" \
  -I "$DAISY_SRC/Noise" \
  -I "$DAISY_SRC/PhysicalModeling" \
  -I "$DAISY_SRC/Synthesis" \
  -I "$DAISY_SRC/Utility" \
  -I "$DAISY_LGPL_SRC" \
  -I "$DAISY_LGPL_SRC/Effects" \
  -I "$DAISY_LGPL_SRC/Dynamics" \
  -fno-exceptions \
  "$WRAPPER_SRC" \
  "${DAISY_CPPS[@]}" \
  -s WASM=1 \
  -s MODULARIZE=1 \
  -s EXPORT_NAME='ZssDaisy' \
  -s EXPORT_ES6=1 \
  -s "EXPORTED_FUNCTIONS=$EXPORT_JSON" \
  -s EXPORTED_RUNTIME_METHODS='["cwrap","getValue","setValue","HEAPF64","HEAPF32"]' \
  -s ALLOW_MEMORY_GROWTH=0 \
  -s INITIAL_MEMORY=67108864 \
  -s STACK_SIZE=8388608 \
  -s NO_EXIT_RUNTIME=1 \
  -s ASSERTIONS=0 \
  -s ENVIRONMENT='web,worker' \
  -o "$OUT_DIR/zss_daisy.js"

# Emscripten assigns createWasm()'s {} return over wasmExports; strip that regression.
sed -i.bak 's/var wasmExports=createWasm()/var wasmExports;createWasm()/g' "$OUT_DIR/zss_daisy.js"
rm -f "$OUT_DIR/zss_daisy.js.bak"

(cd "$REPO_ROOT" && yarn bundle:daisy-processor)

echo "✓ Build successful"
echo "  $OUT_DIR/zss_daisy.js"
echo "  $OUT_DIR/zss_daisy.wasm"
echo "  $OUT_DIR/daisy-processor.js (bundled classic worklet)"
