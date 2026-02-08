# color.ts

**Purpose**: Parses and maps color values from word arrays. Supports foreground, background (on*), numeric indices, and blink colors. Used for display attributes and matching elements by color.

## Dependencies

- `zss/mapping/types` — MAYBE, isarray, isnumber, ispresent, isstring
- `./reader` — READ_CONTEXT
- `./types` — COLOR, NAME, WORD

## Exports

| Export | Description |
|--------|-------------|
| `colortofg` | COLOR → fg index (undefined for bg/blink) |
| `colortobg` | COLOR → bg index (ONBLACK…ONCLEAR range) |
| `colorconsts` | String → STR_COLOR_CONST mapping (black, onblack, blblack, etc.) |
| `isstrcolor` | Type guard for STR_COLOR |
| `isbgstrcolor` | True if STR_COLOR starts with ON |
| `mapstrcolor` | Maps string to STR_COLOR_CONST or undefined |
| `mapcolortostrcolor` | (fg, bg) → [STR_COLOR_CONST, STR_COLOR_CONST] |
| `readstrcolor` | STR_COLOR → first fg COLOR |
| `readstrbg` | STR_COLOR → first bg COLOR |
| `readcolor(index)` | Returns `[STR_COLOR | undefined, nextIndex]` |
| `mapstrcolortoattributes` | STR_COLOR → `{ color?, bg? }` |
| `iscolormatch` | (pattern, color, bg) → boolean |

## readcolor Logic

1. If word is numeric → parse as color index; return mapcolortostrcolor
2. Read fg color const (optional)
3. Read bg color const (optional, must be on*)
4. Return combined STR_COLOR or `[undefined, index]`

## Aliases

brown→DKYELLOW, dkwhite→LTGRAY, gray/grey→LTGRAY, dkgrey→DKGRAY, ltblack→DKGRAY; on* and bl* variants.
