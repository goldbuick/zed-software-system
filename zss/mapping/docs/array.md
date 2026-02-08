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
| `addToArray` | `[...array, value]` |
| `setIndex` | Immutable set at index |
| `removeIndex` | Immutable remove at index |
| `setAtIndex` | Alias for setIndex |
| `applyToIndex` | Merge props into object at index |
| `removeFromIndex` | Delete key from object at index |
| `findIndexByKey` | Find index where `item[key] === value` |
| `findByKey` | Find item where `item[key] === value` |
| `notEmpty` | Type guard: excludes null/undefined |
| `unique` | Dedupe and filter undefined |
| `average` | Mean of flattened numbers |
