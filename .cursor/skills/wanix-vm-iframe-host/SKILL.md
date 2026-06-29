---
name: wanix-vm-iframe-host
description: >-
  Boot and validate Wanix v86 VMs in the app-owned iframe host
  (cafe/wanix-iframe-host.ts). Use when editing wanix VM prep/spawn,
  debugging "VM started but xterm is empty / no serial / does not boot",
  /zed-cafe/ missing in VM guest, or validating wanix VM changes with Playwright.
---

# Wanix VM iframe host

The hidden iframe `/wanix-iframe-host.html` (child: [cafe/wanix-iframe-host.ts](../../../cafe/wanix-iframe-host.ts)) runs both WASI tasks and v86 VMs for `#frame` mode. The parent is [zss/feature/wanix/wanixtermiframehost.ts](../../../zss/feature/wanix/wanixtermiframehost.ts).

Related: rule `wanix-term-bridge.mdc`, rule `wanix-vm-lifecycle.mdc`, rule `wanix-zed-cafe-export.mdc`, skill `wanix-zed-cafe-export`, skill `wanix-term-sizing`.

## Invariant: VMs must be declared at system boot

`<wanix-system>` dispatches `ready`, then each child runs `_awake()` ([`submodules/wanix/elements/base.js`](../../../submodules/wanix/elements/base.js)). Only `<wanix-vm>` elements **already in markup** get `_awake` and launch v86.

- **Tasks** (`<wanix-task>`): can be appended after `ready`; `allocate()` / `start()` work imperatively.
- **VMs**: appended after `ready` register under `#vm/<rid>` but **v86 never starts** — empty serial forever.

Do NOT fix a dead VM with `vm.start()`, retry `_awake()`, or patches to `submodules/wanix`. **Remount** `<wanix-system>` with `<wanix-vm>` + `<wanix-term>` as initial children (bump `mountKey` in [wanixiframechildcontroller.ts](../../../zss/feature/wanix/wanixiframechildcontroller.ts)).

Mount helpers: [`mountwanixsystemtree`](../../../zss/feature/wanix/wanixiframechildmount.ts), [`appendwanixvminitialtree`](../../../zss/feature/wanix/wanixiframechildmount.ts). VM asset URLs: [`wanixvmassets.ts`](../../../zss/feature/wanix/wanixvmassets.ts) (from `prepvm`).

## Child binds at VM allocate

[`submodules/wanix/elements/vm.js`](../../../submodules/wanix/elements/vm.js): `_awake` → `allocate()` → `task.allocate(querySelectorAll(':scope > wanix-bind'))`.

Guest virtfs (e.g. `zed-cafe` ← `#ramfs/zed-cafe`) must be **child `<wanix-bind>` elements of `<wanix-vm>`** in markup before `ready`, and `#ramfs/zed-cafe` must be populated **before** allocate (file binds on the remount tree).

## Two-phase VM + zed-cafe boot

When export must complete before the guest mount exists, use **`bootstage`** on `vm-active` ([`wanixiframechildtypes.ts`](../../../zss/feature/wanix/wanixiframechildtypes.ts)):

| Phase | Tree | Purpose |
|-------|------|---------|
| `export` | Prep binds + gojs + inbox file bind — **no `<wanix-vm>`** | Run gojs; wait for `#task/<rid>/export/stats.json`; capture files |
| `boot` | Prep + `#ramfs/zed-cafe/*` file binds + `<wanix-vm start>` + `<wanix-term>` | v86 starts with virtfs source already staged |

Owner flow: [wanixiframechildtree.tsx](../../../cafe/wanix/wanixiframechildtree.tsx) → `waitzedcafeexportready` → `collectzedcafeexportfiles` → `controller.beginvmboot(guestfiles)`.

`spawnvm` RPC resolves at **`onspawnvmcomplete`** after boot-phase VM is ready — not at first export-phase `ready`.

Zed-cafe details: skill `wanix-zed-cafe-export`.

