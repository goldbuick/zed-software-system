# rom/

**Purpose**: ROM (read-only memory) for help and documentation content. Static `.txt` files bundled via `import.meta.glob`; addressable by path (e.g. `editor:command:help`).

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `romread` | `address` | Read ROM content by address; returns string or undefined; supports dynamic context (e.g. command descriptions) |
| `romparse` | `content`, `handler` | Parse ROM content line-by-line; splits on `;`; calls handler with `line[]` |
| `romprint` | `player`, `line` | Print ROM line to terminal via writeui (header, section, option, hyperlink, write) |
| `romscroll` | `player`, `line` | Print ROM line to scroll via gadget |
| `romintolookup` | `content` | Convert ROM content to key-value lookup (ROM_LOOKUP) |

## Command helper format (`editor:command:*.txt`)

Each file has two lines: `desc;...` and `args;...`. The **args** row should match the arguments consumed by the corresponding `.command(name, ...)` implementation (see `readargs` in `zss/firmware/*.ts`). Use `<required>`, `[optional]`, and `...` for rest args so the editor hint stays in sync with the firmware.

## Content Layout

- `editor/` — Command help, stats, hyperlinks
- `help/` — Help screens
- `refscroll/` — Reference scrolls as **`.md`** (bundled via `import.meta.glob('./refscroll/**/*.md')`; address `refscroll:<name>` without extension). Legacy line-oriented `.txt` can be converted with [`refscrollromtomarkdown`](../parse/refscrollromtomarkdown.ts). Full list and gadget routing: [`zss/gadget/docs/gadget-scrolls.md`](../../gadget/docs/gadget-scrolls.md)

## Dynamic Context

`romread` uses `parsetarget` for addresses like `editor:command:xyz` to return dynamic descriptions (e.g. "sends the message xyz").
