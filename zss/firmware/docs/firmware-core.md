# firmware.ts (Core)

**Location**: `zss/firmware.ts` (parent of firmware folder)

**Purpose**: Defines the firmware factory and types. `createfirmware` builds a firmware module that can register commands and optional lifecycle/get/set hooks.

## Types

### FIRMWARE_COMMAND

```ts
(chip: CHIP, words: WORD[]) => 0 | 1
```

Command handlers receive the chip and parsed words. Return `0` for success, `1` for failure (e.g., blocked).

### FIRMWARE_EVENTS

Optional hooks passed to `createfirmware`:

| Hook | Signature | Description |
|-----|-----------|-------------|
| `get` | `(chip, name) => [boolean, any]` | Custom variable read; `[true, value]` = handled |
| `set` | `(chip, name, value) => [boolean, any]` | Custom variable write |
| `everytick` | `(chip) => void` | Called each tick before command execution |
| `aftertick` | `(chip) => void` | Called each tick after command execution |
| `list` | `() => string[]` | Custom command list (overrides default) |

### FIRMWARE

Result of `createfirmware`:

- `get`, `set` — Optional
- `everytick`, `aftertick` — Required (default no-op)
- `getcommand(name)` — Returns handler or undefined
- `command(name, func)` — Registers handler; returns firmware for chaining
- `listcommands()` — Returns registered command names

## createfirmware(events?)

Creates a firmware instance. Commands are registered via `.command(name, func)`. Event hooks override defaults.

## Example

```ts
const MY_FIRMWARE = createfirmware({
  get(chip, name) {
    if (name === 'special') return [true, 42]
    return [false, undefined]
  },
  everytick(chip) {
    // per-tick logic
  },
})
  .command('foo', (chip, words) => {
    chip.set('x', 1)
    return 0
  })
  .command('bar', (chip, words) => 1)
```
