# Wanix example WASI binaries

Small WASI programs for drag-drop testing in the cafe app.

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
| `termbridge.wat` | **ZSS wanix-term bridge demo** — banner on stdout, then hold |

Drag the `.wasm` onto a running app (`yarn task app dev`). Multiple drops run in parallel; use `#wanix` to attach, stop, or unmount.

## ZSS wanix-term bridge (`termbridge.wasm`)

Upstream Wanix uses `<wanix-term>` bound to `#task/…/term`. In ZSS the **tape terminal** is that bridge while a task runs (`wanix term attached`).

| Direction | Path |
|-----------|------|
| Task → scrollback | guest `fd_write(1)` → `wanix:term-out` → terminal logs |
| Scrollback → task | cyan `wanix` prompt → `wanix:term-write` → `#task/run/term/data` |
| Line echo + smoke reply | ZSS bridge (`wanixhandletermwrite`) echoes your line to scrollback; `ping` → `pong` |

`termbridge.wasm` is the fixture for this flow: it prints a banner (proves **term-out**), stays running (keeps term routing), and accepts lines you type (proves **term-write**). It uses only `fd_write` — not WASI `fd_read(0)`.

Submitted lines and the `ping`/`pong` reply come from the **ZSS bridge** (local line discipline), not from the wasm guest.

### Manual test

1. `yarn task run wanix:ensure` then `yarn task app dev`
2. Drag `ops/fixtures/wanix/termbridge.wasm` onto the app
3. Confirm scrollback shows `wanix term bridge ready` and the input line shows the cyan **wanix** prefix
4. Type `ping` and press Enter — scrollback should show `ping` then `pong`
5. `#wanix stop` halts the task

Raw WASI `fd_read(0)` is not the integration surface; do not patch Wanix for `fd/0`. See `.cursor/rules/wanix-term-bridge.mdc`.

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

Upstream source for reading/debugging (WASI worker, term device, workbench host): [`submodules/wanix/`](../../../submodules/wanix/) — see [`submodules/README.md`](../../../submodules/README.md).

## Linux VM (v86 serial console)

Boot Alpine Linux in v86 from the `#wanix` menu or CLI:

```bash
#wanix vm
#wanix vm stop [id]
```

On first boot the host lazily fetches pinned `wanix-extras@0.4.0-rc1` archives (`wanix-linux.tgz` at `.`, `v86.tgz` at `#vm/v86`) from jsDelivr. Boot takes tens of seconds; progress lines appear in scrollback during `wanix:vm-prep`.

While a VM is attached, the terminal shows a cyan **`wanix-vm`** prompt and sends **raw serial** lines on Enter (no bridge echo/ping). WASI tasks and one VM can run in parallel; a new VM auto-attaches and steals terminal I/O.

Gated host e2e (large downloads, 3+ minutes):

```bash
PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1 yarn task run wanix:vm:verify
```

## IO verify (fix loop)

```bash
yarn task run wanix:io:verify   # isolated host e2e
yarn task run e2e:test:wanix    # host + full-app CLI smoke
```
