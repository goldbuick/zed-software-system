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

Upstream Wanix uses `<wanix-term>` bound to `#task/…/term`. In ZSS, **attached terminal mode** (`terminalmode: 'attached'`) is that bridge: a unified tile screen plus headless `WanixTermInput`.

| Direction | Path |
|-----------|------|
| Task → screen | guest `fd_write(1)` → `wanix:term-out` → **attached tile screen** (`WanixTermScreen`) |
| Kernel logs | `wanix:log` → `apilog` scrollback (hidden behind screen while attached) |
| Screen → task | headless `WanixTermInput` → `wanix:term-write` → `#task/run/term/data` |
| Line echo + smoke reply | local echo on tile screen; `ping` → `pong` on screen |

`termbridge.wasm` is the fixture for this flow: it prints a banner (proves **term-out**), stays running (keeps term routing), and accepts lines you type (proves **term-write**). It uses only `fd_write` — not WASI `fd_read(0)`.

Submitted lines and the `ping`/`pong` reply come from the **ZSS bridge** (local line discipline), not from the wasm guest.

### Manual test

1. `yarn task run wanix:ensure` then `yarn task app dev`
2. Drag `ops/fixtures/wanix/termbridge.wasm` onto the app — terminal enters **attached** mode (full-viewport tile screen)
3. Confirm the banner `wanix term bridge ready` renders on the tile grid
4. Type `ping` and press Enter — characters echo on the grid; `pong` appears after submit
5. `#wanix detach` or `Ctrl+\` then `#wanix detach` returns to CLI scrollback (kernel prep lines visible there)
6. `#wanix stop` halts the task

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

On first boot the host lazily fetches pinned `wanix-extras@0.4.0-rc1` archives (`wanix-linux.tgz` at `.`, `v86.tgz` at `#vm/v86`) from jsDelivr. Boot takes tens of seconds; prep progress lines go to **`apilog` scrollback** (not the guest tile screen).

While a VM is attached, the terminal is in **attached** mode: `WanixTermInput` streams **raw serial** bytes on each keypress; screen updates come from `wanix:term-out` only. Use **`Ctrl+\`** for a temporary ZSS CLI line (`#wanix detach`, etc.). WASI tasks and one VM can run in parallel; a new VM auto-attaches and steals terminal I/O.

Gated host e2e (large downloads, 3+ minutes):

```bash
PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1 yarn task run wanix:vm:verify
```

## IO verify (fix loop)

```bash
yarn task run wanix:io:verify   # isolated host e2e
yarn task run e2e:test:wanix    # host + full-app CLI smoke
```

## VM raw keystroke repro (debug)

The hidden Wanix iframe shares the **browser main thread** with ZSS — boot may stutter; that is expected.

To trace one-char VM serial crashes:

1. `yarn task app dev`
2. In DevTools console: `window.__ZSS_WANIX_TRACE__ = true`
3. `#wanix vm` — wait for Alpine login prompt (`~ #`) on the attached tile screen
4. Type one character — watch console for `[wanix] raw-key`, `term-write:rpc:*`, `term-write:stream:*`, and `vm-exit`
5. If `vm-exit` fires immediately after `term-write`, capture the full trace before the VM dies

Gated e2e with raw byte term-write after boot:

```bash
PLAYWRIGHT_INCLUDE_WANIX_VM_E2E=1 yarn task run wanix:vm:verify
```
