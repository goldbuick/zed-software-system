# number.ts

**Purpose**: Numeric utilities — clamp, snap, makeeven, and seeded/random number generation. Uses Alea PRNG for deterministic randomness.

## Dependencies

- `alea` — Seeded PRNG
- `maath/misc` — clamp

## Exports

| Export | Description |
|--------|-------------|
| `clamp` | Clamp value (re-export from maath) |
| `makeeven` | Round down to even (2 * floor(value/2)) |
| `snap` | Snap value to nearest multiple |
| `randomnumber` | [0,1) from fixed seed |
| `randomnumberwith(seed)` | [0,1) from seed |
| `randominteger(a, b)` | Random int in [min, max] inclusive |
| `randomintegerwith(seed, a, b)` | Deterministic random int |

## Implementation Notes

- Default PRNG uses fixed seed `'089fad0j9awfem09wavefc09uwaef'`
- `randominteger` uses `min + floor(rng() * (max - min + 1))`
