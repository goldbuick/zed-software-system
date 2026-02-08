# runner.ts

**Purpose**: Composes firmware modules into drivers and provides the orchestration API for command lookup, stat access, and tick hooks. The runner determines which firmwares are active for each execution context.

## Dependencies

- `zss/chip` — CHIP type
- `zss/firmware` — FIRMWARE, FIRMWARE_COMMAND types
- All firmware modules (audio, board, cli, element, loader, network, runtime, transforms)

## DRIVER_TYPE Enum

| Value | Purpose |
|-------|---------|
| `ERROR` | Error state; no firmwares |
| `CLI` | User input driving software/terminal (cli + standardlib) |
| `LOADER` | Importing content into books (loader + standardlib) |
| `RUNTIME` | Codepage execution (runtime + standardlib) |

## Firmware Composition

**Standard library** (included in CLI, LOADER, RUNTIME):
- `audio`
- `board`
- `network`
- `transform`
- `element`

**Driver composition**:
- CLI: `cli`, audio, board, network, transform, element
- LOADER: `loader`, audio, board, network, transform, element
- RUNTIME: `runtime`, audio, board, network, transform, element

## Exported Functions

### firmwarelistcommands(driver: DRIVER_TYPE): string[]

Returns all command names available for the driver (from all composed firmwares).

### firmwaregetcommand(driver, method): MAYBE\<FIRMWARE_COMMAND\>

Returns the command handler for `method`. Results are cached in `DRIVER_COMMANDS` per driver.

### firmwareget(driver, chip, name): [boolean, any]

Calls `get` on each firmware in order; returns first truthy result. Used for `chip.get` fallback.

### firmwareset(driver, chip, name, value): [boolean, any]

Calls `set` on each firmware in order; returns first truthy result. Used for `chip.set` fallback.

### firmwareeverytick(driver, chip)

Calls `everytick` on all firmwares in the driver.

### firmwareaftertick(driver, chip)

Calls `aftertick` on all firmwares in the driver.

## Implementation Notes

- `getfimrwares` returns the ordered list of FIRMWARE instances for a driver
- Command lookup iterates firmwares until one returns a handler
- get/set iterate until a firmware returns `[true, value]`
