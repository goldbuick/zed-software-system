---
title: printvalue.ts
---

**Purpose**: Display stringify for `$name` template expansion in scroll text and double-quoted strings (`#set "key$color"`, etc.).

## Export

| Export | Description |
|--------|-------------|
| `formatprintvalue(value, name?)` | Returns a printable string/number/boolean for chip `print` / `template` |

## Behavior

- **Name-hinted numeric stats**: `color` / `bg` / `displaycolor` / `displaybg` → `COLOR[n].toLowerCase()`; `collision` → `COLLISION[n]`; `category` → `CATEGORY[n]`
- **Typed arrays**: `STR_COLOR`, `STR_COLLISION`, `STR_CATEGORY`, `STR_DIR` (nested `STR_GROUP` formatted), KIND/GROUP `[name, STR_COLOR?]`
- **Const strings** from firmware `maptoconst` (`BLUE`, `NORTH`, `ISWALK`, …) → lowercase
- Other numbers/strings unchanged; unknown arrays/objects keep the old `array N items` / `obj …` labels

Without a name hint, `9` stays `9` (so `$char` / `$cycle` are not treated as colors).
