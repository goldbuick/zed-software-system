# string.ts

**Purpose**: String utilities — splice, quoting, scroll-link escape, and send-target parsing for terminal UI.

## Dependencies

- `fuse.js` — fuzzy search in `searchintext`

## Exports

| Export | Description |
|--------|-------------|
| `escapesinglequoted(s)` | Escape `\` and `'` for single-quoted string literals (codegen) |
| `escapedoublequoted(s)` | Escape `\` and `"` for double-quoted string literals |
| `scrolllinkescapefrag(s)` | Escape `;` as `$59` for bang scroll / tape lines |
| `scrolllinkunescapefrag(s)` | Undo `scrolllinkescapefrag` |
| `searchintext(query, text)` | Fuzzy match start offsets in text |
| `stringsplice(str, index, count, insert?)` | Replace substring; `a + insert + b` |
| `totarget(scope)` | Parse `target:label` → `[target, label]`; no `:` → `['self', scope]` |
| `parsetarget(scope)` | Same as `totarget`, returns `{ target, path }` |

## `totarget` vs `zss/device.parsetarget`

Two parsers exist for `target:path` strings. **Do not merge without an explicit mode flag.**

| Input | `mapping/string` `totarget` | `zss/device` `parsetarget` |
|-------|----------------------------|----------------------------|
| `"foo:bar"` | target=`foo`, path=`bar` | target=`foo`, path=`bar` |
| `"label"` (no colon) | target=`self`, path=`label` | target=`label`, path=`''` |

**Use mapping `totarget` / `parsetarget`** for terminal send UI and scroll commands where bare labels mean “send to self”.

**Use `zss/device.parsetarget`** for device message routing where the whole string is the device/topic name when no colon is present.
