---
name: no-hanging-scripts
description: >-
  Prevents tests, scripts, and dev servers from hanging without exiting.
  Use before running Jest, yarn scripts, background shells, lang/WASM tests,
  vite preview/dev, or when a command stalls, runs too long, or fails to return.
---

# No hanging scripts

Hanging commands waste time. **Never start a long or risky command without a plan to detect, bound, or kill it.**

## Before you run anything

1. **Classify the command**
   - **Fast** (<30s): lint, single test file, small script → run foreground, default timeout OK
   - **Medium** (30s–3m): full `app:test`, `lang-regression:test`, builds → set `block_until_ms` with buffer
   - **Risky**: WASM `loadscriptsync`, dev servers, loops, e2e → extra guards below

2. **Never assume Jest will save you**
   - `testTimeout` only applies to **async** work
   - **Synchronous infinite loops block the event loop** — Jest cannot interrupt them
   - A "hung" Jest worker often means sync code, not a slow test

3. **Prefer narrow runs while iterating**
   - One file: `yarn jest path/to/file.test.ts --no-coverage`
   - Filter: `yarn jest -t "pattern"`
   - Full suite only when validating before commit/PR

4. **Background only when necessary**
   - Dev servers (`app:preview`, `vite:dev`) → background + verify with `curl` + kill when done
   - Do **not** background Jest or one-off scripts unless monitoring output

## Red flags — fix before running

| Pattern | Risk | Fix |
|---------|------|-----|
| `loadscriptsync(...).run()` with hand-rolled stub chip | Sync infinite `while(true)` | Use `createwasmstubchip()` from `zss/feature/lang/backend/wasm/testhelpers/wasmruntestutil.ts` |
| `getcase: () => 1` without advancing `nextcase` | Stuck on one case forever | Advance `ec` in `nextcase`, or use `createwasmstubchip()` |
| `sy: () => false` with no loop counter | Never yields | Mirror real chip: yield after `RUNTIME.YIELD_AT_COUNT` polls |
| `command` returning `1` without yield path | `continue` loops forever | Return `0`, or stub `yield` / `sy` like production |
| Emscripten / native compile in test with no cache | Slow first run, looks hung | Wait for first `g++` build; use `--no-coverage` |

## This repo: WASM lang tests

Compiled WASM scripts use a **synchronous** top-level loop:

```text
while (true) {
  if (api.sy()) return 1;
  switch (api.getcase()) { ... }
  api.nextcase();
}
```

**Required for direct `loadscriptsync` tests:**

```typescript
import {
  createwasmstubchip,
  runwasmscriptfortest,
} from 'zss/feature/lang/backend/wasm/testhelpers/wasmruntestutil'

const chip = createwasmstubchip({
  command(...words) { /* ... */ return 0 },
})
runwasmscriptfortest(wasmbytes, chip)
```

**Automatic safety net:** In Jest workers, `loadscriptsync` applies a default **16_384** `sy()` poll budget (`zss/feature/lang/wasmloader.ts`). Stuck loops throw instead of hanging.

- Override budget: `loadscriptsync(bytes, chip, { runbudget: 512 })`
- Disable in worker: `ZSS_WASM_RUN_BUDGET=0`
- Regression test: `ops/tests/unit/feature/lang/backend/wasm/__tests__/wasmrunbudget.test.ts`

## When a command runs too long

1. **Check terminal output** — PASS line may be pending; look for compile step (`g++`, emscripten)
2. **If no output progress** for 2× expected duration → treat as hung
3. **Kill the process** (`kill <pid>`) — do not wait indefinitely
4. **Diagnose root cause** (bad stub, sync loop, open handle) — do not retry blindly
5. **Re-run targeted** after fix, not full suite

## Jest exit hygiene

- Global teardown clears modem Awareness: `zss/testsupport/jestglobalteardown.cjs`
- CI uses `forceExit: true` in `ops/jest.config.ts` when `CI=true`
- Debug stray handles locally: `yarn jest <file> --detectOpenHandles`
- If tests pass but process won't exit → find `setInterval` / unclosed servers / modem leaks

## Dev servers

```bash
# Start background only when needed
yarn app:preview

# Verify (this project uses HTTPS preview)
curl -sk -o /dev/null -w "%{http_code}\n" https://127.0.0.1:7777/

# Kill when done
kill <pid>
```

## Command timeouts (agent shell)

| Command | Suggested `block_until_ms` |
|---------|---------------------------|
| Single jest file | 60_000 |
| `yarn app:test` | 120_000 |
| `yarn lang-regression:test` | 180_000 |
| `yarn lang:build` | 300_000 |
| `yarn app:build:strict` | 600_000 |

Set `block_until_ms` **above** expected runtime. If sent to background, poll terminal file — do not assume completion.

## Adding new tests that call WASM run

Checklist:

- [ ] Uses `createwasmstubchip()` or real `createchip()` (real chip yields via `sy()`)
- [ ] Script terminates (`#die`, default case `return 0`, or yield)
- [ ] Not relying on Jest timeout to catch sync loops
- [ ] Run single file first: `yarn jest <new-file> --no-coverage`

## Examples

See [examples.md](examples.md).
