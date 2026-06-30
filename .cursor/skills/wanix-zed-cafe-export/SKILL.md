---
name: wanix-zed-cafe-export
description: >-
  Zed-cafe book export daemon, gojs task, task vs VM guest paths, and Playwright
  gates. Use when editing wanixzedcafe.ts, wanixiframechildmount export binds,
  /zed-cafe/ missing in VM guest, or zed-cafe Playwright validators.
---

# Zed-cafe export (Wanix guest)

Session books mirror to the Wanix guest as a **`zed-cafe/`** tree. Task layout: **`./zed-cafe/`**. VM layout: **`/zed-cafe/`** (virtfs child bind on `<wanix-vm>`).

See also: skill `wanix-vm-iframe-host`, rule `wanix-vm-lifecycle.mdc`, rule `wanix-zed-cafe-export.mdc`, rule `wanix-wasi-sdk.mdc`, [`ops/fixtures/wanix/README.md`](../../../ops/fixtures/wanix/README.md).

## Prerequisites (WASI drop fixtures)

Go WASI fixtures (`zedcaferead`, `zedcafewrite`, `zedcafewritebad`, `zedcafelist`, etc.) require **Go**:

```bash
yarn task run wanix:wasm:build
```

`wanix:wasm:build` alone builds all WASI drop fixtures under `ops/fixtures/wanix/`.

## Owners

| Concern | Module |
|---------|--------|
| Export tree schema (paths + host guards) | `zedcafetreeschema.ts` |
| Guest FS create guard (gojs export memfs) | `ops/fixtures/wanix/zed-cafe/schemaguardfs.go` |
| Host export files / inbox JSON | `wanixstateexport.ts`, `encodezedcafeinboxjson` in `wanixzedcafe.ts` |
| gojs daemon boot (task space) | `wanixzedcafe.ts` → `bootzedcafeexport` |
| VM spawn inbox + finalize | `wanixcommands.ts` → `spawnwanixvm({ inboxbytes, guestfiles })`, `finalizewanixzedcafedaemon` |
| Bootstrap snapshot at room boot | `readwanixbootzedcafestate`, `appendzedcafebootstrapbinds` in `wanixroombootstrap.ts` |
| Export wait + file capture | `wanixiframechildmount.ts` → `waitzedcafeexportready`, `collectzedcafeexportfiles` |
| VM in-place activation | `wanixiframechildtree.tsx` → `activatevmslot` on dormant `<wanix-vm>` |
| Guest → MEMORY import | `wanixstateimport.ts`, poll in `wanixzedcafe.ts` |

## Export tree shape

Schema owner: `zss/feature/wanix/zedcafetreeschema.ts` (`validatezedcafeexportpaths` on export/push).

```text
zedcafe/stats.json
zedcafe/books/<kebab-name>-<book-id>/stats.json
zedcafe/books/.../pages/<kebab-name>-<page-id>/stats.json, terrain.json, …
```

Folder segments use `{kebab-case-name}-{id}` (e.g. `my-cool-book-book1`, `player-page2`). Empty name falls back to id-only (`sid_abc`). Legacy `books/<id>/` import is not supported.

### Schema helpers (export only)

| Helper | Output |
|--------|--------|
| `kebabcasezedcafedirname(name, id)` | `my-cool-book-book1` or `sid_abc` when name empty |
| `readzedcafebookprefix(book)` | `books/<seg>` |
| `readzedcafepageprefix(book, page)` | `books/<seg>/pages/<seg>` |
| `validatezedcafeexportpaths(files)` | `{ ok, errors[] }` — structural + allowlist |

**Export/push:** `buildzedcafeexportfiles` → `assertzedcafeexportvalid`; `pushzedcafeexportfiles` / `encodezedcafeinboxjson` fail closed (`apilog` + skip write).

**Import:** permissive for unknown paths; resolves book/page dirs from meta `name` + `id` via `kebabcasezedcafedirname`. Do not re-add id-only folder import.

### Go ExportFS (`ops/fixtures/wanix/zed-cafe/exportfs.go`)

gojs hydrates inbox JSON into `schemaGuardFS` wrapping memfs. Allowlist: `allowed-path-patterns.json` (parity with `ZED_CAFE_EXPORT_ALLOWED_PATH`). Guest creates outside the allowlist fail at FS layer (`ErrPermission`). `go test ./...` covers allow/reject paths; `zedcafewritebad.wasm` is the headed duplex gate for live rejection.

Ready probe: **`stats.json`** at `#task/<rid>/export/stats.json` (poll via `waitzedcafeexportready`).

VM `#ramfs/zedcafe` uses ns bind from guarded export (`appendzedcafeexportramfsbind`), not blob file binds on the live path. Bootstrap uses per-file `#ramfs/zedcafe/*` binds from host memory at first mount.

## Task vs VM path

