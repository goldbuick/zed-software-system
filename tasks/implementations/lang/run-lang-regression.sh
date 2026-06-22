#!/usr/bin/env bash
# Local lang regression: TypeScript parser tests only.
set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

echo "▶ typescript-compiler"
yarn jest --config ops/jest.config.ts ops/tests/unit/feature/lang/backend/typescript/__tests__/ --no-coverage

echo "✓ lang regression complete"
