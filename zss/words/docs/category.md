# category.ts

**Purpose**: Parses category values (isterrain, isobject) from word arrays. Maps string names to STR_CATEGORY_CONST. Used when commands need to filter by element category.

## Dependencies

- `zss/mapping/types` — MAYBE, isarray, ispresent, isstring
- `./expr` — readexpr
- `./reader` — READ_CONTEXT
- `./types` — CATEGORY, NAME, WORD

## Exports

| Export | Description |
|--------|-------------|
| `categoryconsts` | `{ isterrain: 'ISTERRAIN', isobject: 'ISOBJECT' }` |
| `isstrcategory` | Type guard for STR_CATEGORY |
| `mapstrcategory` | Maps string to STR_CATEGORY_CONST or undefined |
| `readcategory(index)` | Returns `[STR_CATEGORY | undefined, nextIndex]` |

## Types

| Type | Description |
|------|-------------|
| `STR_CATEGORY` | Array of STR_CATEGORY_CONST |
| `STR_CATEGORY_CONST` | `'ISTERRAIN' \| 'ISOBJECT'` |

## readcategory Logic

1. If word at index is already STR_CATEGORY or STR_CATEGORY_CONST → return it
2. If word maps via mapstrcategory → return `[const]`
3. Otherwise try readexpr (e.g. `any isterrain`) and check result
4. Return `[undefined, index]` on failure
