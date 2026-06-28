---
name: wanix-zed-cafe-export
description: >-
  Zed-cafe book export daemon, gojs task, task vs VM guest paths, and Playwright
  gates. Use when editing wanixzedcafe.ts, wanixiframechildmount export binds,
  /zed-cafe/ missing in VM guest, or zed-cafe Playwright validators.
---

# Zed-cafe export (Wanix guest)

Session books mirror to the Wanix guest as a **`zed-cafe/`** tree. Task layout: **`./zed-cafe/`**. VM layout: **`/zed-cafe/`** (virtfs child bind on `<wanix-vm>`).

See also: skill `wanix-vm-iframe-host`, rule `wanix-vm-lifecycle.mdc`, [`ops/fixtures/wanix/README.md`](../../../ops/fixtures/wanix/README.md).

## Owners

| Concern | Module |
|---------|--------|
| Host export files / inbox JSON | `wanixstateexport.ts`, `encodezedcafeinboxjson` in `wanixzedcafe.ts` |
| gojs daemon boot (task space) | `wanixzedcafe.ts` → `bootzedcafeexport` |
| VM spawn inbox + finalize | `wanixcommands.ts` → `spawnwanixvm({ inboxbytes })`, `finalizewanixzedcafedaemon` |
| Export wait + file capture | `wanixiframechildmount.ts` → `waitzedcafeexportready`, `collectzedcafeexportfiles` |
| VM two-phase remount | `wanixiframechildtree.tsx`, `beginvmboot` in controller |
| Guest → MEMORY import | `wanixstateimport.ts`, poll in `wanixzedcafe.ts` |

## Export tree shape

```text
zed-cafe/stats.json
zed-cafe/books/<book-id>/…/stats.json, terrain.json, …
```

Ready probe: **`stats.json`** at `#task/<rid>/export/stats.json` (poll via `waitzedcafeexportready`).

## Task vs VM path

| | Task (`task-*` phase) | VM (`vm-active`) |
|--|----------------------|------------------|
| Export bind | `{ dst: zed-cafe, src: #task/<rid>/export }` on system | Skip live bind on export phase; capture files from `#task/<rid>/export` |
| Inbox | `putwanixfile(#ramfs/zed-cafe-inbox.json)` when root exists | **File bind at mount** from `inboxbytes` passed to `spawnvm` |
| Guest mount | ns bind → `./zed-cafe/` | Remount: file binds on `#ramfs/zed-cafe/*` + child bind `zed-cafe` ← `#ramfs/zed-cafe` on `<wanix-vm>` |
| Host after boot | `startzedcafepoll` | `finalizewanixzedcafedaemon` — **no second gojs boot** |

## Playwright gates (local, headed, dev server required)

Shared helpers: [`tasks/implementations/wanix/wanix-playwright-vm.mjs`](../../../tasks/implementations/wanix/wanix-playwright-vm.mjs)

| Task | Role |
|------|------|
| **`wanix:vm:zed-cafe:validate`** | **Primary acceptance** — `#wanix vm` → `ls /`, `ls /zed-cafe`, `cat stats.json` |
| `wanix:zed-cafe:export:validate:app` | Regression alias (same guest milestones) |
| `wanix:vm:boot:validate` | Book seed + remount Milestone A + same guest milestones |
| `wanix:zed-cafe:export:validate` | Minimal harness (no full app) |

**Unit tests do not prove guest visibility.** Gate 3 (or equivalent) is required for `/zed-cafe/` bugs.

### Validator observability

- Captured: iframe `postwanixiframeapilog` → `zss-wanix-term-apilog` postMessage.
- **Not** captured: host tape `apilog` scrollback (`wanix vm prep: fetching linux`, etc.).
- Book drop seeds **host memory** only; iframe apilog starts after `#wanix vm` (or task space boot).
- Milestone A (boot gate): `#ramfs/zed-cafe ready — remounting wanix-system with wanix-vm`.

Timeouts (override via env): `ZSS_WANIX_VM_SCRIPT_TIMEOUT_MS` (default 420000), `ZSS_WANIX_VM_SHELL_TIMEOUT_MS` (default 360000). See skill `no-hanging-scripts`.

Scenario doc: [`ops/fixtures/wanix/zed-cafe-task-read-scenario.md`](../../../ops/fixtures/wanix/zed-cafe-task-read-scenario.md) section **E**.

## Debug workflow

1. Headed repro: `#wanix vm` or `yarn task run wanix:vm:zed-cafe:validate`
2. Poll iframe apilog every few seconds (gate scripts or manual `message` listener)
3. Pin phase: inbox staging → gojs export → task export ready → remount → v86 shell → virtfs / `ls /zed-cafe`
4. Fix in the owner module above — no new notify/coordination layers (rule `no-new-systems-for-bugs.mdc`)

## Common errors

| Log / symptom | Likely cause |
|---------------|--------------|
| `#task/N/export: file does not exist` | Export bind before gojs created export tree |
| `#ramfs/zed-cafe: file does not exist` | VM/bind before export staged; or ns bind never mounted |
| `vm started`, empty serial | `<wanix-vm>` appended after `ready` |
| `/zed-cafe/` missing, shell OK | virtfs bind failed or export capture empty |
| Duplicate gojs rid in apilog | `ensurewanixzedcafedaemon` after `spawnwanixvm` on VM path |
