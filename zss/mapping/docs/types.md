# types.ts

**Purpose**: Provides type guards, MAYBE type, deepcopy, and isbook. Re-exports isequal and ispresent from fast-json-patch and ts-extras. Core type utilities used throughout ZSS.

## Dependencies

- `fast-json-patch` — deepClone
- `react-fast-compare` — isEqual
- `ts-extras` — isPresent

## Exports

| Export | Description |
|--------|-------------|
| `isequal` | Deep equality (re-export from react-fast-compare) |
| `ispresent` | Truthy check excluding null/undefined (re-export from ts-extras) |
| `MAYBE<T>` | `T \| undefined` |
| `deepcopy` | Deep clone via fast-json-patch |
| `isboolean` | Type guard for boolean |
| `isnumber` | Type guard for number (excludes NaN) |
| `ismaybenumber` | Type guard for number \| undefined |
| `isstring` | Type guard for string |
| `ismaybestring` | Type guard for string \| undefined |
| `isarray` | Type guard for array |
| `ismaybearray` | Type guard for array \| undefined |
| `noop` | Identity function |
| `isbook` | Validates value has id, name, pages, activelist, flags |
