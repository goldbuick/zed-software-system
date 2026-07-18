# Scroll panel vs terminal tape hyperlinks

This page expands [gadget-scrolls.md § Terminal tape vs scroll](./gadget-scrolls.md#terminal-tape-vs-scroll-shared-hyperlinks).

## Shared parse model

Both surfaces use [`parsezedlinkline`](../../feature/zedlinkparse.ts):

```text
![@chip ]command args;label
```

| Rule | Behavior |
|------|----------|
| Label separator | **First** raw `;` |
| Semicolon in fragments | `$59` via `scrolllinkescapefrag` / `scrolllinkunescapefrag` |
| Tokens | [`zedlinksplittokens`](../../feature/zedlinkparse.ts) (whitespace + quoted strings) |
| Per-line chip | `!@chipname …;label` |
| Default chip | Second arg to `parsezedlinkline` / writelines (usually `refscroll`) |
| Tape modem prefix | Optional `!chip:target!command;label` (or `!!command;label` after terminallog doubles the bang) |

Authors should build lines with [`zsszedlinkline`](../../feature/zsstextui.ts) / [`zsszedlinklinechip`](../../feature/zsstextui.ts) so escapes stay correct. [`writecopyit`](../../feature/writeui.ts) / [`writehyperlink`](../../feature/writeui.ts) go through `zsszedlinkline`.

## Shared UI widgets

Control widgets live once under [`zss/screens/linkui/`](../../screens/linkui/). Thin routers:

- Tape: [`TerminalItem`](../../screens/terminal/item.tsx) → `parsezedlinkline` → [`resolvelinktypeandwords`](../../screens/linkui/linktypes.ts) → [`LinkRouter`](../../screens/linkui/router.tsx)
- Scroll: [`PanelItem`](../../screens/panel/panelitem.tsx) → unpack `PANEL_ITEM` → same resolve → `LinkRouter`

`charedit` / `coloredit` / `bgedit` stay **compact** until ENTER enters edit focus (BIG grid). `number` / `nm` uses the same ENTER enter / ENTER accept / ESC cancel cycle (ESC reverts the value from edit start). Expanded visual editors reserve height via [`linkediting`](../../screens/linkui/linkediting.ts) + [`linkexpandrowheight`](../../screens/linkui/linktypes.ts); scroll does **not** pin the expanded row to the top.

Surface adapters (`LinkSurface`) carry layout (`terminal` | `panel`), `sendmessage` / `sendclose`, modem prefix / chip, and write-text context. Panel simple links still `sendclose()`; terminal `runit` uses `registerterminalopen` while panel uses `sendclose` + `registerterminalquickopen`.

Panel control striping (`select` / `range` / `number` / `text`) uses one even/odd bg for the whole row lead-in via [`linkpanelstripe`](../../screens/linkui/surface.ts); `iseven` comes from content `striperow` (scroll passes `striperowbase={offset}`), not viewport draw Y.

## Shared modem prefix

For `HYPERLINK_WITH_SHARED` widgets (`select`, `range`, `text`, in-place edits, etc.), the **modem address** must match `paneladdress(chip, target)` — i.e. `chip:target` with **only the first colon** separating chip from target (**`target` must not contain `:`**).

- **Scroll panel:** rows from [`gadgethyperlink`](../data/api.ts); [`useHyperlinkSharedSync`](../data/usehyperlinksharedsync.ts) with `{ chip, target }`.
- **Terminal tape:** modem key in `LinkSurface.modemprefix`; same hook with `{ modemprefix }`.

[`registerterminalhyperlinksharedbridge`](../data/api.ts) supplies tape-only defaults. Merged lookup **prefers** [`registerhyperlinksharedbridge`](../data/api.ts); the terminal registry is used only when no scroll bridge is registered for that `(chip, type)`.

## Primary code references

| Concern | Location |
|--------|----------|
| Shared parse | [`zss/feature/zedlinkparse.ts`](../../feature/zedlinkparse.ts) |
| Shared widgets | [`zss/screens/linkui/`](../../screens/linkui/) |
| Panel stripe helpers | [`zss/screens/linkui/surface.ts`](../../screens/linkui/surface.ts) (`linkbegin`, `linkpanelstripe`) |
| Tape line entry | [`zss/screens/terminal/item.tsx`](../../screens/terminal/item.tsx) |
| Scroll row entry | [`zss/screens/panel/panelitem.tsx`](../../screens/panel/panelitem.tsx) |
| Shared sync | [`zss/gadget/data/usehyperlinksharedsync.ts`](../data/usehyperlinksharedsync.ts) |
| Bridge registration | [`zss/gadget/data/api.ts`](../data/api.ts) |
