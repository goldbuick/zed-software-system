# dir.ts

**Purpose**: Parses direction values from word arrays. Supports cardinal directions, modifiers (cw, ccw, opp), pathfinding (away, toward, find, flee), and compound dirs with args (by x y, at x y, within n, awayby n). Used for movement and spatial queries.

## Dependencies

- `zss/mapping/types` — MAYBE, isarray, ispresent, isstring
- `./reader` — ARG_TYPE, READ_CONTEXT, readargs
- `./types` — DIR, NAME, PT, WORD

## Exports

| Export | Description |
|--------|-------------|
| `dirconsts` | String → STR_DIR_CONST mapping |
| `ispt` | Type guard for PT |
| `ptapplydir` | Mutates pt by cardinal direction |
| `dirfromdelta` | (dx, dy) → DIR (cardinal) |
| `dirfrompts` | (last, current) → DIR |
| `mapstrdir` | Maps string to STR_DIR_CONST or undefined |
| `mapstrdirtoconst` | STR_DIR/string → DIR enum |
| `isstrdir` | Type guard for STR_DIR |
| `readdir(index)` | Returns `[STR_DIR | undefined, nextIndex]` |
| `EVAL_DIR` | `{ dir, startpt, destpt, layer, targets }` |

## STR_DIR Format

Array of STR_DIR_CONST and numbers. Modifiers (CW, CCW, OPP, etc.) can be followed by more dirs. Direction args:

| Dir | Args |
|-----|------|
| BY, AT, AWAY, TOWARD | x, y (numbers) |
| FIND, FLEE | kind |
| TO | dir1, dir2 (combined dest) |
| WITHIN, AWAYBY | amount (number) |

## readdir Logic

1. Read dir const(s); mods (CW, CCW, OVER, etc.) allow more dirs
2. For BY/AT/AWAY/TOWARD: read two numbers
3. For FIND/FLEE: read kind (TODO: full impl)
4. For TO: read two dirs; combine destpts relative to element
5. For WITHIN/AWAYBY: read number
6. Return STR_DIR or `[undefined, index]`
