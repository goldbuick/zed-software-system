# array.ts

**Purpose**: Array utilities — range, pick, pickwith, and immutable array helpers. Used for random selection, index manipulation, and iteration.

## Dependencies

- `./number` — randominteger, randomintegerwith
- `./types` — MAYBE, ispresent

## Exports

| Export | Description |
|--------|-------------|
| `range(a, b?, step?)` | Returns `[min..max]` by step; `range(5)` → 0..5 |
| `pick(...args)` | Random item from flattened args |
| `pickwith(seed, ...args)` | Deterministic random pick |
| `addtoarray` | `[...array, value]` |
| `setindex` | Immutable set at index |
| `removeindex` | Immutable remove at index |
| `setatindex` | Alias for setindex |
| `applytoindex` | Merge props into object at index |
| `removefromindex` | Delete key from object at index |
| `findindexbykey` | Find index where `item[key] === value` |
| `findbykey` | Find item where `item[key] === value` |
| `notempty` | Type guard: excludes null/undefined |
| `unique` | Dedupe and filter undefined |
| `average` | Mean of flattened numbers |
