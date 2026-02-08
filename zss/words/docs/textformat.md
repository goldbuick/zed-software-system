# textformat.ts

**Purpose**: Tokenizes and renders formatted text with colors, `$name` flags, `$CENTER`, `$META`, and numeric char codes. Used for chat, ticker, hyperlinks, and any text display that supports inline formatting.

## Dependencies

- `chevrotain` — Lexer, createToken, createTokenInstance
- `zss/config` — LANG_DEV
- `zss/mapping/array` — range
- `zss/mapping/types` — MAYBE, ispresent
- `zss/words/color` — colorconsts, colortofg, colortobg
- `zss/words/types` — COLOR
- `./system` — metakey

## Exports

| Export | Description |
|--------|-------------|
| `tokenize(text, noWhitespace?)` | Tokenizes text; returns lex result |
| `hascenter(text)` | Returns text without $CENTER or undefined |
| `createwritetextcontext` | Creates WRITE_TEXT_CONTEXT |
| `writetextformat` | Internal: renders tokens to context |
| `tokenizeandwritetextformat(text, context, shouldreset)` | Tokenize + render |
| `tokenizeandstriptextformat(text)` | Strip formatting; return plain text |
| `tokenizeandmeasuretextformat(text, width, height)` | Measure-only render |
| `applystrtoindex` | Write string to context at index |
| `applycolortoindexes` | Set color/bg for range |
| `applybgtoindexes` | Set bg for range |
| `clippedapplycolortoindexes` | Apply color with clipping |
| `clippedapplybgtoindexes` | Apply bg with clipping |
| `writeplaintext` | Write unformatted text |
| `textformatedges` | Set active top/left/right/bottom edges |
| `textformatreadedges` | Read region from reset |
| `applywritetextcontext` | Copy cursor/active from source to dest |
| `writetextreset` | Reset active to reset |

## Tokens

| Token | Pattern | Description |
|-------|---------|-------------|
| Whitespace | ` +` | Spaces |
| Newline | `\n` \| `\r\n?` | Line break |
| StringLiteral | `[^ $;\r\n]+` | Plain text |
| StringLiteralDouble | `"..."` | Quoted string |
| MaybeFlag | `$name` | Variable interpolation |
| Center | `$CENTER` | Centering marker |
| MetaKey | `$META` | Platform meta key (cmd/ctrl) |
| NumberLiteral | `$123` | Char code |
| EscapedDollar | `$$` | Literal $ |
| `$black`, `$onblack`, etc. | Color names | Inline color |

## WRITE_TEXT_CONTEXT

Holds cursor (x, y), region (width, height), active/reset pen (color, bg, edges), and output arrays (char, color, bg). Supports measure-only mode and writefullwidth for line filling.
