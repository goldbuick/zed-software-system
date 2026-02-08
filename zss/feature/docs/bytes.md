# bytes.ts

**Purpose**: Load palette and charset bitmaps from byte arrays. Used by parse (ANSI, CHR), codepage operations, gadget display.

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `loadpalettefrombytes` | `bytes` | Load palette bitmap from byte array |
| `loadcharsetfrombytes` | `bytes` | Load charset bitmap from byte array |
| `writecharfrombytes` | `bytes`, `charset`, `idx` | Write character data to charset at index |
| `readcharfrombytes` | `charset`, `idx` | Read character data from charset at index |

## Consumed By

- `zss/feature/parse/ansi.ts`, `parse/chr.ts`
- `zss/memory/codepageoperations.ts`
- `zss/gadget/hooks.ts`, `display/*`, `graphics/*`

## Related

- `palette.ts` — `PALETTE` default hex array
- `charset.ts` — `CHARSET` default hex array
