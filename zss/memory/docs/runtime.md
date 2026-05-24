# runtime.ts

**Purpose**: Chip OS, tick loop, CLI run. Manages the chip VM — message routing, codepage execution, loader execution, board ticks.

The same `memorytickmain` runs in two places:

- The **sim VM** uses it indirectly (via [`boardrunner.ts`](../../device/boardrunner.ts) / [`boardrunner/tick.ts`](../../device/boardrunner/tick.ts) when the boardrunner worker calls back through this module after receiving a `boardrunner:tick`); the sim VM itself only runs `memorytickloaders` directly.
- The **boardrunner worker** calls `memorytickmain(timestamp, [board], halt)` for the single board it has been elected to run, after the sim VM has streamed the board / boundary jsonpipe deltas.

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
| Tick | `memorytickloaders()` | Increments `mainbook.timestamp` and runs every loader |
| Tick | `memorytickmain(timestamp, boards, playeronly?)` | Runs draw + update passes for every supplied board; called by the boardrunner with `[board]` and by the sim VM only for diagnostics |
| Tick | `memorytickobject(book, board, object, code)` | One object's chip step |
| Tick | `memorytickonce(book, board, element, code, id, label)` | One-shot draw / once execution |
| Run | `memoryruncodepage(address, label)` | Runs a codepage once with the given label and current `READ_CONTEXT` |
| UI | `memoryunlockscroll(id, player)` | Releases an element's scroll lock for a player |
| Synth | `memoryapplyboardsynthstats(board)` | Applies stat-driven synth/fx config from the board codepage |
