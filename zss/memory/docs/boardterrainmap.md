---
title: boardterrainmap.ts
---

**Purpose**: Terrain display de-dupe for persisted exports. Strips per-cell `char` / `color` / `bg` that match the resolved kind, then interns what remains into a book-level `terrainmap` table so repeated styling is stored once per book instead of once per cell.

## Dependencies

- `zss/device/api` — apierror
- `zss/device/session` — SOFTWARE
- `zss/mapping/types` — MAYBE, isnumber, ispresent
- `./boards` — memoryreadelementkind
- `./types` — BOARD, BOARD_ELEMENT

## Exports

| Export | Description |
|--------|-------------|
| `TERRAIN_DISPLAY` | `{ char?, color?, bg? }` — one `terrainmap` entry |
| `TERRAIN_EXPORT_MODE` | `{ intern, entries, keys }` — accumulator threaded through one export |
| `memorycreateterrainexportmode(intern)` | New mode; `intern: true` also collects `entries` |
| `memorystripterrainkinddefaults(element)` | Copy minus display stats equal to the kind's; same object when nothing changes |
| `memoryinternterraindisplay(element, mode)` | Replace remaining display stats with `dmap: index` |
| `memoryexportterrainelement(element, mode)` | Strip then intern; verbatim when `mode` is absent |
| `memoryunpackterraindisplay(board, terrainmap)` | Expand `dmap` back into stats and remove `dmap` |

## Three export modes

`mode` is optional on every export function, which gives three behaviors:

| Mode | Callers | Result |
|------|---------|--------|
| absent | [`boardpivot.ts`](../../feature/boardpivot.ts) rollback snapshot, memoryfs `apply.ts` prior read | verbatim, byte for byte as before |
| `intern: false` | memoryfs [`export.ts`](../../feature/memoryfs/export.ts), `#pageexport` | strip only; literal values stay readable |
| `intern: true` | `memoryexportbook`, `memoryexportbookasjson` | strip plus `dmap` indices |

Verbatim exists because `memoryexportboard` / `memoryimportboard` are also used as an in-memory rollback snapshot, not just persistence. memoryfs `apply.ts` reads prior state through `memoryexportcodepageasjson` and feeds it back to the importer, so stripping there would rewrite live memory on unrelated edits.

Single-page exports cannot use `intern: true`, because the table lives on the book.

## Why stripping is display-equivalent

[`memoryreadelementdisplay`](bookoperations.md) resolves `element.displaychar ?? kind.displaychar ?? element.char ?? kind.char ?? default`, and `memoryreadelementstat` resolves `element.char ?? kind.char ?? codepage stat`. Removing `element.char` when it equals `kind.char` leaves both chains at the same value, and the `displaychar` terms are untouched. Stripping only runs when `memoryreadelementkind` resolves a kind.

## Wire format notes

`terrainmap` is appended to `BOOK_KEYS` and `dmap` to `BOARD_ELEMENT_KEYS`. `formatobject` / `unformatobject` map keys to **enum ordinals**, so both must only ever be appended — inserting a member renumbers every saved book. `memoryexportboardelementasjson` enumerates fields explicitly, so `dmap` is listed there too.

Import is unconditional and shape-detecting: `memoryunpackterraindisplay` is a no-op when `terrainmap` is absent, which is what lets pre-dedupe books load unchanged. `dmap` is always deleted, so it never reaches live memory or the jsonpipe wire.
