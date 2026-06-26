#!/bin/sh
# Enforce import hygiene in zss/ and cafe/: no parent paths, no re-exports, no known barrels.
set -e

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

fail=0

check_rg() {
  label="$1"
  pattern="$2"
  if rg -q "$pattern" zss cafe --glob '*.{ts,tsx}' 2>/dev/null; then
    echo "FAIL: $label"
    rg "$pattern" zss cafe --glob '*.{ts,tsx}' || true
    fail=1
  fi
}

check_rg 'parent-directory imports (../)' "from ['\"][^'\"]*\\.\\./"
check_rg 're-export syntax' 'export \{[^}]+\} from|export \* from|export type \{[^}]+\} from'

for barrel in \
  zss/gadget/data/state.ts \
  zss/feature/lang/index.ts \
  zss/feature/synth/index.ts \
  zss/feature/synth/backend/wasm/index.ts \
  zss/feature/synth/backend/daisy/index.ts \
  zss/screens/screenui/component.tsx
do
  if [ -f "$barrel" ]; then
    echo "FAIL: barrel file still exists: $barrel"
    fail=1
  fi
done

if [ "$fail" -ne 0 ]; then
  echo ""
  echo "Import hygiene violations found. See .cursor/rules/no-barrels-reexports.mdc and no-parent-imports.mdc"
  exit 1
fi

echo "Import hygiene OK (zss/ + cafe/)"
