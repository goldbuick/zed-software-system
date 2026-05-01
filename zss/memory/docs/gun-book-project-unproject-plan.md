# Gun book storage: project / unproject

Portable copy of the Cursor plan **BOOK Gun pages graph** for offline / other-machine use.  
Original plan file (if present): `.cursor/plans/book_gun_pages_graph_ad74bc94.plan.md`

---

## Layer 0: generic value project / unproject

**Goal:** One recursive pair that defines how **any** in-memory JSON-like value becomes a **Gun-safe wire tree** and back, independent of `BOOK` layout.

### `memorygunprojectvalue(input: unknown, options?: MemoryGunProjectOptions): unknown`

- **Options — ignore / omit keys:** `omitkey?(path: readonly string[], key: string): boolean`. While recursing, maintain **`path`** as the list of object keys from the root value down to the **parent** of the key being considered (e.g. `['pages', pageId, 'codepage', 'board']` when deciding whether to emit `board.lookup`). If `omitkey(path, key)` is true, **do not copy** that property to the wire tree (same as prune for that branch). Default preset for this codebase: omit **`lookup`** and **`named`** when the parent path identifies a [`BOARD`](../types.ts) (e.g. last segment is `'board'`). Call sites may pass a stricter or looser callback.
- **Runtime-only data:** [`BOARD.lookup`](../types.ts) and [`BOARD.named`](../types.ts) are **derived caches** maintained in the **in-memory projected state** (see [`memoryinitboardlookup`](../boardlookup.ts) / [`memoryresetboardlookups`](../boardlookup.ts)). They **must not** appear on the Gun graph. After **unproject** (or any hydrate from wire), boards may arrive **without** those fields; the session/projection path **must** rebuild them from `terrain` / `objects`. Gun is not the source of truth for those two fields.
- **null** → `null`.
- **boolean / number** → pass through (finite numbers only; `NaN` / `Infinity` → prune or `null`, document).
- **string** → default **pass through** as leaf so `code`, names, and ids survive.
- **Array** → **not** emitted as a JS array on wire. Standard form: **plain object** whose keys are **`$0`, `$1`, `$2`, …**, values are `memorygunprojectvalue(elem, options)` recursively.
- **Plain object:** iterate `Object.keys`, **skip empty-string keys** (Gun: `0 length key!`). For each key `k`, if not omitted, `out[k] = memorygunprojectvalue(input[k], options)` with path extended by `k`.
- **Prune:** `undefined`, `function`, `symbol`, non-finite number, **unsupported objects** (`Date`, `Map`, `WeakMap`, `Promise`, arbitrary class instances unless whitelisted).

**Arrays vs strings on wire:** Arrays cannot stay as JSON arrays on the wire—only string-keyed maps with **`$`** indices—not that string primitive values are forbidden.

### `memorygununprojectvalue(wire: unknown, options?: MemoryGunUnprojectOptions): unknown`

- **Ignore keys:** unproject does **not** invent `lookup` / `named`; they stay absent until **board index rebuild**.
- **Array-shaped objects:** if every own key matches **`/^\$\d+$/`**, strip the `$`, parse index, sort ascending, rebuild a **JS array**. Mixed keys (`$0` + `foo`) → treat as **plain object**, not an array.
- **No legacy bare numeric keys:** do **not** treat `"0"`, `"1"` keys as arrays; all array slots use **`$`** only.
- Recurse into nested objects that are not array-shaped.
- Leaves: null, boolean, number, string unchanged.

### Integration

- Neutral module: [`memorygunvalueproject.ts`](../memorygunvalueproject.ts) (pure data, no Gun import).
- Chain writer: [`memorygunputchain.ts`](../memorygunputchain.ts) — `memorygunputprojectedtochain`.
- Refactor [`gunsyncputobjecttograph`](../../feature/gunsync/graphvalue.ts): `memorygunprojectvalue` then walk/`put` onto [`Gunsyncgunchain`](../../feature/gunsync/graphvalue.ts).

[`gunsyncstripgunmeta`](../../feature/gunsync/graphvalue.ts) stays useful for inbound Gun merges before `memorygununprojectvalue`.

**Breaking note:** Replica / local graphs written with the **previous** numeric-string array layout will not rehydrate as JS arrays until re-written under the new projector.

---

## Layer 1: book-specific project / unproject

Treat the Gun book subtree as a **wire representation** of [`BOOK`](../types.ts). Book-level layout: `pageorder`, `pages/<pageId>/codepage`, **`activelist` as player → boolean map**, tombstones, legacy string blob. Under each `codepage` node, run **`memorygunprojectvalue(codepage, bookprojectoptions)`** with the shared **omitkey** preset.

- **Project** — [`memorybookprojecttogun`](../memorygunbookproject.ts) under `bookschain.get(book.id)`; activelist map; tombstones; optional **`clearbooknodefirst`** for full replace.
- **Unproject** — [`memorybookunprojectfromgun`](../memorygunbookproject.ts); legacy string `JSON.parse`; **`memorygununprojectvalue`** on `codepage` subtrees. Then rebuild board caches via [`memoryinitboardlookup`](../boardlookup.ts) on the projection path.

Thin callers: [`session.ts`](../session.ts), [`graphvalue.ts`](../../feature/gunsync/graphvalue.ts).

## Canonical Gun shape (book node)

| Path | Role |
|------|------|
| Scalars | `name`, `timestamp`, `token` (optional), etc. |
| `flags` | Object map |
| `activelist` | `activelist/<playerId>` → boolean |
| `pageorder` | Ordered page ids: keys `$0`, `$1`, … → string values (page ids) |
| `pages/<pageId>/codepage` | Subtree from generic project for one `CODE_PAGE` |

Deletion: clear removed `pages/<id>` and inactive `activelist/<player>` keys.

## Context

- In-memory `BOOK` keeps `pages: CODE_PAGE[]` and `activelist: string[]`; book unproject builds those from wire.
- `localmemory` string-per-book legacy handled in book **unproject** only.

## Risks / naming

- **`omitkey` collisions:** narrow predicate (e.g. path suffix `['codepage','board']`) if needed.
- **Hydrate ordering:** Board rebuild after full `BOOK` graph is assembled.
- **Naming:** `lowercaseoneword` per workspace rules — `memorygunprojectvalue`, `memorygununprojectvalue`, `memorybookprojecttogun`, `memorybookunprojectfromgun`.
- **Set:** convert to array then to **`$i`** map like other arrays.

## Optional later

- TypeScript `BOOK` as `Record<string, CODE_PAGE>` out of scope.
- `activeorder` on wire if order of actives matters.

---

## Implementation notes (this repo)

These details supplement the plan text:

1. **Empty arrays:** Wire uses a single-slot sentinel **`MEMORY_GUN_EMPTY_ARRAY_MARKER`** in [`memorygunvalueproject.ts`](../memorygunvalueproject.ts) so an empty object `{}` remains a plain object, not an empty array.
2. **Session → boardlookup:** [`session.ts`](../session.ts) uses a **dynamic `require('./boardlookup')`** inside `memorybookrehydrateboardsinbook` so test bundles that import session → gunsync do not eagerly load `msgpackr` (via `boardlookup` → … → `format`).
3. **Key modules:** [`memorygunbookproject.ts`](../memorygunbookproject.ts), [`memorygunroot.ts`](../memorygunroot.ts), [`gundocument.ts`](../gundocument.ts).
