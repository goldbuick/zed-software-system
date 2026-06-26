# Wanix example WASI binaries

Small WASI programs for drag-drop testing in the cafe app.

## 0.4 upstream recipes (not wanix.run)

Runtime: jsDelivr **`wanix@0.4.0-alpha8`** (`readwanixruntimeurls()` in `zss/feature/wanix/wanixvmassets.ts`).  
Pin check: `yarn task run wanix:ensure` → `ops/fixtures/wanix/BUILD_ID`.  
Reference: [tractordev/wanix](https://github.com/tractordev/wanix) **`main`** (`<wanix-system>` custom elements).

**Do not** copy [wanix.run](https://wanix.run) — that is the **v0.3 bundle** demo (`new Wanix({ bundle: "/shell/shell.tgz" })`), a different API generation.

| ZSS feature | Upstream 0.4 recipe | ZSS owner |
|-------------|---------------------|-----------|
| WASI drop / `#wanix` tasks | Quick start `#ramfs` + `<wanix-task type="wasi" term>` | `spawnwanixspace` → `#ramfs` boot; `createtask` |
| `#wanix vm` prep | [`examples/basic-vm.html`](https://github.com/tractordev/wanix/blob/main/examples/basic-vm.html) — linux + `#vm` ns + v86 binds **before** first `ready` | `spawnwanixvmspace` → `bootwanixsystemforvm` |
| VM serial console | `<wanix-vm export="ttyS0" term>` + `#vm/<rid>/term/data` | `createvm` + `connectvmterm` after `el.start()` |
| Term I/O | `<wanix-term path="…" raw>` (we use tile bridge instead of xterm) | `wanixhost.ts` + `WanixTermInput` |
| `./zed-cafe/` book export | Auto on warm + debounced book edits; gojs daemon `zed-cafe` | `wanixstateexport.ts` + `wanixzedcafe.ts` |

Session books mirror to **`./zed-cafe/`** (WASI tasks) or **`/zed-cafe/`** (Linux VM) when Wanix is warm. No CLI command — edit a book and `manifest.json` updates within ~2s.

Build the gojs export guest (runs automatically before `app:build`):

```bash
yarn task run wanix:zed-cafe:build
```

Shipped at `/wanix/zed-cafe.wasm` (`cafe/public/wanix/`). Staging stays internal: wasm file bind `{ dst: #ramfs/zed-cafe.wasm, src: /wanix/zed-cafe.wasm }`; gojs cmd is `#ramfs/zed-cafe.wasm`. Inbox writes to **`#ramfs/zed-cafe-inbox.json`** via `putwanixfile`; iframe child verifies bytes exist before gojs `start` (no blob overlay on `#ramfs`). Export bind `{ dst: zed-cafe, src: #task/<rid>/export }` resolves to `./zed-cafe/` (task) or `/zed-cafe/` (VM). On export bind failure, fallback: `#ramfs/zed-cafe` ← export, then `zed-cafe` ← `#ramfs/zed-cafe`. Guest `ls /` should show only normal Linux dirs plus **`zed-cafe/`** after export — no `_wanix`, `zed-cafe.wasm`, or `zed-cafe-inbox.json` on `/`.

**Local gates** (dev server must be running: `yarn task app dev`):

```bash
yarn task run wanix:zed-cafe:export:validate      # minimal harness → #task/<rid>/export/manifest.json
yarn task run wanix:zed-cafe:export:validate:app  # full app #wanix vm → cat /zed-cafe/manifest.json
```

| Layout | Read books |
|--------|------------|
| Task | `cat zed-cafe/manifest.json` |
| VM | `cat /zed-cafe/manifest.json` |

Layout:

```text
zed-cafe/
  manifest.json
  books/<book-id>/book.json
  books/<book-id>/pages/<page-id>.json
```

Verify: warm Wanix → `cat zed-cafe/manifest.json` from a task, or `#wanix vm` → `cat /zed-cafe/manifest.json`.

VM prep must **not** call `_setupNamespace` a second time after `#ramfs` (that caused the Go `writeFile` panic). `#wanix vm` reboots into the basic-vm bind layout via `spawnwanixvmspace`.

Import **`wanixtour`** book for a playable demo of `./zed-cafe/` on the `wanixzedcafe` board.

### Manual vm-simple harness

Upstream-faithful port of [`examples/basic-vm.html`](https://github.com/tractordev/wanix/blob/main/examples/basic-vm.html) — visible `<wanix-term>`, full-height xterm, event log.

Source: `ops/fixtures/harness/wanix/vm-simple.html`  
Dev URL: [/wanix/vm-simple.html](http://localhost:7777/wanix/vm-simple.html)

1. `yarn task run wanix:ensure` (optional pin check)
2. `yarn task app dev`
3. Open `/wanix/vm-simple.html` — wait for `login:` (large CDN download on first boot)
4. Type `root`, Enter, Enter, then `id` — expect `uid=0(root)`
5. Bottom log should show `wanix-system ready` with no panic lines

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

Upstream Wanix uses `<wanix-term>` bound to `#task/…/term` or `#vm/<rid>/term`. On `/` (when `#frame` is present), ZSS hosts Wanix in a **hidden iframe** with `<wanix-term>` and mirrors the child xterm grid to the **tile GPU** (`WanixTermScreen`) via cell snapshots plus `WanixTermInput`.

| Direction | Path |
|-----------|------|
| Task → screen | guest `fd_write(1)` → iframe xterm → **50ms cell poll** → `wanixtermscreensync` → tile |
| Kernel prep logs | `apilog` scrollback during spawn (not mirrored to tile) |
| Screen → task | `WanixTermInput` → `sendwanixtermwrite` / `sendwanixterminput` → iframe child RPC → `#…/term/data` |
| Line echo + smoke reply | local echo on tile before attach; `ping` → `pong` on screen |

**Attach-on-first-cells:** spawn/drop stays on CLI scrollback until the iframe child emits the first cell snapshot; then tile mode opens. **`#wanix attach <id>`** forces tile immediately (manual attach).

`termbridge.wasm` prints a banner (proves term-out), stays running, and accepts lines via the bridge (proves term-write). It uses only `fd_write` — not WASI `fd_read(0)`.

### Manual test

1. `yarn task run wanix:ensure` then `yarn task app dev`
2. Drag `ops/fixtures/wanix/termbridge.wasm` — stay on CLI until banner appears on tile
3. Tile screen opens with `wanix term bridge ready` mirrored from xterm
4. Type `ping` and press Enter — `pong` on the grid
5. `#wanix detach` or `Ctrl+\` returns to CLI scrollback
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

Browser kernel loads from jsDelivr (pinned in `zss/feature/wanix/wanixvmassets.ts`):

```bash
yarn task run wanix:ensure   # writes BUILD_ID pin only
```

Upstream source: [`submodules/wanix/`](../../../submodules/wanix/) — see [`submodules/README.md`](../../../submodules/README.md).

## Linux VM (v86 serial console)

Boot Alpine Linux in v86 from the `#wanix` menu or CLI:

```bash
#wanix vm
#wanix vm stop [id]
```

On first boot the host lazily fetches pinned `wanix-extras@0.4.0-rc1` archives from jsDelivr. Prep lines go to **`apilog` scrollback**. Tile mode opens on **first cell snapshot** from the VM (kernel/login output mirrored from iframe xterm).

While attached, `WanixTermInput` sends per-keystroke data via `sendwanixterminput` → `TextEncoder` → `#vm/<vrid>/term/data`. VM spawn connects term **after** `el.start()` using the rid path with alias fallback. **Paste:** Ctrl+V / Cmd+V while the wanix term is focused (VM raw sends clipboard text to serial; task/pre-attach modes buffer until Enter).

**Main thread:** the hidden iframe shares the browser main thread with ZSS WebGL — vm-prep/boot may freeze the canvas briefly; expected until upstream workerizes more kernel work.

### Color validation

Plain `ls -la` on BusyBox is **white-on-black** — it does not emit SGR unless you force color. Use these commands at `~ #` to validate the tile bridge carries fg/bg:

1. Set `ZSS_WANIX_SHOW=true` in `cafe/.env.local` and restart dev (optional iframe xterm overlay + `[wanix] cell-colors` console log).
2. `#wanix vm` → wait for `~ #`.
3. Run in order:

```sh
# Raw ANSI — best signal (bypasses ls/dircolors)
printf '\033[31mred\033[0m \033[32mgreen\033[0m \033[34mblue\033[0m \033[43;30myellow-bg\033[0m\n'

# BusyBox ls with forced color
ls --color=always /

# If still plain, force directory/file colors
LS_COLORS='di=34:fi=32' ls --color=always /
```

**How to read results**

| iframe xterm (show overlay) | ZSS tile | Verdict |
|-----------------------------|----------|---------|
| Colored | Colored | End-to-end color working |
| Colored | White/black only | Tile bridge bug — follow-up fix |
| Both plain | Both plain | Guest/xterm not applying SGR (unlikely after `printf` test) |

With show mode on, console should log `[wanix] cell-colors { uniqueFg: N, uniqueBg: M }` with **N > 1** after the `printf` line when xterm holds palette colors.

## Manual verification

1. `yarn task app dev`
2. Drop `hello.wasm` or use `#wanix` commands
3. For VM term bridge: `#wanix vm` — prep in apilog; tile opens on first cell snapshot
4. For upstream VM baseline: `/wanix/vm-simple.html` — see **Manual vm-simple harness** above

## VM keystroke repro (debug)

1. `yarn task app dev`
2. `ZSS_WANIX_SHOW=true` in `cafe/.env.local` (or `window.ZSS_WANIX_SHOW = true`) — restart dev server if using env
3. `#wanix vm` — prep in apilog; tile opens on first cell snapshot; wait for `~ #`
4. Type a command and Enter — check console for `[wanix] iframe-term-size` / `iframe-pixel-size` if sizing looks wrong (set `ZSS_WANIX_SHOW=true` in `cafe/.env.local`)
5. Second command — if input stops, check worker panic in console

After code changes, repeat steps 1–5 manually or use the `/wanix/vm-simple.html` harness to bisect VM term issues.
