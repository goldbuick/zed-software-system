# palette.ts

**Purpose**: Exports `PALETTE` — default 16-color palette as hex array. Used by gadget display, parse (ANSI), and memory codepage operations.

## Exports

| Export | Description |
|--------|-------------|
| `PALETTE` | Uint8Array from `hex2arr` — 16 colors (RGB values) |

## Consumed By

- `zss/feature/parse/ansi.ts` — loadpalettefrombytes fallback
- `zss/memory/codepageoperations.ts`
- `zss/gadget/hooks.ts`, `display/*`, `graphics/*`
