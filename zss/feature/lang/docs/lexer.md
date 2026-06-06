# lexer.ts

**Purpose**: Defines the tokenizer for the ZSS scripting language. Uses Chevrotain to tokenize source text into tokens for labels, commands, text, literals, colors, directions, operators, and structured commands.

## Dependencies

- `chevrotain` — Lexer, TokenType, createToken, createTokenInstance
- `zss/config` — LANG_DEV
- `zss/mapping/array` — range
- `zss/mapping/types` — isarray

## Exports

| Export | Description |
|--------|--------------|
| `tokenize(text)` | Tokenizes text; returns tokens and errors |
| `LANG_ERROR` | Error type: offset, line, column, length, message |
| `allTokens` | Token set for lexer modes |
| Token constants | 100+ token types (see Token Categories) |

## Lexer Modes

| Mode | Purpose |
|------|----------|
| `use_newlines` | Primary mode; distinguishes line breaks |
| `ignore_newlines` | Inside parentheses; newlines as whitespace |

## Token Categories

### Structural

| Token | Pattern | Description |
|-------|---------|-------------|
| `newline` | `\n` \| `\r\n?` | Line break |
| `whitespace` | ` +` | Spaces (skipped) |
| `stat` | `@.*` | Stat reference (e.g. `@board`) |
| `command` | `#` | Command prefix |
| `comment` | `'.*` | Comment (apostrophe) |
| `label` | `:[^;:\n]*` | Label (e.g. `:restart`) |
| `hyperlink` | `![^;\n]*` | Hyperlink |
| `hyperlinktext` | `;[^;\n]*` | Hyperlink text |

### Content

| Token | Description |
|-------|-------------|
| `text` | Plain text (complex scan; line-start or after `?`/`/`/`"`) |
| `stringliteral` | Unquoted identifier |
| `stringliteraldouble` | `"..."` double-quoted string |
| `numberliteral` | Numeric (supports `-`, `.`, `e`, `j`, `l`) |

### Categories & Collision

| Token | Description |
|-------|-------------|
| `category_isterrain` | isterrain |
| `category_isobject` | isobject |
| `collision_issolid`, `iswalk`, `isswim`, etc. | Collision predicates |

### Colors

| Token | Description |
|-------|-------------|
| `color_black`, `color_dkblue`, … | Foreground colors |
| `color_onblack`, `color_ondkblue`, … | Background colors |
| `color_blblack`, … | Blink colors |

### Directions

| Token | Description |
|-------|-------------|
| `dir_idle`, `dir_up`, `dir_down`, … | Cardinal directions |
| `dir_by`, `dir_at`, `dir_away`, `dir_toward` | Compound directions |
| `dir_find`, `dir_flee`, `dir_to` | Target-based directions |
| `dir_cw`, `dir_ccw`, `dir_opp` | Rotation modifiers |

### Expressions

| Token | Description |
|-------|-------------|
| `expr_aligned`, `expr_contact`, `expr_blocked` | Spatial predicates |
| `expr_count`, `expr_abs`, `expr_min`, `expr_max` | Aggregates |
| `expr_pick`, `expr_random`, `expr_run` | Selection/execution |
| `iseq`, `isnoteq`, `islessthan`, … | Comparisons |
| `or`, `not`, `and` | Logical operators |
| `plus`, `minus`, `multiply`, `divide`, `power` | Arithmetic |

### Structure

| Token | Description |
|-------|-------------|
| `command_if`, `command_do`, `command_done` | If/block |
| `command_while`, `command_repeat`, `command_foreach` | Loops |
| `command_waitfor`, `command_break`, `command_continue` | Control |
| `command_play`, `command_toast`, `command_ticker` | Media |

## Internal Helpers

- **`matchBasicText`** — Scans for plain text vs. commands; considers previous context (`?`, `/`, `"`, `#`, `@`, etc.) to avoid false matches.
- **`createTokenSet`** — Builds token array with explicit ordering (primary vs secondary; `dir_down` before `command_do` hack).

## Implementation Notes

- Text token uses custom matcher; only enabled during `tokenize` via `matchTextEnabled`
- Lexer appends trailing newline if missing (required for grammar)
- `LANG_DEV` enables validation and optimizations
