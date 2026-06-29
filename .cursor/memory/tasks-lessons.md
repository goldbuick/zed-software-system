# Task migration lessons (agent memory)

Persistent notes from the `tasks/implementations/` → `tasks/groups/` inline migration and `tasks/lib/` extraction (2026). Rule: `task-manifest.mdc`. Skill: `task-groups`.

## Registry is the first test

`yarn task list` loads every `tasks/groups/*.ts` at startup. Top-level `zss/*` imports (e.g. through `guid` → `nanoid-dictionary`) break the registry on Node 24 before handlers run. Fix: dynamic `import()` inside handlers or lazy loaders in `tasks/lib/`.

## Layer split

| Layer | Path | Examples |
|-------|------|----------|
| Task glue | `tasks/lib/` | `parity-runtime`, `playwright-vm`, `cliargv`, `parity-timeouts` |
| Task spawn | `tasks/shellutil.ts` | `spawntask`, `runjest`, `checkrg` |
| Domain | `ops/lib/` | `zztcorpuswalk`, `zztcorpussanitize`, `fixturepaths` |

If Jest tests and multiple subjects need it → `ops/lib/`, not `tasks/lib/`.

## Extraction order that worked

1. Wanix Playwright hub + delete duplicate timeout wrappers
2. `loaddaisyparityruntime()` for daisy parity handlers
3. Extend `shellutil.ts` (deploy/app/lang/content)
4. `cliargv.ts` for limit/force parsing
5. ZZT corpus walk → `ops/lib/content/zztcorpuswalk.ts`

## Footguns

- `withscripttimeout(label, ms, fn)` — label **first** (not ms first)
- Jest needs `'^tasks/(.*)$'` in `moduleNameMapper` — tsconfig alias alone is insufficient
- Inlining scripts: `createHash` → `node:crypto`, `inflateSync` → `node:zlib`
- `fileURLToPath` was dead code in many inlined daisy handlers — remove when consolidating
- Do not commit `/tmp` transform scripts or new `.mjs` scaffolding — user rejected that pattern

## Canonical vs legacy

- **Canonical:** `tasks/groups/*.ts` + `tasks/registry.ts` + `tasks/lib/` + `ops/lib/`
- **`tasks/implementations/`** — removed (2026); do not recreate

## Verification habit

After any group-file edit: `yarn task list` → `yarn task explain <id>` → targeted Jest.
