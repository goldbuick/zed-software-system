# Wanix example WASI binaries

Small WASI programs for drag-drop testing in the cafe app.

## Quick build (WAT)

After `yarn install` (provides `wabt` / `wat2wasm`):

```bash
yarn task run wanix:wasm:build
```

Compiles every `fixtures/wanix/*.wat` to a matching `.wasm` in this directory.

Sources:

| File | Output |
|------|--------|
| `hello.wat` | one-shot hello |
| `echo_stdin.wat` | read one line, echo |
| `hello-repl.wat` | interactive name + echo prompts |

Drag the `.wasm` onto a running app (`yarn task app dev`).

## Optional C build (wasi-sdk)

Readable C versions: `hello.c`, `hello-repl.c`. Compile when [wasi-sdk](https://github.com/WebAssembly/wasi-sdk) is installed:

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

`yarn install` applies `patches/wanix+0.4.0-alpha8.patch`, which wires WASI stdin to `#task/N/fd/0` (upstream ships `OpenEmptyFile()`). Run `wanix:ensure` after install so `cafe/public/wanix` matches patched `node_modules/wanix`.

Upstream source for reading/debugging (WASI worker, term device, workbench host): [`submodules/wanix/`](../../submodules/wanix/) — see [`submodules/README.md`](../../submodules/README.md).

## Stdin verify (fix loop)

```bash
yarn task run wanix:stdin:verify   # isolated host e2e
yarn task run e2e:test:wanix       # host + full-app CLI smoke
```
