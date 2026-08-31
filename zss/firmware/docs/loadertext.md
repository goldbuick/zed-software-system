---
title: loadertext.ts
---

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

Sets the line cursor (0-based). Clamped to `[0, lines]` — **`cursor = lines` is EOF** (one past the last line).

### next

`#readline next`

Advances the cursor by one (clamped to EOF).

### Regex Capture

`#readline <regex> <name1> [name2] …`

- Matches `regex` (case-insensitive) against the **current** line
- Capture group 1 → `name1`, group 2 → `name2`, etc.
- Unmatched captures on a real line get `0`
- **Does not advance** — use `#readline next` to move
- On **EOF** (`cursor = lines`): every capture name is set to `''` (empty string)

**Example**:

```
#readline ^(\d+)\s+(\w+)$ count label
```

If line is `42 foo`, sets `count=42`, `label='foo'`. Cursor stays put.

### End of file

| Check | Meaning |
|-------|---------|
| `#while not eof do` / `#if not eof` | Readable `eof` flag: `1` when `cursor = lines`, else `0` |
| `#if cursor = lines` | Same EOF condition via cursor |
| empty capture after `#readline` | On EOF, captures are `''` (vs `0` for a failed match on a real line) |

Loop sketch:

```
#while not eof do
#readline "^(.*)$" line
' ... use $line ...
#readline next
#done
```

Rematch the same line (cursor does not move on regex):

```
#readline "(.*?)\|(.*?):(.*)" chatuser chatvoice chattext
#readline "(.*?)\|(.*?):(https?://\S+)$" chatuser chatvoice url
```

## Implementation

- Uses `textreader.lines[textreader.cursor]` for current line when `cursor < lines`
- `new RegExp(kind, 'i')` for pattern
- `result[m]` for capture groups (m=1,2,…)
- Cursor range is `[0, lines.length]` inclusive
