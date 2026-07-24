---
title: formatlangerror.ts
description: Rewrites Chevrotain lexer and parser errors into short, ASCII messages for the editor and compile tape.
---

**Purpose**: Converts raw Chevrotain `message` strings into human-readable copy before they are stored on [`LANG_ERROR`](../backend/typescript/lexer.ts). Called from [`ast.ts`](../backend/typescript/ast.ts) (`maplexererrors`, `mapparsererrors`) for both strict compile and editor paths.

## Dependencies

- `chevrotain` — `IToken`
- [`completioncontext.ts`](../backend/typescript/completioncontext.ts) — `DIR_MOD_CONTINUES`, `DIR_NEED_PAIR`, `DIR_NEED_KIND`, `DIR_NEED_SUBDIR`
- [`lexer.ts`](../backend/typescript/lexer.ts) — `newline` token type

## Exports

| Export | Description |
|--------|-------------|
| `formatlangerror(input)` | Returns `{ message: string }` (ASCII, capped at 120 chars) |
| `linetokensbeforefault(input, fault)` | Same-line tokens before the fault token (parser context) |
| `FORMAT_LANG_ERROR_INPUT` | Input type: `kind`, `raw`, optional `token`, `linetokens` |
| `FORMAT_LANG_ERROR_RESULT` | Output type: `{ message: string }` |

## Resolution order

Context rules run first (using tokens on the fault line), then pattern-based collapsing, then fallback:

1. **Incomplete direction mod at EOL** — `#put opp` → `direction incomplete: opp needs a base dir (flow, up, north, ...)`
2. **Unclosed block** — `#if` / `#while` / `#repeat` / `#foreach` / `#try` without `#do` on the line
3. **Label vs command** — `:foo` where `#foo` was expected
4. **Redundant input** — extra tokens after a complete statement
5. **Token-set collapse** — long `Expecting [token_*]` lists become category hints (direction, color, statement, value)
6. **Fallback** — `unexpected 'foo' here` or `syntax error near this spot`

Lexer-only: `unexpected character: ->X<-` → `invalid character 'X'`.

## Surfaces

| Surface | How it receives formatted text |
|---------|--------------------------------|
| Tape editor | [`editorrows.tsx`](../../../screens/editor/editorrows.tsx) shows `LANG_ERROR.message` on the line below the cursor |
| Compile / run | [`os.ts`](../../../os.ts) prints the first error preamble via `apierror` when `compile` fails |
| Strict compile | [`compileast`](../backend/typescript/ast.ts) and [`compile`](../backend/typescript/generator.ts) return formatted `errors` |

[`compileastforeditor`](../backend/typescript/ast.ts) uses the same formatter but keeps a partial CST when `recoveryEnabled` reports parser errors (for highlighting and autocomplete).

## Tests

- [`formatlangerror.test.ts`](../../../../ops/tests/unit/feature/lang/backend/typescript/formatlangerror.test.ts) — pattern handlers, `#put opp` regression, failure-report bucket samples
- [`pipeline.test.ts`](../../../../ops/tests/unit/feature/lang/backend/typescript/pipeline.test.ts) — compile errors must not contain `token_`

## See also

- [architecture.mdx](architecture.mdx#human-readable-parse-errors) — narrative and diagram
- [ast.md](ast.md) — where errors are mapped
