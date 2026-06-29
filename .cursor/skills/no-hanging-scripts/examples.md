# Hang prevention examples

## Bad — hangs Jest forever

```typescript
const chip = {
  sy: () => false,
  getcase: () => 1,        // never advances
  nextcase: () => undefined,
  command: () => 0,
} as unknown as CHIP

loadscriptsync(wasmbytes, chip).run() // blocks event loop; testTimeout useless
```

## Good — shared stub

```typescript
import {
  createwasmstubchip,
  runwasmscriptfortest,
} from 'ops/lib/test/lang/wasmruntestutil'

const chip = createwasmstubchip({
  command(...words: WORD[]) {
    invoked.push([...words])
    return 0
  },
})
runwasmscriptfortest(wasmbytes, chip)
```

## Good — explicit small budget for negative test

```typescript
expect(() =>
  loadscriptsync(wasmbytes, stuckchip, { runbudget: 64 }).run(),
).toThrow(/run budget/)
```

## Iterating on a fix

```bash
# 1. One file, no coverage
yarn jest ops/tests/unit/feature/lang/backend/wasm/lexerparity.test.ts --no-coverage

# 2. After pass, broader
yarn jest ops/tests/unit/feature/lang/backend/wasm/ --no-coverage

# 3. Full suite last
yarn task run app:test
```

## Hung background Jest from a prior turn

```bash
# Find and kill — do not start a second jest on top
ps aux | rg '[j]est'
kill <pid>
```

## Preview server lifecycle

```bash
yarn task run app:build:strict
yarn task run app:preview &          # background
sleep 2
curl -sk -o /dev/null -w "%{http_code}\n" https://127.0.0.1:7777/wasm/lang/zss_lang.wasm
kill %1                     # or kill <pid>
```

## Task / Playwright script timeouts

Use `withscripttimeout` from `tasks/lib/parity/parity-timeouts.ts` (or re-export via `tasks/lib/wanix/playwright-vm.ts` for Wanix gates).

**Signature is `(label, ms, fn)` — label first.** Swapping ms and label fails silently (wrong timeout or wrong log label).

```typescript
import { withscripttimeout } from 'tasks/lib/parity/parity-timeouts'

await withscripttimeout('wanix:vm:zed-cafe:validate', SCRIPT_TOTAL_MS, async () => {
  // … headed Playwright work …
})
```

Do not add local `runwithscripttimeout` wrappers in group files — import the shared helper.
