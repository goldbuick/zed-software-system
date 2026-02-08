# reader.ts

**Purpose**: Defines READ_CONTEXT and readargs — the argument parsing engine. READ_CONTEXT holds runtime state (book, board, element, words, get). readargs parses a word array from an index given a sequence of ARG_TYPEs and returns typed values plus the next index.

## Dependencies

- `zss/mapping/types` — MAYBE, isnumber, isstring
- `zss/memory/boardoperations` — memoryevaldir
- `zss/memory/types` — BOARD, BOARD_ELEMENT, BOOK
- `./color` — STR_COLOR, mapcolortostrcolor, readcolor
- `./dir` — EVAL_DIR, readdir
- `./expr` — readexpr
- `./kind` — STR_KIND, readkind

## Exports

| Export | Description |
|--------|-------------|
| `READ_CONTEXT` | Mutable context: book, board, element, elementid, elementisplayer, elementfocus, words, get |
| `ARG_TYPE` | Enum of expected argument types |
| `ARG_TYPE_MAP` | Maps ARG_TYPE to concrete types |
| `readargs(words, index, args)` | Parses args; returns `[...values, nextIndex]` |

## ARG_TYPE Values

| Type | Maps To |
|------|---------|
| `COLOR` | STR_COLOR |
| `KIND` | STR_KIND |
| `DIR` | EVAL_DIR |
| `NAME` | string |
| `NUMBER` | number |
| `STRING` | string |
| `NUMBER_OR_STRING` | number \| string |
| `COLOR_OR_KIND` | STR_COLOR \| STR_KIND |
| `MAYBE_KIND` | MAYBE\<STR_KIND\> |
| `MAYBE_NAME` | MAYBE\<string\> |
| `MAYBE_NUMBER` | MAYBE\<number\> |
| `MAYBE_STRING` | MAYBE\<string\> |
| `MAYBE_NUMBER_OR_STRING` | MAYBE\<number \| string\> |
| `ANY` | any |

## readargs Behavior

- Temporarily sets `READ_CONTEXT.words` to the supplied `words`
- For DIR: evaluates via `memoryevaldir` to produce destpt, layer, targets
- For COLOR: uses readexpr if not a color const; supports numeric color
- For COLOR_OR_KIND: tries readkind first, then readcolor
- On invalid arg: calls `didexpect` (throws with context)

## Internal Helpers

- **`readdestfromdir`** — Calls memoryevaldir with element position and dir; returns EVAL_DIR
