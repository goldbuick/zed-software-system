---
title: boardterrainmap.ts
---

**Purpose**: Strip per-cell `char` / `color` / `bg` that match the resolved kind on persisted exports, so kind defaults are not repeated on every terrain cell.

## Dependencies

- `zss/mapping/types` — MAYBE, ispresent
- `./boards` — memoryreadelementkind
- `./types` — BOARD_ELEMENT

## Exports

| Export | Description |
|--------|-------------|
| `memorystripterrainkinddefaults(element)` | Copy minus display stats equal to the kind's; same object when nothing changes |
| `memoryexportterrainelement(element, strip?)` | Strip when `strip` is true; verbatim when absent/false |

## Strip vs verbatim

`strip` is optional on board / codepage export helpers:

| `strip` | Callers | Result |
|---------|---------|--------|
| absent / false | [`boardpivot.ts`](../../feature/boardpivot.ts) rollback snapshot, memoryfs `apply.ts` prior read | verbatim |
| `true` | `memoryexportbook`, `memoryexportbookasjson`, memoryfs [`export.ts`](../../feature/memoryfs/export.ts), `#pageexport` | kind-default display stats omitted |

Verbatim exists because `memoryexportboard` / `memoryimportboard` are also used as an in-memory rollback snapshot, not just persistence. memoryfs `apply.ts` reads prior state through `memoryexportcodepageasjson` and feeds it back to the importer, so stripping there would rewrite live memory on unrelated edits.

## Why stripping is display-equivalent

[`memoryreadelementdisplay`](bookoperations.md) resolves `element.displaychar ?? kind.displaychar ?? element.char ?? kind.char ?? default`, and `memoryreadelementstat` resolves `element.char ?? kind.char ?? codepage stat`. Removing `element.char` when it equals `kind.char` leaves both chains at the same value, and the `displaychar` terms are untouched. Stripping only runs when `memoryreadelementkind` resolves a kind.
