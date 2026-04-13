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
| NumberLiteral | `$-?(\d*\.)?\d+…` | Char code (e.g. `$123`) |
| EscapedDollar | `$$` | Literal $ |
| HyperLinkText | `;[^;\r\n]*` | Hyperlink payload |
| `$black`, `$onblack`, etc. | Color names | Inline color |

## WRITE_TEXT_CONTEXT / WRITE_PEN_CONTEXT

**WRITE_PEN_CONTEXT**: color, bg, topedge, leftedge, rightedge, bottomedge (all optional except color/bg).

**WRITE_TEXT_CONTEXT**: cursor (x, y), region (width, height), active/reset pen (WRITE_PEN_CONTEXT), output arrays (char, color, bg), plus disablewrap, measureonly, measuredwidth, writefullwidth, **`padlineright`**, **`panelcarry`**, optional **`panelcarrycolor`** / **`panelcarrybg`**, iseven, changed(). Supports measure-only mode and writefullwidth for line filling.

**`padlineright`** (default `false`): When `true`, each newline pads the row to **`width - 1`** with the **active** pen (text wrap still uses **`active.rightedge`**). The last line is padded the same way. When set, **`writefullwidth`** also fills to **`width - 1`** (still **`writetextreset`** colors for that tail). After **`tokenizeandwritetextformat`** / **`writeplaintext`**, **`syncpanelguttercolumn`** in [`zss/screens/panel/guttersync.ts`](zss/screens/panel/guttersync.ts) runs: if **`reset.leftedge` > 0**, column **`leftedge - 1`** copies fg/bg from column **`leftedge`** for touched rows. **`PanelComponent`** sets **`padlineright: true`** (with **`panelcarry`**).

When **`panelcarry`** is `true`, **`tokenizeandwritetextformat`** applies **`panelcarrycolor`** / **`panelcarrybg`** to the active pen before rendering (if defined), then stores **`active.color`** / **`active.bg`** after **`writetextformat`** (before **`writetextreset`** when `shouldreset` is true). **`PanelComponent`** clears carry when the **`text`** reference changes. Use **`$onclear`** or explicit colors to break the chain.
