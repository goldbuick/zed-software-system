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
| CLI | memoryrepeatclilast |
| Tick | memorytickmain (loaders, boards, chips) |
| Run | memoryruncodepage |
