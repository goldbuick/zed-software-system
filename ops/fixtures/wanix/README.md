# Wanix drag-drop fixtures

WASI `.wasm` and `.tgz` bundles for manual wanix testing (`#wanix`, file drop, paste).

## Quick use

1. `yarn task cafe dev`
2. Drag files from **`ops/public/wanix/`** onto the cafe page (or paste from Finder).

| File | Tests |
|------|--------|
| `hello.wasm` | First / incremental `.wasm` drop; prints `Hello from wanix!` |
| `greet.wasm` | Second `.wasm` drop while a room is already running |
| `bundle-one.tgz` | Single `.wasm` inside a gzip tar |
| `bundle-two.tgz` | Two `.wasm` files (`alpha.wasm`, `beta.wasm`) — spawns both tasks |
| `bundle-empty.tgz` | No `.wasm` — expect `wanix bundle … has no .wasm entries` warning |
| `termbridge.wasm` | Term bridge smoke — banner on stdout, stays running; type `ping` + Enter → `-> pong` on the tile |
| `input2terrain.wasm` | Task bind-on-drop example — reads `input/stamp.png`, writes `zedcafe/…/board/terrain.json` |
| `png2terrain.sh` | VM bind-on-drop example — same pipeline from Linux guest (`sh input/png2terrain.sh`) |
| `stamp.png` | Shared 1×1 PNG input for pipeline examples |

## Bind-on-drop pipeline (`input/`)

While **attached** to a Wanix term session, file drops bind under **`input/<name>`** (not spawn tasks). Processors read `input/` and write zedcafe export paths under `zedcafe/…` so the host import poll can sync boards/terrain.

**Prerequisite:** a book with a board page loaded so `zedcafe/…/board/terrain.json` exists in the export tree.

### Task example (`input2terrain.wasm`)

1. Drop `input2terrain.wasm` (idle) → task spawns.
2. `#wanix attach <task-id>`.
3. Drop `stamp.png` → binds to `input/stamp.png`.
4. Run `input2terrain.wasm` in the attached terminal.
5. Expect apilog: `zedcafe import: synced …`.

### VM example (`png2terrain.sh`)

1. `#wanix vm` → attach to `linux-vm`.
2. Drop `png2terrain.sh` → `input/png2terrain.sh` (executable).
3. Drop `stamp.png` → `input/stamp.png`.
4. In VM terminal: `sh input/png2terrain.sh`.
5. Expect apilog: `zedcafe import: synced …`.

## Term bridge (`termbridge.wasm`)

Guest prints a banner via WASI `fd_write` only (no stdin). Input and the `ping` → `pong` reply use the ZSS tile term bridge (`#task/…/term/data`), not WASI `fd_read(0)`.

1. Drop `termbridge.wasm` onto the app (or attach from `#wanix` after drop).
2. Confirm scrollback shows `wanix term bridge ready`.
3. Type `ping` and press Enter — tile should show `-> pong`.

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
yarn task run ops:fixtures:wanix:build
```

Sources live in `src/*.wat` (this directory). Built artifacts land in `ops/public/wanix/` — drag-drop from there or fetch at `/fixtures/wanix/` in dev.
