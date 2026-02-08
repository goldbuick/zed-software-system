# collision.ts

**Purpose**: Parses collision values (iswalk, issolid, isswim, isbullet, isghost) from word arrays. Maps string names to STR_COLLISION_CONST and COLLISION enum. Used when commands check or set collision flags.

## Dependencies

- `zss/mapping/types` — MAYBE, isarray, ispresent, isstring
- `./expr` — readexpr
- `./reader` — READ_CONTEXT
- `./types` — COLLISION, NAME, WORD

## Exports

| Export | Description |
|--------|-------------|
| `collisionconsts` | String → STR_COLLISION_CONST mapping |
| `collisionenums` | String → COLLISION enum mapping |
| `isstrcollision` | Type guard for STR_COLLISION |
| `mapstrcollision` | Maps string to STR_COLLISION_CONST or undefined |
| `mapstrcollisiontoenum` | STR_COLLISION → COLLISION |
| `readcollision(index)` | Returns `[STR_COLLISION | undefined, nextIndex]` |

## Aliases

| Alias | Maps To |
|-------|---------|
| iswalking, iswalkable | ISWALK |
| isswimming, isswimmable | ISSWIM |

## readcollision Logic

1. If word is already STR_COLLISION or STR_COLLISION_CONST → return it
2. Otherwise try readexpr and check result
3. Return `[undefined, index]` on failure
