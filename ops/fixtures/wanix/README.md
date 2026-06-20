# Wanix example WASI binaries

Small WASI programs for drag-drop testing in the cafe app.

## 0.4 upstream recipes (not wanix.run)

Runtime: npm **`wanix@0.4.x`** → `yarn task run wanix:ensure` → `cafe/public/wanix/`.  
Reference: [tractordev/wanix](https://github.com/tractordev/wanix) **`main`** (`<wanix-system>` custom elements).

**Do not** copy [wanix.run](https://wanix.run) — that is the **v0.3 bundle** demo (`new Wanix({ bundle: "/shell/shell.tgz" })`), a different API generation.

| ZSS feature | Upstream 0.4 recipe | ZSS owner |
|-------------|---------------------|-----------|
| WASI drop / `#wanix` tasks | Quick start `#ramfs` + `<wanix-task type="wasi" term>` | `spawnwanixspace` → `#ramfs` boot; `createtask` |
| `#wanix vm` prep | [`examples/basic-vm.html`](https://github.com/tractordev/wanix/blob/main/examples/basic-vm.html) — linux + `#vm` ns + v86 binds **before** first `ready` | `spawnwanixvmspace` → `bootwanixsystemforvm` |
| VM serial console | `<wanix-vm export="ttyS0" term>` + `#vm/<rid>/term/data` | `createvm` + `connectvmterm` after `el.start()` |
| Term I/O | `<wanix-term path="…" raw>` (we use tile bridge instead of xterm) | `wanixhost.ts` + `WanixTermInput` |

VM prep must **not** call `_setupNamespace` a second time after `#ramfs` (that caused the Go `writeFile` panic). `#wanix vm` reboots into the basic-vm bind layout via `spawnwanixvmspace`.

### How we measure success (in order)

| Gate | Command | Proves |
|------|---------|--------|
| 1. Upstream prep | `yarn task run wanix:vm-prep-smoke` | VM mount + v86 driver, **60s panic soak** (no `<wanix-term>`) |
| 2. vm-simple | `yarn task run wanix:vm-simple-smoke` | upstream [`basic-vm.html`](https://github.com/tractordev/wanix/blob/main/examples/basic-vm.html) port — visible `<wanix-term>`, `login:`, `id` / `uid=` |
| 3. Deferred term | `yarn task run wanix:vm-simple-deferred-smoke` | `<wanix-term>` connected after gojs settle — timing bisect |
| 4. Iframe + WebGL | `yarn task run wanix:vm-term-iframe-smoke` | term I/O inside hidden iframe under mock `#frame` WebGL |
| 5. Full app tile | `yarn task run wanix:vm:app:verify` | hidden iframe host → ZSS tile; `uname --help` + `id` |
| 6. Fix loop | `yarn task run wanix:vm:fixloop` | all of the above + isolated ZSS baseline |

Manual **vm-simple** (matches upstream basic-vm.html): [/wanix/vm-simple.html](http://localhost:7777/wanix/vm-simple.html) — full-height xterm; type `root`, Enter, Enter, then `id`.

Manual **prep only** (no xterm): [/wanix/smoke-basic-vm.html](http://localhost:7777/wanix/smoke-basic-vm.html)

Manual **deferred term** bisect: [/wanix/vm-simple-deferred.html?auto=1&delay=15000](http://localhost:7777/wanix/vm-simple-deferred.html?auto=1&delay=15000)

Manual iframe page: [/wanix/smoke-basic-vm-term-iframe.html](http://localhost:7777/wanix/smoke-basic-vm-term-iframe.html) — status line should end with `iframe term smoke ok`.

Legacy redirect: [/wanix/smoke-basic-vm-term.html](http://localhost:7777/wanix/smoke-basic-vm-term.html) → `vm-simple.html`.

Verify:

```bash
yarn task run wanix:vm:fixloop
```

## Quick build (WAT)

After `yarn install` (provides `wabt` / `wat2wasm`):

```bash
yarn task run wanix:wasm:build
```

Compiles every `ops/fixtures/wanix/*.wat` to a matching `.wasm` in this directory.

Sources:

| File | Output |
|------|--------|
| `hello.wat` | one-shot hello (batch stdout) |
| `hold.wat` | infinite loop (e2e term-write while running) |
| `termbridge.wat` | **ZSS tile term bridge demo** — banner on stdout, then hold |

Drag the `.wasm` onto a running app (`yarn task app dev`). Multiple drops run in parallel; use `#wanix` to attach, stop, or unmount.

## ZSS tile term bridge (`termbridge.wasm`)

Upstream Wanix uses `<wanix-term>` bound to `#task/…/term` or `#vm/<rid>/term`. On `/` (when `#frame` is present), ZSS hosts Wanix in a **hidden iframe** with `<wanix-term>` and mirrors serial to the **tile grid** (`WanixTermScreen`) plus `WanixTermInput`. Isolated pages and WASI drops without `#frame` still use in-page `#zss-wanix-display` until the iframe task path is active.

| Direction | Path |
|-----------|------|
| Task → screen | guest `fd_write(1)` → `streamtermout` → **first serial opens tile** → `WanixTermScreen` (replays buffer) |
| Kernel prep logs | `wanixiobridgepush` → `apilog` scrollback |
| Screen → task | `WanixTermInput` → `sendwanixtermwrite` / `sendwanixterminput` → `#…/term/data` |
| Line echo + smoke reply | local echo on tile; `ping` → `pong` on screen |

**Attach-on-serial:** spawn/drop stays on CLI scrollback until the guest prints stdout; then tile mode opens and replays all serial since spawn. **`#wanix attach <id>`** forces tile immediately (manual attach).

`termbridge.wasm` prints a banner (proves term-out), stays running, and accepts lines via the bridge (proves term-write). It uses only `fd_write` — not WASI `fd_read(0)`.

### Manual test

1. `yarn task run wanix:ensure` then `yarn task app dev`
2. Drag `ops/fixtures/wanix/termbridge.wasm` — stay on CLI until banner stdout
3. Tile screen opens with `wanix term bridge ready` replayed
4. Type `ping` and press Enter — `pong` on the grid
5. `#wanix detach` or `Ctrl+\` then `#wanix detach` returns to CLI scrollback
6. `#wanix stop` halts the task

Raw WASI `fd_read(0)` is not the integration surface. See `.cursor/rules/wanix-term-bridge.mdc`.

## Optional C build (wasi-sdk)

Readable C version: `hello.c`. Compile when [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) is installed:

```bash
brew install wasi-sdk
# or download a release and export WASI_SDK_PATH

yarn task run wanix:wasm:build:c
```

If wasi-sdk is missing, the task prints a skip message and exits 0.

Build everything:

```bash
yarn task run wanix:wasm:build:all
```

System `clang` on macOS does **not** target `wasm32-wasi`; use wasi-sdk's `clang`.

## Runtime

Vend the browser wanix kernel into `cafe/public/wanix`:

```bash
yarn task run wanix:ensure
```

`yarn install` provides the `wanix` npm package. Run `wanix:ensure` after install so `cafe/public/wanix` matches `node_modules/wanix`.

Upstream source: [`submodules/wanix/`](../../../submodules/wanix/) — see [`submodules/README.md`](../../../submodules/README.md).

## Linux VM (v86 serial console)

Boot Alpine Linux in v86 from the `#wanix` menu or CLI:

```bash
#wanix vm
#wanix vm stop [id]
```

On first boot the host lazily fetches pinned `wanix-extras@0.4.0-rc1` archives from jsDelivr. Prep lines go to **`apilog` scrollback**. Tile mode opens on **first serial** from the VM (kernel/login output replayed).

While attached, `WanixTermInput` sends per-keystroke data via `sendwanixterminput` → `TextEncoder` → `#vm/<vrid>/term/data`. VM spawn connects term **after** `el.start()` using the rid path with alias fallback.

**Main thread:** in-page Wanix shares the browser main thread with ZSS WebGL — vm-prep/boot may freeze the canvas briefly; expected until upstream workerizes more kernel work.

Gated e2e (large downloads, 3+ minutes):

```bash
PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1 yarn task run wanix:vm:verify
```

## Automated fix loop (use instead of manual browser checks)

Stop `yarn task app dev` first (port **7777** must be free — Playwright starts its own Vite with `CI=1`).

```bash
yarn task run wanix:vm:fixloop
```

| Step | Task | What it catches |
|------|------|-----------------|
| 1 | `wanix:vm-prep-smoke` | Upstream CDN + wanix.wasm |
| 2 | `wanix:vm-term-smoke` | `<wanix-term>` login + `id` (standalone) |
| 3 | `wanix:vm-term-iframe-smoke` | term I/O in iframe under mock WebGL |
| 4 | `wanix:vm:isolated:verify` | Isolated `wanix-vm-e2e.html` term stress |
| 5 | `wanix:vm:app:verify` | **Full ZSS app** hidden iframe + tile bridge |

Fast single gate (matches your manual `/` repro):

```bash
yarn task run wanix:vm:app:verify
```

Tests collect `panic` / `DataView` / `Value.Set on undefined` from the browser console — the same errors you see in DevTools.

## IO verify (task bridge)

```bash
yarn task run wanix:io:verify   # in-page host e2e via full app
yarn task run e2e:test:wanix    # full-app CLI smoke
```

## VM keystroke repro (debug)

1. `yarn task app dev`
2. `window.__ZSS_WANIX_TRACE__ = true`
3. `#wanix vm` — prep in apilog; tile opens on first serial; wait for `~ #`
4. Type a command and Enter — watch `[wanix] term-input` / `connectvmterm` traces
5. Second command — if input stops, check `vm-exit` or worker panic in console

After code changes, prefer **`yarn task run wanix:vm:app:verify`** or **`yarn task run wanix:vm:fixloop`** over repeating steps 1–5 manually.
