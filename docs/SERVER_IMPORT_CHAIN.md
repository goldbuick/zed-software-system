# Why firmware/cli (and rom) Load in Node (Server Context)

## Error

```
TypeError: (intermediate value).glob is not a function
    at zss/feature/rom/index.ts:21
```

`import.meta.glob` is Vite-only; it doesn't exist in Node. The rom module runs in Node and fails.

## Import Chain to rom

rom is imported by:
- `zss/firmware/cli.ts` ← `romparse`, `romprint`, `romread`
- `zss/device/vm.ts` ← (via firmware)
- `zss/screens/tape/autocomplete.ts` ← excluded by `tsconfig.server.json` (tab/screens)

So rom enters Node only through **firmware/cli**.

## How firmware/cli Gets Loaded

1. **`zss/firmware/runner.ts`** imports `CLI_FIRMWARE` from `./cli` (line 11)
2. **`zss/device/vm.ts`** imports from `zss/firmware/runner`
3. **`zss/simspace.ts`** imports `{ started }` from `./device/vm` (line 6)

So the chain is: **simspace → vm → firmware/runner → cli → rom**.

## Why simspace Loads in Node

simspace is a Web Worker used by the **cafe** (browser) app. It is only relevant at runtime in the browser. However:

1. **`yarn build:headless`** runs `vite build --config vite.headless.config.ts`
2. Vite builds the cafe entry (`cafe/index.html` → `index.tsx`) **and** worker entries (simspace, heavyspace, stubspace)
3. For the **simspace** worker bundle, Vite loads `simspace.ts`
4. That pulls in `device/vm` → `firmware/runner` → `firmware/cli` → `rom`
5. All of this happens **inside Vite’s Node process** during the build

So the failure occurs when Vite is building the simspace worker chunk. At that point:

- Vite runs in Node
- `rom/index.ts` is loaded and its top-level code runs
- `import.meta.glob` is not yet transformed (or the transform does not apply in that worker build path)
- `(import.meta).glob` is `undefined`, so `.glob(...)` throws

## Why tsx Might Also Hit It

If the error appears **after** the build (when `tsx` runs the server), then something in the server’s dependency tree is loading rom. Plausible path:

1. `main.tsx` → `api` → `gadget/data/types` (value import of `INPUT`, `SYNTH_STATE`)
2. `gadget/data/types` has `import type { COMMAND_ARGS_SIGNATURE } from 'zss/firmware'` — type-only, normally erased
3. Some runtimes or tools may still resolve and load `zss/firmware`
4. If resolution chooses `zss/firmware` the directory, entry could be `zss/firmware/runner.ts` (via index or similar)
5. `runner` imports `cli` → `rom`

Whether this happens depends on how `tsx` and `tsconfig.server.json` resolve `zss/firmware` and whether type-only imports are fully erased.

## Summary

| Context | Path to rom | Reason |
|--------|-------------|--------|
| **Vite build (headless)** | simspace → vm → runner → cli → rom | Worker bundling loads simspace in Node |
| **tsx server** (if seen) | Possible via types → firmware resolution | `import type` from firmware might still trigger loading |

## Fixes Applied

1. **rom guard**  
   `import.meta.glob` is only called when it exists (Vite). In Node, `romcontent` stays empty.

2. **Server at top level**  
   The server lives in `server/` (like `cafe/`), not `zss/server/`.
