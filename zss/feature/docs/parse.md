# parse/

**Purpose**: File format parsers. Dispatches from `file.ts` based on MIME/type. Supports ZZT, ANSI, CHR, ZZM, OBJ, markdown, ZIP archives.

## Main Entry

| File | Purpose |
|------|---------|
| `file.ts` | `mimetypeofbytesread`, `mapfiletype`, `parsezipfile`, `parsewebfile`, `parsebinaryfile`; dispatches to format-specific parsers |

## Format Parsers

| File | Purpose |
|------|---------|
| `ansi.ts` | `parseansi` — ANSI/art (ans, adf, bin, idf, pcb, tnd, xb, diz) |
| `chr.ts` | `parsechr` — CHR character set files |
| `zzt.ts` | `parsezzt`, `parsebrd` — ZZT world and BRD board files |
| `zzm.ts` | `parsezzm` — ZZM music files |
| `zztobj.ts` | `parsezztobj` — OBJ 3D model files |
| `zztoop.ts` | `zztoop` — ZZT OOP code parsing |

## ANSI Art Library (ansilove/)

| File | Purpose |
|------|---------|
| `index.ts` | `renderBytes`, `splitRenderBytes`, `sauceBytes` |
| `parser.ts` | Core parsing |
| `display.ts` | Display data |
| `font.ts`, `palette.ts` | Font and palette handling |

## Markdown

| File | Purpose |
|------|---------|
| `markdownscroll.ts` | `scrollwritemarkdownlines` — for scroll gadget |
| `markdownterminal.ts` | `terminalwritemarkdownlines` — for terminal log (via `terminalwritelines`) |

## Consumed By

- `zss/device/vm.ts` — parsewebfile, parsemarkdownforscroll
- `zss/firmware/*` — loader commands
- `zss/device/register.ts`, `zss/firmware/cli/commands/books.ts`, `zss/screens/panel/openit.tsx`, `zss/screens/terminal/openit.tsx` — `terminalwritemarkdownlines`
