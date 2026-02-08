# loader.ts

**Purpose**: Loader dispatch — matches format and event to codepage loaders, runs them with arg/content/player. Used when importing files or handling events.

## Dependencies

- `zss/mapping/guid` — createsid
- `zss/mapping/types` — MAYBE, ispresent, isstring
- `zss/words/types` — WORD
- `./bookoperations` — memorylistcodepagebytype, memoryreadcodepage
- `./codepageoperations` — memoryreadcodepagestats
- `./types` — CODE_PAGE, CODE_PAGE_TYPE, MEMORY_LABEL

## Exports

| Export | Description |
|--------|-------------|
| `memoryloader(arg, format, idoreventname, content, player)` | Run matched loaders |
| `memoryloaderarg(id)` | Get loader arg |
| `memoryloadercontent(id)` | Get loader content |
| `memoryloaderdone(id)` | Clear loader ref |
| `memoryloaderformat(id)` | Get loader format |
| `memoryloadermatches(format, idoreventname)` | Find matching loader codepages |