## Symptom → cause

| Symptom | Cause |
|---------|--------|
| `vm started` logged, xterm empty forever | `<wanix-vm>` added after `ready` — remount as initial child |
| `open #ramfs/zed-cafe: file does not exist` | VM allocate/bind before export staged on `#ramfs` |
| `#task/N/export: file does not exist` | Export ns bind before gojs finished |
| Shell `~ #` OK but no `/zed-cafe/` | virtfs child bind missing or export capture failed |
| `wanix iframe child: vm … not ready` | VM never launched (post-ready append) or v86 driver slow |
| Serial empty only under headless Chromium | Use **headed** Chromium (real GPU) |
| `#vm` shows `1/` and `<vmid>/` | Duplicate `id` on `<wanix-vm>` — prefer no `id` |

## Known-good reference recipe

Upstream [`examples/basic-vm.html`](https://github.com/tractordev/wanix/blob/main/examples/basic-vm.html) — binds + `<wanix-vm export="ttyS0" term start>` + `<wanix-term>` in one `<wanix-system>`, boots to `~ #`.

Validate via headed Playwright: `yarn task run wanix:vm:zed-cafe:validate`. If that gate passes but the manual app path does not, the defect is in ZSS spawn/mount code, not the environment.

## Validating wanix VM changes (full app, no product hooks)

Drive the **real app**. Per `ops/fixtures/README.md`, add NO `window.__zss_e2e` hooks to `zss/feature/` or `cafe/` — use Playwright `frame.evaluate()` only.

1. Dev server: `yarn task app dev` → `https://localhost:7777/`
2. **Headed** Chromium (`headless: false`). First time: `npx playwright install chromium`
3. Focus canvas, type `#wanix vm`, Enter
4. Iframe: `page.frames().find(f => f.url().includes('wanix-iframe-host.html'))`
5. Read guest buffer:

```js
const buf = await frame.evaluate(() => {
  const t = document.querySelector('wanix-term')?._term
  if (!t) return ''
  const a = t.buffer.active, o = []
  for (let i = 0; i < a.length; i++) o.push(a.getLine(i)?.translateToString(true) ?? '')
  return o.join('\n')
})
```

6. Wait for `/~\s#/`. Sizing: pixel-size iframe + FitAddon — skill `wanix-term-sizing`. Do NOT use `stty`/winch/guest winsize.

### Playwright gates

```bash
yarn task run wanix:vm:zed-cafe:validate   # primary acceptance
yarn task run wanix:zed-cafe:export:validate  # regression (same guest milestones)
yarn task run wanix:vm:boot:validate       # book seed + remount milestone
```

Shared: [`tasks/implementations/wanix/wanix-playwright-vm.mjs`](../../../tasks/implementations/wanix/wanix-playwright-vm.mjs) — `assertguestzedcafe`, `waitforvmshell`, bounded timeouts.

**Iframe apilog only:** validators listen for `zss-wanix-term-apilog` postMessage. Host tape `apilog` lines are **not** visible. Do not use host-only strings (e.g. `wanix vm prep: fetching linux`) as Playwright milestones.

Minimal template: [scripts/validate-wanix-vm.mjs](scripts/validate-wanix-vm.mjs).

## Debug workflow

Before code changes:

1. Headed repro (`#wanix vm` or gate script)
2. Poll iframe apilog (gate capture or DevTools `message` events)
3. Compare against `wanix:vm:zed-cafe:validate` headed gate
4. Pin failing phase: export / remount / v86 / virtfs

On gate failure: `dumpfailurediagnostics` logs xterm tail + apilog tail.

## Guardrails

- Bound every Playwright run (rule `no-hanging-scripts.mdc`); v86 boot is heavy
- Log progress per milestone so slow boot ≠ hang
- Kill orphaned Chrome for Testing after interrupts
- Diagnose via live `#vm` tree and `wanix-term._term` — not WASI fd 0 (rule `wanix-term-bridge.mdc`)
