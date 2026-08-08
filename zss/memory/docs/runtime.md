---
title: runtime.ts
---

**Purpose**: Chip OS, tick loop, CLI run. Manages the chip VM — message routing, codepage execution, loader execution, board ticks.

The sim VM calls `memorytickmain` directly from [`handleticktock`](../../device/vm/handlers/ticktock.ts) for every board with active players. There is no separate boardrunner worker.

## Dependencies

- `ts-extras` — objectKeys
- `zss/device/api` — MESSAGE, synthplay
- `zss/device/session` — SOFTWARE
- `zss/firmware/runner` — DRIVER_TYPE
- `zss/mapping/guid` — ispid
- `zss/mapping/tick` — TICK_FPS
- `zss/os` — createos
- `zss/perf/ui` — perfmeasure
- `zss/words/reader` — READ_CONTEXT
- `zss/words/types` — NAME
- `./boardaccess` — memoryreadobject
- `./boarddrawdirty` — memoryupdatedrawdirty
- `./boards` — memoryinitboard, memoryreadelementstat
- `./boardtick` — memorytickboard
- `./bookoperations` — memoryreadcodepage
- `./books` — memoryensuresoftwarebook
- `./boundaries` — memoryboundarydelete
- `./codepageoperations` — memoryreadcodepagestats
- `./codepages` — memorypickcodepagewithtypeandstat
- `./flags` — memoryreadflags
- `./loader` — memoryloaderarg
- `./playermanagement` — memoryreadplayerboard
- `./runtimeboundary` — memoryreadboardelementruntime, memoryreadboardruntime
- `./session` — memoryreadbookbysoftware, memoryreadloaders, memoryreadoperator
- `./synthstate` — memorymergesynthvoice, memorymergesynthvoicefx, memoryreadsynthplay

## Exports

| Category | Function | Notes |
|----------|----------|-------|
| Chip lifecycle | `memorygc()`, `memoryhaltchip(id)`, `memoryrestartallchipsandflags()`, `memorymessagechip(message)` | `memoryrestartallchipsandflags` also frees every flag-backed boundary |
| CLI | `memoryrepeatclilast(player)`, `memoryruncli(player, cli, tracking?)` | `tracking=true` saves into `flags.playbuffer` |
| Tick | `memorytickloaders()` | Increments `mainbook.timestamp`, runs every loader; restores/saves per-loader board/object targeting via [`loader.ts`](loader.md) snapshot helpers |
| Tick | `memorytickmain(timestamp, boards, playeronly?)` | Runs draw + update passes for every supplied board; called from sim `handleticktock` |
| Tick | `memorytickobject(book, board, object, code)` | One object's chip step |
| Tick | `memorytickonce(book, board, element, code, id, label)` | One-shot draw / once execution |
| Run | `memoryruncodepage(address, label)` | Runs a codepage once with the given label and current `READ_CONTEXT` |
| UI | `memoryunlockscroll(id, player)` | Releases an element's scroll lock for a player |
| Synth | `memoryapplyboardsynthstats(board)` | Applies stat-driven synth/fx config from the board codepage |
