---
title: loader.ts
---

**Purpose**: Loader dispatch — matches format and event to codepage loaders, runs them with arg/content/player. Used when importing files or handling events.

## Dependencies

- `zss/mapping/guid` — createsid
- `zss/mapping/types` — MAYBE, ispresent, isstring
- `zss/words/types` — WORD
- `./bookoperations` — memorylistcodepagebytype, memoryreadcodepage
- `./codepageoperations` — memoryreadcodepagestats
- `./types` — CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL

## Exports

| Export | Description |
|--------|-------------|
| `memoryloader(arg, format, idoreventname, content, player)` | Run matched loaders |
| `memoryloaderarg(id)` | Get loader arg |
| `memoryloadercontent(id)` | Get loader content |
| `memoryloaderformat(id)` | Get loader format |
| `memoryloadermatches(format, idoreventname)` | Find matching loader codepages |
| `memoryloaderreadcontextapply(id)` | Restore per-loader `board` / `element` targeting into `READ_CONTEXT` |
| `memoryloaderreadcontextsave(id)` | Persist targeting fields after a loader tick |
| `memoryloaderrelease(id)` | Delete loader ref when chip ends |

## Loader READ_CONTEXT snapshot

Loaders that survive multiple ticks (`#idle`, import loops) need `#withboard` / `#withplayerboard` / `#withobject` targeting to persist. [`memorytickloaders`](runtime.md) calls:

1. `memoryloaderreadcontextapply(id)` before each tick (defaults on first tick)
2. `memoryloaderreadcontextsave(id)` after each tick
3. `memoryloaderrelease(id)` when the loader chip ends

Snapshot fields (only board/object targeting — not whole `READ_CONTEXT`): `board`, `element`, `elementid`, `elementisplayer`, `elementfocus`.