| | Task (`task-*` phase) | VM (`vm-active`) |
|--|----------------------|------------------|
| Bootstrap | `appendzedcafebootstrapbinds` on system at `bootroom` | Ramfs file binds on system + dormant `<wanix-vm>` |
| Export bind | `{ dst: zedcafe, src: #task/<rid>/export }` on system | Skip live bind on export phase; capture files from `#task/<rid>/export` or use prefilled `guestfiles` |
| Inbox | `inboxbytes` file bind at mount + optional `putwanixfile` | **File bind at mount** from `inboxbytes` passed to `spawnvm` |
| Guest mount | ns bind → `./zedcafe/` | `activatevmslot`: per-file virtfs on `<wanix-vm>` + `start` (no room remount) |
| Host after boot | `startzedcafepoll` | `finalizewanixzedcafedaemon` — **no second gojs boot** |

## Playwright gates (local, headed, dev server required)

Shared helpers: [`tasks/lib/wanix/playwright-vm.ts`](../../../tasks/lib/wanix/playwright-vm.ts) — `withscripttimeout(label, ms, fn)`, `WANIX_VM_VALIDATE_TIMEOUTS`, apilog capture, VM frame helpers. Task defs: [`tasks/groups/wanix.ts`](../../../tasks/groups/wanix.ts).

| Task | Role |
|------|------|
| **`wanix:vm:zed-cafe:validate`** | **Primary acceptance** — `#wanix vm` → `ls /`, `ls /zed-cafe`, `cat stats.json` |
| `wanix:zed-cafe:export:validate` | Regression — same guest milestones via full app |
| `wanix:vm:boot:validate` | Book seed + dormant vm + in-place activation milestones |
| `wanix:zed-cafe:task-read:validate` | Drop `zedcaferead.wasm` → tile `zed-cafe ok:` (**needs `wanix:wasm:build`**) |
| `wanix:zed-cafe:duplex:validate` | Drop `zedcafewrite.wasm` + `#wanix pull` + `zedcafewritebad.wasm` schema guard (**needs `wanix:wasm:build`**) |
| `wanix:zed-cafe:list:validate` | Drop `zedcafelist.wasm` after export warm (**needs `wanix:wasm:build`**) |

**Unit tests do not prove guest visibility.** Gate 3 (or equivalent) is required for `/zed-cafe/` bugs.

### Jest (wanix unit)

Always use the repo config — bare `yarn jest` on `.ts` files fails Babel `import type` parsing:

```bash
yarn jest --config ops/jest.config.ts \
  ops/tests/unit/feature/wanix/zedcafetreeschema.test.ts \
  ops/tests/unit/feature/wanix/wanixstateexport.test.ts \
  ops/tests/unit/feature/wanix/wanixstateimport.test.ts \
  ops/tests/unit/feature/wanix/wanixiframechildmount.test.ts --no-coverage
```

Composite: `yarn task run wanix:zed-cafe:memfs:validate` (build + `go test` + headed app Playwright + jest smoke).

### Validator observability

- Captured: iframe `postwanixiframeapilog` → `zss-wanix-term-apilog` postMessage.
- **Not** captured: host tape `apilog` scrollback (`wanix vm prep: fetching linux`, etc.).
- Book drop seeds **host memory** only; iframe apilog starts after `#wanix vm` (or task space boot).
- Milestone A (boot gate): `#ramfs/zedcafe ready — activating vm slot` (in-place, no remount apilog)

Timeouts (override via env): `ZSS_WANIX_VM_SCRIPT_TIMEOUT_MS` (default 420000), `ZSS_WANIX_VM_SHELL_TIMEOUT_MS` (default 360000). See rule `no-hanging-scripts.mdc`.

Scenario doc: [`ops/fixtures/wanix/zed-cafe-task-read-scenario.md`](../../../ops/fixtures/wanix/zed-cafe-task-read-scenario.md) section **E**.

## Debug workflow

1. Headed repro: `#wanix vm` or `yarn task run wanix:vm:zed-cafe:validate`
2. Poll iframe apilog every few seconds (gate scripts or manual `message` listener)
3. Pin phase: inbox staging → gojs export → task export ready → in-place vm activation → v86 shell → virtfs / `ls /zedcafe`
4. Fix in the owner module above — no new notify/coordination layers (rule `no-new-systems-for-bugs.mdc`)

## Common errors

| Log / symptom | Likely cause |
|---------------|--------------|
| `zed-cafe export: invalid tree` | Path outside allowlist or missing book/page `stats.json` for meta entries — fix in `zedcafetreeschema.ts` / export builder, not push workaround |
| `inbox encode skipped` | Same — `encodezedcafeinboxjson` returned null after validation |
| `#task/N/export: file does not exist` | Export bind before gojs created export tree |
| `#ramfs/zedcafe: file does not exist` | VM/bind before export staged; or ns bind never mounted |
| `vm started`, empty serial | `<wanix-vm>` appended after `ready` |
| `/zedcafe/` missing, shell OK | virtfs bind failed or export capture empty |
| Duplicate gojs rid in apilog | `ensurewanixzedcafedaemon` after `spawnwanixvm` on VM path |
