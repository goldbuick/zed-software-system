---
name: wanix-vm-iframe-host
description: >-
  Boot and validate Wanix v86 VMs in the app-owned iframe host
  (cafe/wanix-iframe-host.ts). Use when editing wanix VM prep/spawn,
  debugging "VM started but xterm is empty / no serial / does not boot", or
  validating wanix VM + terminal-sizing changes with Playwright.
---

# Wanix VM iframe host

The hidden iframe `/wanix-iframe-host.html` (child: [cafe/wanix-iframe-host.ts](../../../cafe/wanix-iframe-host.ts)) runs both WASI tasks and v86 VMs for `#frame` mode. The parent is [zss/feature/wanix/wanixtermiframehost.ts](../../../zss/feature/wanix/wanixtermiframehost.ts). See also rule `wanix-term-bridge.mdc`.

## Invariant: VMs must be declared at system boot

`<wanix-system>` only launches the `<wanix-vm>` children **present in its markup when it boots** (`ready`). A `<wanix-vm start>` appended *after* `ready` (e.g. `insertAdjacentHTML`) connects and registers under `#vm/<rid>` but the v86 process **never starts** — so no serial ever appears.

- Tasks (`<wanix-task>`) start imperatively via `allocate()`/`start()` — adding them after `ready` is fine.
- VMs do NOT. `spawnvm` must **re-mount the whole `<wanix-system>` with the `<wanix-vm>` + `<wanix-term>` as initial children** (see `buildwanixvmfullhtml` in [zss/feature/wanix/wanixvmassets.ts](../../../zss/feature/wanix/wanixvmassets.ts)). Cache the asset URLs from `prepvm`; mount everything together in `spawnvm`.

Do NOT "fix" a dead VM by calling `vm.start()` / `_awake()` again, retrying, or patching `submodules/wanix`. The fix is mounting the vm declaratively.

## Symptom → cause

| Symptom | Cause |
|---|---|
| `vm started` logged, iframe + `wanix-term` exist, xterm buffer empty forever | vm added after `wanix-system` `ready` — never launched. Mount it as an initial child. |
| Serial empty only under headless Chromium | Headless + swiftshader boots v86 slowly/unreliably. Validate **headed** (real GPU). |
| `#vm` shows both `1/` and `<vmid>/` | `id` attr on `<wanix-vm>` creates a duplicate registration. The known-good recipe uses no `id` (locate via `sys.querySelector('wanix-vm')`). |

## Known-good reference recipe

[ops/fixtures/harness/wanix/vm-simple.html](../../../ops/fixtures/harness/wanix/vm-simple.html) declares binds + `<wanix-vm export="ttyS0" term start>` + `<wanix-term path="#vm/1/term" raw>` inside one `<wanix-system>` and boots to `~ #` in ~10s. When a VM path looks broken, load `https://localhost:7777/wanix/vm-simple.html` headed and confirm it boots — if it does and your path does not, the defect is in your code, not the environment.

## Validating wanix VM changes (full app, no product hooks)

Drive the **real app**, never a bare child page. Per `ops/fixtures/README.md`, add NO `window.__zss_e2e` hooks to `zss/feature/` or `cafe/` — read live state with Playwright `frame.evaluate()` (runtime inspection only).

1. A dev server is usually already running on `https://localhost:7777/` (`yarn task app dev`). Reuse it.
2. Headed Chromium with real GPU (NOT headless). First time: `npx playwright install chromium` (the headless-shell alone fails `headless:false`).
3. `page.goto('https://localhost:7777/')`, wait for canvas, click to focus, type `#wanix vm` + Enter.
4. Find the iframe: `page.frames().find(f => f.url().includes('wanix-iframe-host.html'))`.
5. Read the guest xterm buffer via `frame.evaluate` (deterministic text, not pixels):

```js
const buf = await frame.evaluate(() => {
  const t = document.querySelector('wanix-term')?._term
  if (!t) return ''
  const a = t.buffer.active, o = []
  for (let i = 0; i < a.length; i++) o.push(a.getLine(i)?.translateToString(true) ?? '')
  return o.join('\n')
})
```

6. Wait for `/~\s#/`. Terminal sizing is display-side only (pixel-size the iframe, let xterm's FitAddon compute cols/rows) — see skill `wanix-term-sizing`. Do NOT validate sizing via `stty`/winch/guest winsize. To check the grid, resize the viewport and assert `wanix-term._term.cols`/`.rows` change with the tile.

Ready-to-run template: [scripts/validate-wanix-vm.mjs](scripts/validate-wanix-vm.mjs) — `node .cursor/skills/wanix-vm-iframe-host/scripts/validate-wanix-vm.mjs` (needs the dev server up). Delete any throwaway copies when done.

Zed-cafe export gates (local only, not CI — dev server must be running):

```bash
yarn task run wanix:zed-cafe:export:validate      # minimal harness → #task/<rid>/export/manifest.json
yarn task run wanix:zed-cafe:export:validate:app  # full app #wanix vm → cat /zed-cafe/manifest.json
```

Legacy headed script: [scripts/validate-zed-cafe-vm-export.mjs](scripts/validate-zed-cafe-vm-export.mjs)

## Guardrails

- Bound every Playwright run; v86 boot is heavy. Log progress each step so a slow boot is distinguishable from a hang. Kill orphaned `Chrome for Testing` processes after interrupts.
- Diagnose before changing code: inspect the live `#vm` tree and `wanix-term` `_term` via `frame.evaluate` to confirm where serial actually flows.
