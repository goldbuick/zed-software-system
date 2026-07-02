# Wanix drag-drop fixtures

WASI `.wasm` and `.tgz` bundles for manual wanix testing (`#wanix`, file drop, paste).

## Quick use

1. `yarn task app dev`
2. Drag files from **`ops/fixtures/wanix/`** onto the cafe page (or paste from Finder).

| File | Tests |
|------|--------|
| `hello.wasm` | First / incremental `.wasm` drop; prints `Hello from wanix!` |
| `greet.wasm` | Second `.wasm` drop while a room is already running |
| `bundle-one.tgz` | Single `.wasm` inside a gzip tar |
| `bundle-two.tgz` | Two `.wasm` files (`alpha.wasm`, `beta.wasm`) — spawns both tasks |
| `bundle-empty.tgz` | No `.wasm` — expect `wanix bundle … has no .wasm entries` warning |

## Suggested flows

**Task room**

1. Drop `hello.wasm` → task room boots, one task runs.
2. Drop `greet.wasm` → second task appended (no iframe rebuild flash).
3. Drop `bundle-two.tgz` → alpha + beta tasks spawn.

**VM room**

1. `#wanix vm` → Linux boots.
2. Drop `hello.wasm` → WASI task runs alongside VM.
3. Drop `bundle-one.tgz` → bundle task runs; VM still up.
4. `#wanix vm stop` → VM stops; tasks keep running.

**Empty bundle**

1. Drop `bundle-empty.tgz` → warning in log, no crash.

## Regenerate

Requires [WABT](https://github.com/WebAssembly/wabt) (`wat2wasm`, `wasm-validate`):

```bash
yarn task run content:wanix:fixtures:build
```

Sources live in `src/*.wat`. Built artifacts are copied to `ops/fixtures/public/wanix/` for dev URLs at `/fixtures/wanix/` (optional fetch; drag-drop uses the paths above).
