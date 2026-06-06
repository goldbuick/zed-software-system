#!/usr/bin/env bash
# Local lang regression: TS compiler + native parity + behavioral + WASM smoke.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ typescript-compiler"
yarn jest zss/feature/lang/backend/typescript/__tests__/ --no-coverage

echo "▶ native-parity"
yarn lang-parity:test

echo "▶ behavioral"
yarn jest zss/feature/lang/backend/wasm/__tests__/langcompile.test.ts --no-coverage

echo "▶ build-lang-wasm"
yarn lang:build

echo "▶ wasm-smoke"
yarn lang-wasm:test

echo "✓ lang regression complete"
