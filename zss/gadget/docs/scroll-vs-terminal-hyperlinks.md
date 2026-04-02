# Scroll panel vs terminal tape hyperlinks

This page expands [gadget-scrolls.md § Terminal tape vs scroll](./gadget-scrolls.md#terminal-tape-vs-scroll-shared-hyperlinks).

## Shared hyperlink prefix

For `HYPERLINK_WITH_SHARED` widgets (`select`, `range`, `text`, in-place edits, etc.), the **modem prefix** must match `paneladdress(chip, target)` — i.e. `chip:target` with **only the first colon** separating chip from target (**`target` must not contain `:`**).

- **Scroll panel:** rows come from [`gadgethyperlink`](../data/api.ts); [`usehyperlinksharedsync`](../data/usehyperlinksharedsync.ts) wires modem observe/init plus bridge `get`/`set` when the prefix parses.
- **Terminal tape:** [`TerminalItem`](../../screens/terminal/item.tsx) parses `!{prefix}!{command…;$label}` — the **second** `!` separates modem key from the tokenized command line.

[`registerterminalhyperlinksharedbridge`](../data/api.ts) supplies tape-only defaults. Merged lookup **prefers** [`registerhyperlinksharedbridge`](../data/api.ts); the terminal registry is used only when no scroll bridge is registered for that `(chip, type)`.

## Primary code references

| Concern | Location |
|--------|----------|
| Tape line shape | [`zss/screens/terminal/item.tsx`](../../screens/terminal/item.tsx) |
| Scroll + shared sync | [`zss/gadget/data/usehyperlinksharedsync.ts`](../data/usehyperlinksharedsync.ts) |
| Bridge registration | [`zss/gadget/data/api.ts`](../data/api.ts) |
