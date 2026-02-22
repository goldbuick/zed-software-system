# Colored syntax highlighting (editor)

This document describes how the editor applies colored syntax highlighting to ZSS source code.

## Overview

Highlighting is **token-driven** and **index-based**: we first write plain text into a character buffer, then overwrite foreground and background color per character index using token boundaries and semantic rules. The pipeline is **lex → fold tokens by line → write line text → apply colors per token**.

## Pipeline

1. **Lex and parse**  
   Full editor text is tokenized and parsed via `compileast()` (`zss/lang/ast`). The result includes a flat `tokens` array (Chevrotain) with `tokenTypeIdx`, `startLine`, `startColumn`, `endColumn`, and `image`.

2. **Fold tokens into rows**  
   In `component.tsx`, tokens are assigned to logical lines by `startLine`. Each `EDITOR_CODE_ROW` gets a `tokens` array. Stat tokens get a `payload` indicating whether they are the first stat on the line (for formatting).

3. **Render each line**  
   `EditorRows` renders one line at a time:
   - Writes the line’s plain text (including line number) with `writeplaintext()`, which fills `context.char[]` and initializes `context.color[]` / `context.bg[]` for that span.
   - Computes the line’s base index into the write context: `index = 1 + context.y * context.width`.
   - Applies line-number and UI colors (e.g. sidebar, scroll) with `clippedapplycolortoindexes` / `clippedapplybgtoindexes`.
   - For each token on the row, derives a color (or multiple colors) and applies them to the token’s column range via `clippedapplycolortoindexes()`.

4. **Apply token colors**  
   For each token we:
   - Map **token type → color** with `ZSS_COLOR_MAP` (see `colors.ts`).  
   - Optionally refine by **semantics** (e.g. stat subtype, or word/keyword for text tokens).  
   - Convert token `startColumn`/`endColumn` to view-relative column range `(left, right)` and call `clippedapplycolortoindexes(index, edge.right, left, right, color, bg, context)` so only visible columns are updated.

The write context (`WRITE_TEXT_CONTEXT` in `zss/words/textformat`) has parallel arrays `char[]`, `color[]`, and `bg[]` indexed by character position. Colors are numeric (e.g. `COLOR` enum). Clipping keeps updates within the visible right edge and avoids out-of-range indices.

## Token type → color

- **`ZSS_COLOR_MAP`** in `colors.ts` maps lexer **token type index** to a single display color (e.g. `stat` → `ZSS_TYPE_STATNAME`, `numberliteral` → `ZSS_TYPE_NUMBER`, `comment` → `ZSS_TYPE_COMMENT`).  
- If the map returns a color, that token type is highlighted; otherwise it is not (no entry).

## Token and word colors reference

### By token type (ZSS_COLOR_MAP)

| Color (display) | ZSS_TYPE_* | Lexer token(s) |
|-----------------|------------|----------------|
| WHITE | NONE | newline, whitespace, whitespaceandnewline |
| DKPURPLE | STATNAME | stat |
| YELLOW | SYMBOL | command, hyperlink, hyperlinktext, iseq, isnoteq, islessthan, isgreaterthan, islessthanorequal, isgreaterthanorequal, plus, minus, power, multiply, divide, moddivide, floordivide, query, lparen, rparen |
| GREEN | TEXT | text, stringliteral, stringliteraldouble |
| CYAN | COMMENT | comment |
| DKRED | LABEL | label |
| WHITE | NUMBER | numberliteral |
| DKYELLOW | FLAGMOD | or, not, and |
| GREEN | MUSIC | command_play |
| DKGREEN | COMMAND | command_ticker, command_toast, command_if, command_else, command_while, command_repeat, command_waitfor, command_foreach, command_break, command_continue |
| DKCYAN | BLOCK | command_do, command_done |

### By word (ZSS_WORD_*; used for text tokens via zsswordcolorconfig)

