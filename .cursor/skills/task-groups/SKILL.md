---
name: task-groups
description: >-
  Edit citty task groups (tasks/groups/*.ts), extract shared glue to tasks/lib/
  and ops/lib/, and keep yarn task list registry-safe. Use when adding tasks,
  inlining scripts, refactoring daisy/content handlers, or debugging
  registry load failures (nanoid-dictionary, etc.).
---

# Task groups

Citty tasks are defined in [`tasks/groups/<subject>.ts`](../../../tasks/groups/) and registered via [`tasks/registry.ts`](../../../tasks/registry.ts). Skill complements rule `task-manifest.mdc` and memory [`.cursor/memory/tasks-lessons.md`](../../memory/tasks-lessons.md).

## Before you edit

1. Run `yarn task list` — baseline that registry loads.
2. Read the target group file's existing patterns (handler style, dynamic imports).
3. Decide layer:
   - **Task infrastructure** → `tasks/lib/` (spawn wrappers, Playwright, parity vite, argv)
   - **Domain shared with tests** → `ops/lib/` (corpus walk, sanitize, fixturepaths)

## Registry-safe imports

`registry.ts` imports all group files at load time.

```typescript
// ❌ BAD — breaks yarn task list on Node 24
import { something } from 'zss/mapping/guid'
import { loadcoolregionsbowelementlibrary } from 'ops/lib/coolregionsbowbook'

// ✅ GOOD — lazy inside handler
run: handler(async (ctx) => {
  const { loadcoolregionsbowelementlibrary } = await import('ops/lib/coolregionsbowbook')
  …
})
```

## Shared modules (use these, don't copy)

| Need | Import from |
|------|-------------|
| Spawn + env | `tasks/shellutil` — `spawntask`, `taskenv`, `requiretaskenv`, `runjest`, `checkrg` |
| CLI flags | `tasks/lib/cliargv` — `readlimit`, `readforce`, `hasflag` |
| Daisy parity Playwright | `loaddaisyparityruntime` from `tasks/lib/daisy/parity-runtime` |
| Parity timeouts | `withscripttimeout(label, ms, fn)` from `tasks/lib/parity/parity-timeouts` |
| ZZT corpus file walk + OOP compile | `ops/lib/content/zztcorpuswalk` |
| ZZT corpus layout / element extract | `ops/lib/content/zztcorpus` |
| Fixture path constants | `ops/lib/fixturepaths` |

## Adding a leaf task

```typescript
def('subject:verb:qualifier', {
  description: '…',
  tags: ['ci'],           // optional
  run: handler(async (ctx) => {
    const path = (await import('node:path')).default
    // or: const rt = await loaddaisyparityruntime()
    …
    return 0
  }),
}),
```

Export array at bottom: `export const SUBJECT_TASKS: TaskDef[] = [ … ]`.

## Daisy parity handlers

Many handlers share parity Playwright + vite imports. Pattern:

```typescript
const {
  path,
  writeFileSync,
  launchparitybrowser,
  parityhosturl,
  startparityvite,
  stopparityvite,
  withscripttimeout,
  RENDERS_FIXTURES_DIR,
} = await loaddaisyparityruntime()
```

Handlers that also need **other** exports from `parity-timeouts` (e.g. `EXEC_GATE_TIMEOUT_MS`, `CALIBRATE_SCRIPT_TIMEOUT_MS`) keep a separate dynamic import for those constants only — do not re-import `withscripttimeout` twice.

## Content / lang corpus

- Walk `.zzt`/`.brd` trees: `collectzztcorpussourcefiles` from `ops/lib/content/zztcorpuswalk`
- Compile-check OOP: `compilezztoop`
- Profanity/sanitize: `ops/lib/content/zztcorpussanitize` (see rule `zzt-corpus-sanitize.mdc`)

## Mechanical bulk edits

For 10+ identical import blocks in one group file:

1. Extract loader to `tasks/lib/`.
2. Run transform from `/tmp` (not committed to repo).
3. `yarn task list` + targeted Jest.

## Jest

Tests importing `tasks/groups/content.ts` (or any `tasks/*`) require:

```typescript
'^tasks/(.*)$': '<rootDir>/tasks/$1',
```

in `ops/jest.config.ts`.

## Legacy

`tasks/implementations/` was deleted after the inline migration — do not recreate. All handlers live in `tasks/groups/`.

## Verify

```bash
yarn task list
yarn task explain <task-id>
yarn jest <path> --config ops/jest.config.ts --no-coverage
yarn task docs          # if descriptions changed
```
