# types.ts

**Purpose**: Defines shared enums and types for the words system — COLOR, COLLISION, CATEGORY, DIR, STAT_TYPE, and utility types (PT, WORD, WORD_RESULT). Used across all word parsers and the chip API.

## Dependencies

- `zss/mapping/types` — isstring

## Exports

### Enums

| Enum | Values |
|------|--------|
| `COLOR` | BLACK, DKBLUE, … WHITE; ONBLACK … ONWHITE, ONCLEAR; BLBLACK … BLWHITE |
| `COLLISION` | ISWALK, ISSOLID, ISSWIM, ISBULLET, ISGHOST |
| `CATEGORY` | ISTERRAIN, ISOBJECT |
| `DIR` | IDLE, NORTH, SOUTH, WEST, EAST, BY, AT, FLOW, SEEK, RNDNS, RNDNE, RND, CW, CCW, OPP, RNDP, AWAY, TOWARD, FIND, FLEE, TO, MID, OVER, UNDER, GROUND, WITHIN, AWAYBY, ELEMENTS |
| `STAT_TYPE` | LOADER, BOARD, OBJECT, TERRAIN, CHARSET, PALETTE, CONST, RANGE, SELECT, NUMBER, TEXT, HOTKEY, COPYIT, OPENIT, VIEWIT, RUNIT, ZSSEDIT, CHAREDIT, COLOREDIT |

### Types

| Type | Description |
|------|-------------|
| `STAT` | `{ type: STAT_TYPE, values: string[] }` |
| `PT` | `{ x: number, y: number }` |
| `WORD` | `string \| number \| undefined \| WORD[]` |
| `WORD_RESULT` | `0 \| 1` (command return) |

### Functions

| Function | Description |
|----------|-------------|
| `NAME(name)` | Normalizes to lowercase trimmed string; else `''` |

## Context

- COLOR indices align with display/terminal color codes
- STAT_TYPE values map to `@` stat declaration formats in codepages
- DIR.MID is the default layer (between OVER and UNDER)
