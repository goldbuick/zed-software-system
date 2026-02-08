# loadertext.ts

**Purpose**: Implements `loadertext` — a `FIRMWARE_COMMAND` that reads from a text file line-by-line with optional regex capture. Used by `#readline` in loader context.

## Dependencies

- `zss/device/api` — TEXT_READER
- `zss/firmware` — FIRMWARE_COMMAND type
- `zss/mapping/number` — clamp
- `zss/memory/loader` — memoryloadercontent

## Usage

`#readline <kind> [args…]`

## Operations

### seek

`#readline seek <cursor>`

Sets the line cursor to the given index (0-based). Clamped to valid range.

### line

`#readline line`

Advances to the next line. Cursor is clamped to `[0, lines.length - 1]`.

### Regex Capture

`#readline <regex> <name1> [name2] …`

- Matches `regex` (case-insensitive) against the current line
- Capture group 1 → `name1`, group 2 → `name2`, etc.
- Unmatched captures get `0`
- Remaining words are parsed as stat names

**Example**:

```
#readline ^(\d+)\s+(\w+)$ count label
```

If line is `42 foo`, sets `count=42`, `label='foo'`.

## Implementation

- Uses `textreader.lines[textreader.cursor]` for current line
- `new RegExp(kind, 'i')` for pattern
- `result[m]` for capture groups (m=1,2,…)
- Cursor is not advanced by regex; use `line` to move to next line
