# runtime.ts

**Purpose**: Defines `RUNTIME_FIRMWARE` — commands for runtime messaging, gadget UI, and scroll/text display. Handles the execution context when codepages run during gameplay.

## Dependencies

- `zss/device/api` — vmrefscroll
- `zss/gadget/data/api` — gadgetaddcenterpadding, gadgetcheckqueue, gadgetcheckset, gadgethyperlink, gadgetstate, gadgettext
- `zss/memory/gamesend` — memorysendtoelements, memorysendtolog
- `zss/words/send` — parsesend

## Hooks

### set(chip, name, value)

- Delegates to `gadgetcheckset` to monitor shared value changes
- Returns `[false, undefined]` so other firmwares can handle the write

### aftertick(chip)

Processes the gadget queue for the current element:

- **Single string** — If element exists: empty string clears sidebar; else sets tickertext, tickertime, logs
- **Multiple items** — If player: updates shared sidebar with padded content; else: sets scrolllock, scrollname, scroll for the focused player

## Commands

### Lifecycle

| Command | Description |
|---------|-------------|
| `endgame` | Sets health to 0 (triggers game-over flow) |

### Messaging

| Command | Args | Description |
|---------|------|-------------|
| `send` | send spec | Parse full send, dispatch to elements |
| `shortsend` | send spec | Parse short send, dispatch |

### UI

| Command | Args | Description |
|---------|------|-------------|
| `text` | text… | Set gadget text via gadgettext |
| `hyperlink` | label words… | Create hyperlink; uses chip.template for label/words; calls gadgethyperlink with get/set for flag resolution |
| `help` | — | Open reference scroll (vmrefscroll) |
| `stat` | — | No-op |

## Design Notes

- Runtime firmware overrides shared behavior (e.g., `text` → gadget text; `hyperlink` → gadget hyperlink with flag support)
- `aftertick` drives scroll and sidebar updates from the ticker queue
- `gadgetcheckset` allows shared values to trigger UI updates
