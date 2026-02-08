# charset.ts

**Purpose**: Exports `CHARSET` — default 8×8 character set bitmap as hex array. Used by gadget display, parse (CHR), and memory codepage operations.

## Exports

| Export | Description |
|--------|-------------|
| `CHARSET` | Uint8Array from `hex2arr` — character glyph bitmaps |

## Consumed By

- `zss/feature/parse/chr.ts`
- `zss/memory/codepageoperations.ts`
- `zss/gadget/hooks.ts`, `display/*`, `graphics/*`
- `zss/screens/panel/charedit.tsx`
