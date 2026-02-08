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

## Content Layout

- `editor/` — Command help, stats, hyperlinks
- `help/` — Help screens
- `refscroll/` — Reference scrolls (algoscroll, synthscroll, etc.)

## Dynamic Context

`romread` uses `parsetarget` for addresses like `editor:command:xyz` to return dynamic descriptions (e.g. "sends the message xyz").
