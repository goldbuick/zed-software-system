# rom/

**Purpose**: ROM (read-only memory) for help and documentation content. Static **`.md`** files bundled via `import.meta.glob('./**/*.md')`; addressable by path (e.g. `editor:stats:player`, `help:nopages`, `refscroll:menu`).

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `romread` | `address` | Read ROM content by address; returns string or undefined; supports dynamic context (e.g. command descriptions) |
| `romhintfrommarkdown` | `content` | Extract autocomplete hint from `editor/**/*.md`: YAML front matter `hint:` (JSON-quoted or plain), or legacy first line `desc;...` |
| `romparse` | `content`, `handler` | Parse ROM content line-by-line; splits on `;`; calls handler with `line[]` |
| `romprint` | `player`, `line` | Print ROM line to terminal via writeui (header, section, option, hyperlink, write) |
| `romscroll` | `player`, `line` | Print ROM line to scroll via gadget |
| `romintolookup` | `content` | Convert semicolon tape content to key-value lookup (`ROM_LOOKUP`) |

## Editor ROM (`editor/**/*.md`)

Each file includes **YAML front matter** with a required **`hint:`** field: the zetext string shown in the tape editor autocomplete (same text the old `desc;…` row carried). The body repeats that string as plain text so the file reads clearly in the repo.

Generated files use `hint: "<value>"` (JSON string) so `$` and special characters are safe. Optional Markdown in the body is ignored for hints.

Addresses mirror paths: `editor/stats/player.md` → `editor:stats:player`.

## Help ROM (`help/*.md`)

Help snippets rendered through the terminal use **Markdown** and [`parsemarkdownforwriteui`](../parse/markdownwriteui.ts) (e.g. empty book page list → `help:nopages`).

## Reference scrolls (`refscroll/*.md`)

Bundled with the same glob. May be CommonMark (parsed with `parsemarkdownforscroll` in the gadget path) or raw zetext lines (e.g. `menu.md` via `applyzedscroll`). See [`zss/gadget/docs/gadget-scrolls.md`](../../gadget/docs/gadget-scrolls.md).

## Command helper format (historical note)

Older docs referred to `editor:command:*` with `desc;` / `args;` rows. Command-arg rows are not stored as separate ROM files in this layout; dynamic `editor:command:xyz` text still comes from `romread` via `parsetarget`.

## Dynamic Context

`romread` uses `parsetarget` for addresses like `editor:command:xyz` to return dynamic descriptions (e.g. "sends the message xyz").
