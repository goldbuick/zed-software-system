# Sync runtime-only keys (jsondiffsync)

## Source of truth

Ignore rules mirror **FORMAT_SKIP** on memory exporters:

- [memoryexportboard](../../memory/boardlifecycle.ts) — board-level runtime keys
- [memoryexportboardelement](../../memory/boardelement.ts) — terrain / object elements
- [memoryexportcodepage](../../memory/codepageoperations.ts) — `stats` on code pages

## Semantic parent (`semanticparentandleafforsegments`)

RFC 6902 pointers use JSON segments; **semantic parent** is the stable container name used for `(parent, child)` pairing, not dynamic ids:

| Shape | Example segments | Semantic parent for leaf |
|--------|-------------------|---------------------------|
| Board field | `…/board/distmaps` | `board` |
| Objects map | `…/board/objects/<id>/kinddata` | `objects` (not `<id>`) |
| Terrain grid | `…/board/terrain/<i>/kinddata` | `terrain` |
| Book page row | `…/pages/<i>/stats` | `pages` |
| Book record field | `…/books/<id>/timestamp` | `books` (not `<id>`) |

Numeric array indices are skipped when resolving parents via `logicalparentandleafforsegments` fallback (e.g. `pages`/`0`/field).

**`timestamp`** on each book is advanced by the boardrunner tick (`books/<id>/timestamp`); ignore it on the wire so deltas stay stable.

## Rule tables (`JSONDIFFSYNC_IGNORE_PARENT_CHILD`)

- **`board`** + keys from board exporter skips: `distmaps`, `drawlastfp`, `named`, …
- **`objects`** / **`terrain`** + element runtime keys: `kinddata`, `stopped`, `bucket`
- **`pages`** + `stats` (parsed stats blob on each code page row)
- **`books`** + `timestamp` (runtime clock on each book record)

Wildcard parent `*` is reserved for custom/tests via [`pairmatchesignore`](patchfilter.ts).

## Subtree segments (`JSONDIFFSYNC_IGNORE_SUBTREE_SEGMENT`)

Paths containing any of **`gadgetstate`**, **`gadgetstore`**, **`kinddata`**, **`stats`**, **`lookup`**, or **`named`** ignore nested RFC 6902 ops when pairing alone would miss nested leaves — for example `/gadgetstate/scroll/0`, `/books/<id>/flags/gadgetstore/<player>/scroll/0`, `/…/kinddata/n`, `/…/stats/type`, or **`/…/board/lookup/1445`**. **`gadgetstore`** holds per-player gadget UI in book flags ([`gadgetstatebookprovider`](../../device/gadgetstatebookprovider.ts)); boardrunner text state is also applied on the VM via **`vm:acktick`** payload so ignored wire paths stay consistent with clients.

## Wire deltas vs rebaser

[`hasrelevantsyncdiff`](patchfilter.ts) mirrors [`filterjsonpatchforsync`](patchfilter.ts).

[`sync.ts` rebaseapply](sync.ts) still uses **full** `compare(base, working)` for the local merge leg.
