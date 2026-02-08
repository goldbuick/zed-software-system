# string.ts

**Purpose**: String utilities — splice and send target parsing. Used for string manipulation and parsing `target:label` scope.

## Dependencies

- `./types` — ispresent

## Exports

| Export | Description |
|--------|-------------|
| `stringsplice(str, index, count, insert?)` | Replace substring; `a + insert + b` |
| `totarget(scope)` | Parse `target:label` → `[target, label]`; no `:` → `['self', scope]` |
