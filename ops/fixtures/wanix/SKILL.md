---
name: zedcafe-flat
description: >-
  Read and write zed.cafe live game state via the zedcafe JSON export tree
  (flat path-keyed files under a zedsync peer / serve-root). Use when editing
  boards, objects, terrain, flags, or codepages on disk through Wanix zedsync.
---

# zedcafe flat JSON filesystem

Live sim books are exported as many small JSON files (one path per unit of
state), not one nested book blob. A **zedsync peer** (folder drop, 9P
`serve-root`, or a workspace like `zed-workspace`) mirrors that tree so you
can read and write game state from disk.

**Not this skill:** nested `.book.json` templates for drag-drop authoring —
use [book-content](../book-content/SKILL.md).

**Not gadget `/flat/...` patches** — those are internal boardrunner/gadget
pointers, not export paths.

Canonical schema: [`zss/feature/wanix/zedcafetreeschema.ts`](../../../zss/feature/wanix/zedcafetreeschema.ts).
Architecture / sync: [`zss/feature/wanix/README.md`](../../../zss/feature/wanix/README.md).

## When to use

- Inspect or edit a live board from a peer folder (`serve-root`, zedsync target)
- Change terrain cells, place/move objects, tweak page `code`, or player flags
- Debug what the sim last exported (`exportRevision`, book/page dirs)

## Mounts and peers

| Location | Meaning |
|----------|---------|
| Guest `zedcafe/` or `/zedcafe/` | In-Wanix view of the export tree |
| `#task/{rid}/export/` | Host write root (gojs zedcafe daemon) |
| Peer dir (e.g. `zed-workspace/`, `ops/fixtures/wanix/p9server/serve-root/`) | Disk mirror via `#wanix zedsync <path>` |

Ready gate on the peer: `<peer>/.zedsync-ready`. Meta under `<peer>/.zedsync/` is **not** game content — do not edit it as state.

Conflict policy: **newer mtime wins** (no merge). Assume a **single writer** on the peer for a given path.

## Tree layout

Dirs are `{kebab-name}-{id}` (or bare `id` if the name is empty). No `books/` or `pages/` segments.

```text
stats.json                                          # root catalog + exportRevision
.zedsync/revision                                   # host revision hint (allowlisted)
{bookDir}/stats.json                                # book meta (no embedded flags)
{bookDir}/flags/{ownerId}.json                      # per-owner flag bag
{bookDir}/{pageDir}/stats.json                      # page: id, code, type, name
{bookDir}/{pageDir}/board/stats.json                # board exits, startx/starty, …
{bookDir}/{pageDir}/board/terrain.json              # array length 1500 (60×25)
{bookDir}/{pageDir}/board/objects/{objId}.json      # one object per file
{bookDir}/{pageDir}/object/element.json             # object codepage kind
{bookDir}/{pageDir}/terrain/element.json            # terrain codepage kind
{bookDir}/{pageDir}/charset/bitmap.json
{bookDir}/{pageDir}/palette/bitmap.json
```

**Forbidden:** `board/terrain/<index>.json` (per-cell files) — rejected on validate/import.

Allowlist source of truth: `ZED_CAFE_EXPORT_ALLOWED_PATH` in `zedcafetreeschema.ts`
(mirrored by `ops/fixtures/wanix/zedcafe/allowed-path-patterns.json`).

### Path → game concept

| Concept | Path |
|---------|------|
| Book list / revision | `stats.json` |
| Book id, name, token, activelist, page index | `{book}/stats.json` |
| Player / chip / world flags | `{book}/flags/{owner}.json` |
| Codepage source (`code`) | `{book}/{page}/stats.json` |
| Board runtime | `board/stats.json` + `board/terrain.json` + `board/objects/*.json` |
| Kind templates | `object/element.json`, `terrain/element.json` |
| Player on a board | `board/objects/pid_….json` (+ usually `flags/pid_….json`) |

## How to read

1. Open peer root `stats.json` — note `exportRevision`, `bookCount`, and `books[]` (`id`, `name`, `pageCount`).
2. Resolve book dir: `{kebab(name)}-{id}/` (example: `darkpianoshammer-sid_vuYEPNKWWAPd/`).
3. Open `{book}/stats.json` — `pages[]` lists `{ id, type, name }` for every codepage.
4. For a board page, open:
   - `{page}/stats.json` — ZSS in `code` (`@board …`, `@startx`, …)
   - `{page}/board/stats.json` — runtime board stats
   - `{page}/board/terrain.json` — full grid
   - `{page}/board/objects/*.json` — objects (including `kind: "player"`)

### Terrain index

Board is **60×25** (`BOARD_WIDTH` × `BOARD_HEIGHT` = `BOARD_SIZE` = **1500**).

```text
index = x + y * 60
```

Cell shape (fields vary by kind):

