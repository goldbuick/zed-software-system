# runtime.ts

**Purpose**: Chip OS, tick loop, CLI run. Manages the VM process — message routing, tick, loader execution, codepage run.

## Dependencies

- `ts-extras` — objectKeys
- `zss/device/api` — MESSAGE
- `zss/firmware/runner` — DRIVER_TYPE
- `zss/mapping/guid` — ispid
- `zss/mapping/tick` — TICK_FPS
- `zss/os` — createos
- `zss/words/reader` — READ_CONTEXT
- `./boardoperations` — memoryreadobject, memorytickboard
- `./bookoperations` — memoryreadcodepage
- `./loader` — memoryloaderarg
- `./playermanagement` — memoryreadbookplayerboards, memoryreadplayerboard

## Key Exports

| Category | Exports |
|----------|---------|
| Chip | memorygc, memoryhaltchip, memoryrestartallchipsandflags, memorymessagechip |
| CLI | memoryrepeatclilast, memoryruncli |
| Tick | memorytickloaders (sim loaders), memorytickmain (boards/chips on workers), memorytickobject |
| Run | memoryruncodepage(address, label) |
| Synth | memoryapplyboardsynthstats |
| UI | memoryunlockscroll |

## Chip / OS State Is Worker-Local

The `os = createos()` singleton in this module is **not** part of the jsonsync
projection. Each process (the simspace server and every boardrunner worker)
gets its own `os` instance, and the chip registry (`os.ids()`, chip message
queues, the running generator stacks for each chip) lives entirely in-memory
on that process.

Consequences:

- **Tick ownership drives chip ownership.** Under the phase 2 model the
  boardrunner worker runs `memorytickboard` for the boards it owns, so the
  chips driving those objects live on the worker's `os`. The server's `os`
  only runs chips for boards without an elected runner (and player chips, via
  `memoryruncli`).
- **Chip messages stay on the process that owns the chip.** `memorymessagechip`
  pushes into the local `os` queue. Cross-process messaging has to go through
  device messages; do not assume a `chip.message(...)` on the server reaches a
  worker chip of the same id.
- **Nothing in the chip runtime is synced.** Chip-local variables (generator
  locals, `chip.set(...)`, message queues, suspend state) never round-trip
  through jsonsync. Anything that must survive a tick hand-off (e.g. runner
  re-election, cross-board player handoff) has to live on `BOOK.flags` /
  `BOARD.objects` / other projected state.

If future work introduces persistent chip state that should survive a
runner change, it must be lifted out of `os`/chip internals and into the
`MEMORY` tree so that the existing projection/hydration path carries it.
