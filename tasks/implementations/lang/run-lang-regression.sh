#!/usr/bin/env bash
# Local lang regression: TS compiler + native parity + behavioral + WASM smoke.
set -e

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "▶ typescript-compiler"
yarn jest --config ops/jest.config.ts ops/tests/unit/feature/lang/backend/typescript/__tests__/ --no-coverage

echo "▶ native-parity"
yarn task run lang:parity:test

echo "▶ behavioral"
yarn jest --config ops/jest.config.ts ops/tests/unit/feature/lang/backend/wasm/__tests__/langcompile.test.ts --no-coverage

echo "▶ build-lang-wasm"
yarn task run lang:build

echo "▶ wasm-corpus"
yarn task run lang:corpus:test

echo "✓ lang regression complete"
