#!/bin/sh
# Automated wanix VM fix loop — run after each code change instead of manual browser checks.
# Requires port 7777 free (stop `yarn task app dev` first).
set -e
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

if command -v lsof >/dev/null 2>&1; then
  if lsof -nP -iTCP:7777 -sTCP:LISTEN >/dev/null 2>&1; then
    echo "wanix:vm:fixloop — port 7777 is in use."
    echo "Stop 'yarn task app dev' (Playwright starts its own Vite server with CI=1)."
    exit 1
  fi
fi

export CI=1
export PLAYWRIGHT_INCLUDE_WANIX_E2E=1
export PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1

echo ""
echo "=== [1/3] upstream basic-vm smoke (CDN + wanix.wasm) ==="
yarn task run wanix:vm-prep-smoke

echo ""
echo "=== [2/3] isolated ZSS wanix-vm-e2e term stress ==="
yarn task run wanix:vm:isolated:verify

echo ""
echo "=== [3/3] full ZSS app (/?ZSS_E2E=1) — matches manual #wanix vm ==="
yarn task run wanix:vm:app:verify

echo ""
echo "wanix:vm:fixloop — all gates passed"
