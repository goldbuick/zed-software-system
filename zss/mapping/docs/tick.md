# tick.ts

**Purpose**: Tick rate and timing constants. Defines game loop timing and waitfor promise.

## Dependencies

None.

## Exports

| Export | Description |
|--------|-------------|
| `TICK_RATE` | 80 ms per tick (~12.5 fps) |
| `TICK_FPS` | 1000 / TICK_RATE |
| `CYCLE_DEFAULT` | 3 (cycle stat default) |
| `waitfor(ms)` | Promise that resolves after ms |

## Context

- TICK_RATE drives the main game loop
- CYCLE_DEFAULT used for element cycle stat when unspecified
