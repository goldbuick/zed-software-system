---
title: dir.ts
---

**Purpose**: Parses direction values from word arrays. Supports cardinal directions, modifiers (cw, ccw, opp), pathfinding (away, toward, find, flee), and compound dirs with args (by x y, at x y, within n, awayby n, inrect …). Used for movement and spatial queries. Absolute AABB regions share helpers in [`rect.ts`](rect.md).

## Dependencies

- `zss/mapping/types` — MAYBE, isarray, ispresent, isstring
- `./kind` — STR_KIND (for STR_DIR type)
- `./reader` — ARG_TYPE, READ_CONTEXT, readargs
- `./rect` — parserectoneword, parserectfromnumbers, normalizerect
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

Array of STR_DIR_CONST, STR_KIND, numbers, and strings. Modifiers (CW, CCW, OPP, etc.) can be followed by more dirs. Direction args:

| Dir | Args |
|-----|------|
| BY, AT, AWAY, TOWARD | x, y (numbers) |
| FIND, FLEE | group |
| TO | dir1, dir2 (combined dest) |
| WITHIN, AWAYBY | amount (number) |
| INBEAM | width (number) |
| INRECT | absolute inclusive AABB: `x1 y1 [x2 y2]` or one word `x1,y1,x2,y2` |
| SELECT | selectmode (string), group |

`INRECT` fills `EVAL_DIR.targets` with every in-board cell in the AABB (`destpt` = corner `pt1`). Disk blast stays on `WITHIN`; inrect is axis-aligned only.

## readdir Logic

1. Read dir const(s); mods (CW, CCW, OVER, etc.) allow more dirs
2. For BY/AT/AWAY/TOWARD: read two numbers
3. For FIND/FLEE: read group
4. For TO: read two dirs; combine destpts relative to element
5. For WITHIN/AWAYBY: read number
6. For INBEAM: read width
7. For INRECT: parse via shared rect helper (one-word or four numbers)
8. For SELECT: read selectmode (string) and group
9. Return STR_DIR or `[undefined, index]`