| Color | Constant | Used for |
|-------|----------|----------|
| DKPURPLE | ZSS_WORD_MESSAGE | message words |
| PURPLE | ZSS_WORD_FLAG | flag names |
| DKPURPLE | ZSS_WORD_STAT | stat names (in text) |
| CYAN | ZSS_WORD_KIND | kind words |
| DKCYAN | ZSS_WORD_KIND_ALT | kind alt words |
| RED | ZSS_WORD_COLOR | color words |
| WHITE | ZSS_WORD_DIR | direction words |
| LTGRAY | ZSS_WORD_DIRMOD | direction modifiers |
| YELLOW | ZSS_WORD_EXPRS | expression words |

Default for unknown text words: **GREEN** (ZSS_TYPE_TEXT).

### Music (play / bgplay; zssmusiccolor)

| Color | Constant | Used for |
|-------|----------|----------|
| GREEN | ZSS_MUSIC_NOTE | notes (default) |
| DKGREEN | ZSS_MUSIC_REST | rests |
| PURPLE | ZSS_MUSIC_DRUM | drums |
| DKCYAN | ZSS_MUSIC_TIME | time |
| CYAN | ZSS_MUSIC_TIMEMOD | time modifier |
| YELLOW | ZSS_MUSIC_OCTAVE | octave |
| DKYELLOW | ZSS_MUSIC_PITCH | pitch |

Play command also uses: LTGRAY (setup), CYAN (message after #), BLUE (trailing).

## Special handling by token type

- **Stat tokens (`ZSS_TYPE_STATNAME`)**  
  - `statformat('', words, …)` determines the stat subtype.  
  - For types like `COLOREDIT`, `NUMBER`, `TEXT`, etc., the stat is split into **name** (first word) and **value** (rest). The name is colored as `ZSS_TYPE_STATNAME`, the value as `ZSS_TYPE_NUMBER`.  
  - Unknown or error stats use a distinct color (e.g. `COLOR.DKRED`).

- **Symbol tokens (`ZSS_TYPE_SYMBOL`)**  
  - The entire token is colored with the symbol color (e.g. operators like `above`, `>`, or the `#` command character).

- **Text tokens (`ZSS_TYPE_TEXT`)**  
  - Color comes from **`zsswordcolor(token.image)`**, which can return a single color or an array (e.g. for `play` / `bgplay`).  
  - Single color: one `clippedapplycolortoindexes` for the full token span.  
  - Array: one color per character (e.g. music notation), applied with a loop over character indices.

## Word-level and music coloring

- **`zsswordcolor(word)`**  
  - Uses a configurable `ZSS_WORD_MAP` for keyword → color.  
  - Special cases: `play ` and `bgplay ` are parsed and colored by **`zssplaywordcolor()`**, which returns an array of colors (e.g. setup vs notes vs message, and per-note colors via `zssmusiccolor()`).

- **`zssmusiccolor(char)`**  
  - Maps a single music character to a color (notes, rests, drums, time, etc.). Configurable via `zssmusiccolorconfig()`.

- **`zsswordcolorconfig(word, color)`** / **`zssmusiccolorconfig(music, color)`**  
  - Allow overriding colors for specific words or music tokens.

## Clipping and coordinates

- **`clippedapplycolortoindexes(index, rightedge, p1, p2, color, bg, context)`**  
  - Applies `color` and `bg` to the range `[index + clippedp1, index + clippedp2]` in `context.color[]` and `context.bg[]`.  
  - `p1`, `p2` are **column offsets** relative to the line start (after accounting for `xoffset`). They are clipped to `[0, rightedge]` so only on-screen columns are touched.  
  - This avoids overwriting outside the visible region and keeps rendering correct when scrolling horizontally.

## Summary

| Step | Where | What |
|------|--------|------|
| Lex/parse | `ast.ts`, `lexer.ts` | Tokens with type, line, column, image |
| Fold by line | `component.tsx` | `row.tokens` per `EDITOR_CODE_ROW` |
| Write text | `editorrows.tsx` | `writeplaintext()` → `char[]` and default color/bg |
| Token → color | `colors.ts` | `ZSS_COLOR_MAP`, `zsswordcolor`, stat formatting |
| Apply to buffer | `editorrows.tsx` + `textformat.ts` | `clippedapplycolortoindexes(index, right, left, right, color, bg, context)` |

The result is **syntax highlighting by token type and semantics**, with **per-character color arrays** and **viewport-safe clipping**, without a separate “highlight layer”—colors live in the same buffer as the text.
