# Panel vs Terminal: PanelItem Component Gap

This document lists which Panel item types exist in **panel** and which are **missing** (or stubbed) in **terminal**.

## Reference: Panel item types

Defined in `zss/screens/panel/panelitem.tsx` (switch on `NAME(type)`):

| Type(s)        | Panel component   | Panel file        |
|----------------|-------------------|-------------------|
| (string item)  | `PanelContent`    | `panel/content.tsx` |
| `hyperlink`    | `PanelHyperlink`  | `panel/hyperlink.tsx` |
| `hk`, `hotkey` | `PanelHotkey`     | `panel/hotkey.tsx` |
| `rn`, `range`  | `PanelRange`      | `panel/range.tsx` |
| `sl`, `select` | `PanelSelect`     | `panel/select.tsx` |
| `nm`, `number` | `PanelNumber`     | `panel/number.tsx` |
| `tx`, `text`   | `PanelText`       | `panel/text.tsx` |
| `copyit`       | `PanelCopyIt`     | `panel/copyit.tsx` |
| `openit`       | `PanelOpenIt`     | `panel/openit.tsx` |
| `viewit`       | `PanelViewIt`     | `panel/viewit.tsx` |
| `runit`        | `PanelRunIt`      | `panel/runit.tsx` |
| `zssedit`      | `PanelZSSEdit`    | `panel/zssedit.tsx` |
| `charedit`     | `PanelCharEdit`   | `panel/charedit.tsx` |
| `coloredit`    | `PanelColorEdit`  | `panel/coloredit.tsx` |
| `bgedit`       | `PanelColorEdit` (isbg) | (same) |

---

## Terminal support

Terminal item handling lives in `zss/screens/terminal/item.tsx`. Rows are log lines (strings); lines starting with `!` are parsed as hyperlink-style items with an action type.

| Type(s)        | Terminal component   | Status |
|----------------|----------------------|--------|
| (plain text)   | Inline in `TerminalItem` | ✅ Content rendered via `tokenizeandwritetextformat` (no separate component) |
| `hyperlink`    | `TerminalHyperlink`  | ✅ |
| `copyit`       | `TerminalCopyIt`     | ✅ |
| `openit`       | `TerminalOpenIt`     | ✅ |
| `viewit`       | `TerminalViewIt`     | ✅ |
| `runit`        | `TerminalRunIt`      | ✅ |
| `hk`, `hotkey` | —                    | ❌ **Missing** (`return null`) |
| `rn`, `range`  | —                    | ❌ **Missing** (`return null`) |
| `sl`, `select` | —                    | ❌ **Missing** (`return null`) |
| `nm`, `number` | —                    | ❌ **Missing** (`return null`) |
| `tx`, `text`   | —                    | ❌ **Missing** (`return null`) |
| `zssedit`      | —                    | ❌ **Missing** (`return null`) |
| `charedit`     | —                    | ❌ **Missing** (`return null`) |
| `coloredit`    | —                    | ❌ **Missing** (`return null`) |
| `bgedit`       | —                    | ❌ **Missing** (no branch; would fall under coloredit) |

---

## Missing PanelItem components in terminal

These panel item types have **no terminal implementation** (terminal explicitly returns `null` or has no branch):

1. **PanelHotkey** → no `TerminalHotkey`
2. **PanelRange** → no `TerminalRange`
3. **PanelSelect** → no `TerminalSelect`
4. **PanelNumber** → no `TerminalNumber`
5. **PanelText** → no `TerminalText`
6. **PanelZSSEdit** → no `TerminalZSSEdit`
7. **PanelCharEdit** → no `TerminalCharEdit`
8. **PanelColorEdit** (and **PanelColorEdit** with `isbg` / bgedit) → no `TerminalColorEdit`

**PanelContent** is not missing: terminal handles plain string rows inside `TerminalItem` (non-hyperlink branch) with the same text/formatting behavior; there is no separate content component.

---

## Implementation notes

- **Panel** gets structured items (`PANEL_ITEM`: string or `[chip, label, target, type?, ...args]`) and dispatches in `PanelItem` to the right component.
- **Terminal** only sees log lines (strings). Hyperlink-style lines start with `!` and are parsed in `TerminalItem` to extract action type and words; only the action types in the first table above are implemented.
- Adding a missing item type in terminal would require:
  1. Defining a terminal-specific component (e.g. `TerminalRange`) or reusing/adapting panel logic.
  2. In `TerminalItem`, replacing the `return null` for that type with a render of that component, passing the same kind of props (e.g. from `TapeTerminalItemInputProps` and parsed `words`).

---

## File reference

| Area    | Dispatcher      | File |
|---------|-----------------|------|
| Panel   | `PanelItem`     | `zss/screens/panel/panelitem.tsx` |
| Terminal| `TerminalItem`  | `zss/screens/terminal/item.tsx` |

Panel components: `zss/screens/panel/*.tsx`.  
Terminal components: `zss/screens/terminal/copyit.tsx`, `openit.tsx`, `viewit.tsx`, `runit.tsx`, `hyperlink.tsx`.
