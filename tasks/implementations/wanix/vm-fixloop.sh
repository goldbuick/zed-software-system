#!/bin/sh
# Orphaned — wanix Playwright gates (wanix:vm-simple-smoke, etc.) were removed with
# ops/e2e cleanup. Re-wire tasks in tasks/groups/wanix.ts before running this script.
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
echo "=== [1/5] upstream basic-vm prep smoke (CDN + wanix.wasm) ==="
yarn task run wanix:vm-prep-smoke

echo ""
echo "=== [2/5] upstream vm-simple (basic-vm.html + wanix-term) ==="
yarn task run wanix:vm-simple-smoke

echo ""
echo "=== [3/5] wanix-term inside iframe under mock WebGL parent ==="
yarn task run wanix:vm-term-iframe-smoke

echo ""
echo "=== [4/5] isolated ZSS wanix-vm-e2e term stress ==="
yarn task run wanix:vm:isolated:verify

echo ""
echo "=== [5/5] full ZSS app (/?ZSS_E2E=1) hidden iframe + tile bridge ==="
yarn task run wanix:vm:app:verify

echo ""
echo "wanix:vm:fixloop — all gates passed"