```json
{
  "kind": "solid",
  "color": 15,
  "char": 219,
  "collision": 1,
  "x": 0,
  "y": 0,
  "category": 0,
  "kinddata": { "id": "sid_…", "name": "solid", "…" }
}
```

Keep `x`/`y` on the cell consistent with the array index when you edit.

### Object / player

```json
{
  "kind": "player",
  "id": "pid_…",
  "x": 4,
  "y": 10,
  "char": 2,
  "color": 15,
  "player": "pid_…"
}
```

One file per object id under `board/objects/`.

### Flags

`{book}/flags/{owner}.json` is a JSON object of flag name → value.

**Import-protected** (exported but skipped on import overwrite/delete) — owners ending in:

`_gadget`, `_chip`, `_synth`, `_layers`, `_tracking`

Edit player bags (`pid_…` without those suffixes) and other world flags only. Do not expect protected bags to round-trip from peer edits.

## How to write (peer edit loop)

Recommended loop (same as Wanix README agent contract):

1. **Read** peer `stats.json` — record `exportRevision`.
2. **Edit** the smallest allowlisted files for the change (prefer one file per change).
3. **Wait** for the next zedsync tick (polling, not push).
4. **Re-read** `stats.json` and the paths you touched:
   - If `exportRevision` advanced, the sim also pushed — re-diff contested paths (newer mtime wins; your edit may have been overwritten).
   - If revision is unchanged and content matches your edit, the write landed.
5. Confirm in-sim (board looks right / flags updated). Do not invent a second sync path.

### Safe edits

| Goal | Edit |
|------|------|
| Change a cell | Patch one entry in `board/terrain.json` (keep length 1500) |
| Move / retint an object | Edit that object's `board/objects/{id}.json` (`x`, `y`, `char`, `color`, …) |
| Add an object | Create `board/objects/{newId}.json` with a unique id |
| Remove an object | Delete that object file |
| Change board start / exits | Edit `board/stats.json` (and page `code` `@startx`/`@starty` if you want source to match) |
| Change ZSS source | Edit `{page}/stats.json` → `code` |
| Set a player flag | Edit `flags/pid_….json` |

### Write rules

- Paths must match the allowlist; no `..`, no leading `/` in export-relative paths.
- Book `stats.json` must **not** embed `flags` or `timestamp`.
- Do not create per-cell `board/terrain/<n>.json`.
- Prefer rewriting whole small files atomically (write temp + rename) so readers never see half JSON.
- Touch mtime by writing the file — zedsync uses mtime for conflicts.
- Do not delete peer files expecting them to stay gone if `zedcafe/` still has them — zedsync restores deletes from export.
- Do not edit `.zedsync/` or race structural deletes while the sim is mid-export.

## Root / book catalog shapes

Root `stats.json`:

```json
{
  "exportRevision": 0,
  "bookCount": 1,
  "books": [{ "id": "sid_…", "name": "mybook", "pageCount": 46 }],
  "exportedAt": "2026-07-20T14:41:15.149Z"
}
```

Book `stats.json` (excerpt): `id`, `name`, `token`, `activelist`, `pages[]`.

Page `stats.json`:

```json
{
  "id": "sid_…",
  "code": "@board title\n@startx 4\n@starty 12",
  "type": "board",
  "name": "title"
}
```

## Local examples

| Peer | Path |
|------|------|
| Dev 9P default | `ops/fixtures/wanix/p9server/serve-root/` |
| Empty seed | `ops/fixtures/wanix/scenarios/zedsync-peer/` |
| Typical workspace peer | sibling `zed-workspace/` (when zedsync is pointed there) |

Serve a folder: `yarn task run ops:fixtures:wanix:p9server:dev -- <folder>`.

## Do not

- Confuse this tree with `.book.json` / `ops/fixtures/content/templates/` packaging
- Edit import-protected `flags/*_gadget.json` (etc.) expecting the sim to accept overwrites
- Invent `/flat/...` paths in the export tree
- Reintroduce an in-browser `#agent` — peer JSON + existing `#make` / editor are the authoring paths
- Add a new sync/notify layer when an edit "did not stick" — check mtime / `exportRevision` first ([`no-new-systems-for-bugs`](../../rules/no-new-systems-for-bugs.mdc))

## Code map (if debugging import/export)

| Role | Module |
|------|--------|
| Path allowlist / dirnames | `zss/feature/wanix/zedcafetreeschema.ts` |
| Memory → files | `zss/feature/wanix/wanixstateexport.ts` |
| Files → memory | `zss/feature/wanix/wanixstateimport.ts` |
| Parent orchestration | `zss/device/wanixclient/wanixzedcafe.ts` |
| Sim import / export | `zss/device/vm/handlers/importzedcafe.ts`, `exportzedcafe.ts` |
