# Words Documentation

The words system provides parsing and evaluation for the ZSS scripting vocabulary — categories, colors, directions, kinds, expressions, stats, and send syntax. It is used at runtime when commands execute and need to read arguments from parsed word arrays.

## Architecture Overview

The system centers on **READ_CONTEXT** and **readargs**:

- **READ_CONTEXT** — Holds book, board, element, words, and `get` for flag lookups
- **readargs** — Parses a word array from an index given an expected type sequence (COLOR, KIND, DIR, NUMBER, etc.)

Domain-specific readers (`readcategory`, `readcolor`, `readdir`, `readkind`) consume words and return `[value, nextIndex]`. The **expr** module evaluates expressions (any, countof, blocked, aligned, run, etc.) and delegates to memory/board operations.

## Module Index

| File | Purpose |
|------|---------|
| [types.md](types.md) | Enums (COLOR, COLLISION, CATEGORY, DIR, STAT_TYPE) and base types |
| [reader.md](reader.md) | READ_CONTEXT, readargs, ARG_TYPE |
| [category.md](category.md) | Category parsing (isterrain, isobject) |
| [collision.md](collision.md) | Collision parsing (iswalk, issolid, etc.) |
| [color.md](color.md) | Color parsing and mapping |
| [dir.md](dir.md) | Direction parsing with args (by, at, find, flee, etc.) |
| [kind.md](kind.md) | Kind parsing (name + optional color) |
| [expr.md](expr.md) | Expression evaluation (aligned, any, countof, blocked, run, etc.) |
| [send.md](send.md) | Send/message parsing (target:label args) |
| [stats.md](stats.md) | Stat format parsing (loader, board, range, select, etc.) |
| [textformat.md](textformat.md) | Text formatting with colors, $flags, and layout |
| [system.md](system.md) | Platform detection (ismac, metakey) |

## Data Flow

```
command words
    → readargs(words, index, [ARG_TYPE.KIND, ARG_TYPE.DIR, …])
    → readkind / readdir / readcolor / readexpr / …
    → READ_CONTEXT.board, element, get
    → memory* (boardoperations, spatialqueries, runtime)
    → evaluated values
```
