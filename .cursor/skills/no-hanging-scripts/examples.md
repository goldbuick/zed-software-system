# Hang prevention examples

## Bad — unbounded poll

```typescript
while (!ready) {
  await page.waitForTimeout(100)
}
```

## Good — wall-clock deadline

```typescript
const deadline = Date.now() + 30_000
while (!ready) {
  if (Date.now() > deadline) {
    throw new Error('guest ready timed out')
  }
  await page.waitForTimeout(100)
}
```

## Iterating on a fix

```bash
# 1. One file, no coverage
yarn jest ops/tests/unit/feature/lang/backend/typescript/ --no-coverage

# 2. After pass, broader
yarn jest ops/tests/unit/feature/lang/ --no-coverage

# 3. Full suite last
yarn task run ops:test
```

## Hung background Jest from a prior turn

```bash
# Find and kill — do not start a second jest on top
ps aux | rg '[j]est'
kill <pid>
```

## Preview server lifecycle

```bash
yarn task run cafe:build:strict
yarn task run cafe:preview &          # background
sleep 2
curl -sk -o /dev/null -w "%{http_code}\n" https://127.0.0.1:7777/
kill %1                     # or kill <pid>
```

## Task / Playwright script timeouts

Use `withscripttimeout` from `tasks/lib/parity/parity-timeouts.ts`.

**Signature is `(label, ms, fn)` — label first.** Swapping ms and label fails silently (wrong timeout or wrong log label).

```typescript
import { withscripttimeout } from 'tasks/lib/parity/parity-timeouts'

await withscripttimeout('ops:daisy:parity:render', SCRIPT_TOTAL_MS, async () => {
  // … headed Playwright work …
})
```

Do not add local `runwithscripttimeout` wrappers in group files — import the shared helper.
