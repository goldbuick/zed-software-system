# Charsets for zed.cafe

Raw `.chr` files: 256 glyphs × 14 bytes (8×14). Drag one into [zed.cafe](https://zed.cafe/) to import as a charset page (e.g. `@charset hybrid`).

| File | Order | Use |
|------|-------|-----|
| `petscii.chr` | CBM-II ROM order | Native screen codes from the Hi-Profile set |
| `petscii-ascii.chr` | ASCII typing order | `@` / `A`–`Z` / `a`–`z` / digits in familiar places |
| `hybrid.chr` | CP437 indices | Built-in CP437 + single-line H restyle + petscii A–F remaps |

## Source (PETSCII)

Real **CBM-II Hi-Profile** char ROM:

- [`characters.901232-02.bin`](https://www.zimmers.net/anonftp/pub/cbm/firmware/computers/b/characters.901232-02.bin) (Zimmers)
- Stored as **8×16**; zed.cafe uses rows **0–13** only (rows 14–15 are unused on hardware — see [Lemon64 thread](https://www.lemon64.com/forum/viewtopic.php?t=90060))

No stretching from C64 8×8. Diagonals in this set are codes **205** (`\`) and **206** (`/`).

## Hybrid

Built from engine default `CHARSET` in `zss/feature/charset.ts` plus `petscii.chr`. Does **not** replace the engine default.

1. Restyle pure single-line box glyphs (`179` `180` `191`–`197` `217` `218`) to 2-row H weight.
2. Remap petscii groups A–F into CP437 slots (21 glyphs). Pure doubles `186`–`188` / `200`–`206` stay CP437.

| Group | petscii src | hybrid dst |
|-------|-------------|------------|
| A diagonals | `205` `206` `214` | `171` `172` `210` |
| B wedges | `223` `233` | `182` `183` |
| C bars (offset) | `196`–`200` `210` `217` | `184` `189` `190` `199` `207` `209` `211` |
| D elbows | `201`–`203` `213` | `212`–`215` |
| E corners | `204` `207` `208` `250` | `181` `185` `208` `198` |
| F tee | `219` | `216` |

Rebuild:

```bash
python3 ops/public/fonts/build-hybrid.py
```

## Preview

`*.preview.png` and `*.mockup.png` are rendered from these `.chr` files (`builtin.preview.png` is the unmodified CP437 base).
