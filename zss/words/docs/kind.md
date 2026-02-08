# kind.ts

**Purpose**: Parses kind values — element name with optional color prefix. Validates names against memory (memoryreadelementkind). Used when commands target elements by kind (e.g. any, countof, find).

## Dependencies

- `zss/mapping/types` — MAYBE, isarray, ispresent, isstring
- `zss/memory` — memoryreadelementkind
- `./color` — readcolor, readstrbg, readstrcolor
- `./reader` — READ_CONTEXT
- `./types` — COLOR, WORD

## Exports

| Export | Description |
|--------|-------------|
| `STR_KIND` | `[string, STR_COLOR?]` — name and optional color |
| `isstrkind` | Type guard for STR_KIND |
| `readname(index)` | Returns `[string | undefined, nextIndex]` |
| `readkind(index)` | Returns `[STR_KIND | undefined, nextIndex]` |
| `readstrkindname` | STR_KIND → name |
| `readstrkindcolor` | STR_KIND → fg COLOR |
| `readstrkindbg` | STR_KIND → bg COLOR |

## readkind Logic

1. If word is already STR_KIND → return it
2. Try readcolor (optional), then readname
3. Validate name: `empty` or memoryreadelementkind({ kind: name })
4. Return `[[name, color], nextIndex]` or `[undefined, index]`
