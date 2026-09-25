---
title: charset.ts
---

**Purpose**: Exports `CHARSET` — default 8×14 character set bitmap as hex array. Used by gadget display, parse (CHR / Font Mania COM), and memory codepage operations.

## Book `world` charset

When rendering a board:

1. If the board has a `charset` stat → that charset codepage
2. Else if the board's book has `@charset world` → use that page
3. Else → engine default `CHARSET`

Board `charset` always wins over book `world`. Do not set `board.charset = world` for the fallback — leave the stat empty.

## Import

| Source | Codepage name | Book |
|--------|---------------|------|
| `.chr` | stem (`pokemon.chr` → `pokemon`) | first content book |
| Font Mania `.com` (e.g. Museum `Pokemon.com`) | `world` | last imported ZZT/SZT book, or staged until ZZT arrives |
| Raw `N×14` bytes named `.com` | `world` | same as Font Mania |

Font Mania 2.x layout: offset LE u16 @2, height @5 (must be 14), then 256×height glyph bytes. See [`fontmania.ts`](../parse/fontmania.ts).

## Exports

| Export | Description |
|--------|-------------|
| `CHARSET` | Uint8Array from `hex2arr` — character glyph bitmaps |

## Consumed By

- `zss/feature/parse/chr.ts`, `fontmania.ts`
- `zss/memory/codepageoperations.ts`, `boardvisuals.ts`
- `zss/gadget/hooks.ts`, `display/*`, `graphics/*`
- `zss/screens/panel/charedit.tsx`
