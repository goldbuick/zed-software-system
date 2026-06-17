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

Drag the `.wasm` onto a running app (`yarn task app dev`).

Interactive input uses the **ZSS terminal as wanix-term**: `#task/run/term/data` via `wanix:term-write`. Raw WASI `fd_read(0)` is not supported.

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

## IO verify (fix loop)

```bash
yarn task run wanix:io:verify   # isolated host e2e
yarn task run e2e:test:wanix    # host + full-app CLI smoke
```
