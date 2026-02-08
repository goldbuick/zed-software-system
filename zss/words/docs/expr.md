# expr.ts

**Purpose**: Evaluates expressions from word arrays. Handles categories, collisions, colors, directions, and built-in expressions (aligned, contact, blocked, any, countof, abs, min, max, pick, random, run, etc.). Delegates to memory for board queries. Used when commands need computed values.

## Dependencies

- `zss/mapping/array` — pick, pickwith
- `zss/mapping/number` — clamp, randominteger, randomintegerwith
- `zss/mapping/types` — MAYBE, isarray, isnumber, ispresent, isstring
- `zss/memory/boardmovement` — memorycheckmoveboardobject
- `zss/memory/boardoperations` — memoryreadelement, memoryreadterrain
- `zss/memory/bookoperations` — memoryreadelementdisplay
- `zss/memory/runtime` — memoryruncodepage
- `zss/memory/spatialqueries` — memoryfindplayerforelement, memorylistboardelementsbycolor, memorylistboardelementsbykind
- `zss/memory/types` — BOARD_ELEMENT
- `./category` — isstrcategory, mapstrcategory, readcategory
- `./collision` — isstrcollision, mapstrcollision, readcollision
- `./color` — isstrcolor, mapstrcolor, readcolor, readstrbg, readstrcolor
- `./dir` — isstrdir, mapstrdir, readdir
- `./kind` — readstrkindcolor, readstrkindname
- `./reader` — ARG_TYPE, READ_CONTEXT, readargs
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
| `aligned` | 1 if element aligned (same row/col) with player |
| `contact` | 1 if element adjacent to player |
| `blocked` dir | 1 if movement blocked in direction |

### ZZT-style Queries

| Expr | Description |
|------|-------------|
| `any` kind/color | Elements matching kind or color on board |
| `any` dir kind/color | Element at dir dest matching kind/color |
| `countof` kind/color | Count of matching elements |
| `countof` dir kind/color | 1/0 if element at dir matches |

### Numeric

| Expr | Description |
|------|-------------|
| `rnd` | 0 or 1 |
| `rnd` n | 0 to n |
| `rnd` min max | min to max |
| `abs` a | Math.abs |
| `intceil`, `intfloor`, `intround` | Math variants |
| `clamp` a min max | clamp |
| `min`, `max` | Math.min/max over args |
| `pick` … | random pick from args |
| `pickwith` seed … | deterministic pick |
| `random` a [b] | random integer |
| `randomwith` seed a [b] | deterministic random |

### Advanced

| Expr | Description |
|------|-------------|
| `run` name | Run codepage; return get('arg') |
| `runwith` arg name | Set element.arg, run codepage, return get('arg') |

### Flags

If READ_CONTEXT.get(name) returns a value → use it (chip variables).

## readvargs

Internal: reads variable args until `|` or max count; used for min, max, pick, etc.
