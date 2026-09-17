---
title: expr.ts
---

**Purpose**: Evaluates expressions from word arrays. Handles categories, collisions, colors, directions, and built-in expressions (aligned, contact, blocked, any, countof, abs, min, max, pick, random, run, etc.). Delegates to memory for board queries. Used when commands need computed values.

## Dependencies

- `zss/mapping/array` — pick, pickwith
- `zss/mapping/number` — clamp, randominteger, randomintegerwith
- `zss/mapping/types` — MAYBE, isarray, isnumber, ispresent, isstring
- `zss/memory` — memoryreadboardbyevaldir
- `zss/memory/boardmovement` — memorycheckmoveboardobject
- `zss/memory/boardaccess` — memoryreadelement, memoryreadterrain, memorylistelement (color / group / kind)
- `zss/words/kind` — readkind (any/countof prefer registered kind names before group)
- `zss/memory/bookoperations` — memoryreadelementdisplay
- `zss/memory/runtime` — memoryruncodepage
- `zss/memory/spatialqueries` — memoryfindplayerforelement
- `zss/memory/boardlifecycle` — memoryelementmatchesstrgrouponboard (soft name / `@group` match)
- `zss/memory/types` — BOARD_ELEMENT
- `./category` — isstrcategory, mapstrcategory, readcategory
- `./collision` — isstrcollision, mapstrcollision, readcollision
- `./color` — isstrcolor, mapstrcolor, readcolor, readstrbg, readstrcolor
- `./dir` — isstrdir, mapstrdir, readdir
- `./group` — isstrgroup, readstrgroupcolor, readstrgroupname
- `./reader` — ARG_TYPE, READ_CONTEXT, readargs
- `./send` — parsesend
- `./types` — DIR, NAME

## Exports

| Export | Description |
|--------|-------------|
| `readexpr(index)` | Returns `[value, nextIndex]` |

## Expression Categories

### Category, Collision, Color, Dir

If word maps to category/collision/color/dir → delegate to readcategory, readcollision, readcolor, readdir.

### ZZT-style Flags

| Expr | Description |
|------|-------------|
| `aligned`, `alligned` | 1 if element aligned (same row/col) with player |
| `contact` | 1 if element adjacent to player |
| `blocked` dir | 1 if movement blocked in direction |
| `pget` dir attr | Remote attr (`id`, `x`/`y`, `p*`, `step`/`shoot` as dir, `light` as radius, …); 0 if missing |

### ZZT-style Queries

| Expr | Description |
|------|-------------|
| `any` kind/color/group | Registered kind name first (codepage / `empty`), else group or color |
| `any` dir kind/color/group | Element at dir dest; kind matches `element.kind`, not `@isbreakable` |
| `countof` kind/color/group | Count of matching elements |
| `countof` dir kind/color/group | 1/0 if element at dir matches |

When `breakable` is a loaded terrain kind, `any dir breakable` is ZZT `E_BREAKABLE` (kind name). A gem with `@isbreakable` does not match. If that kind is not loaded, `readkind` fails and group/stat matching still applies.

### Numeric

| Expr | Description |
|------|-------------|
| `rnd` | 0 or 1 |
| `rnd` n | 0 to n |
| `rnd` min max | min to max |
| `abs` a | Math.abs; a may be a full arith expression |
| `intceil`, `intfloor`, `intround` | Math variants; arg may be a full arith expression |
| `intsign` a | -1, 0, or 1 from sign of a; a may be a full arith expression |
| `clamp` a min max | clamp; each slot may be a full arith expression |
| `min`, `max` | Math.min/max over args; each arg may be a full arith expression |
| `pick` … | random pick from args |
| `pickwith` seed … | deterministic pick |
| `random` a [b] | random integer |
| `randomwith` seed a [b] | deterministic random |

Nested unaries without parens are valid (`intsign abs p1`, `intsign abs playery - thisy`). Multi-arg slots each consume one arith expression, so `min a + b c` is `min(a+b, c)`; use parens to separate: `min (a + b) (c + d)`.

### Advanced

| Expr | Description |
|------|-------------|
| `run` name | Run codepage; return get('arg') |
| `runwith` arg name | Set element.arg, run codepage, return get('arg') |

### Flags

If READ_CONTEXT.get(name) returns a value → use it (chip variables).

## readvargs

Internal: reads variable args until `|` or max count; used for min, max, pick, etc.
