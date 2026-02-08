# stats.ts

**Purpose**: Parses and formats stat declarations from `@` lines. Maps stat types (loader, board, object, range, select, number, etc.) to STAT_TYPE and value arrays. Used when loading codepages and interpreting stat metadata.

## Dependencies

- `./types` — NAME, STAT_TYPE

## Exports

| Export | Description |
|--------|-------------|
| `statformat(label, words, first?)` | Returns `{ type: STAT_TYPE, values: string[] }` |
| `stattypestring(type)` | STAT_TYPE → string name |

## statformat Modes

### First stat (first=true)

| First word | type | values |
|------------|------|--------|
| loader | LOADER | rest |
| board | BOARD | rest |
| object | OBJECT | rest |
| terrain | TERRAIN | rest |
| charset | CHARSET | rest |
| palette | PALETTE | rest |
| default | OBJECT | all words |

### Subsequent stats (first=false)

| Second word | type | values |
|-------------|------|--------|
| rn, range | RANGE | [target, label, …] |
| sl, select | SELECT | [target, label, …] |
| nm, number | NUMBER | [target, label, …] |
| tx, text | TEXT | [target, label, …] |
| hk, hotkey | HOTKEY | [target, label, …] |
| copyit | COPYIT | rest |
| openit | OPENIT | rest |
| viewit | VIEWIT | rest |
| runit | RUNIT | rest |
| zssedit | ZSSEDIT | rest |
| charedit | CHAREDIT | rest |
| coloredit | COLOREDIT | rest |
| default | CONST | all words |
