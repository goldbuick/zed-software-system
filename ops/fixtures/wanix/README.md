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

## GoJS zedcafe tools

Built with `yarn task run ops:fixtures:wanix:zedcafe:build` (needs Go + `submodules/wanix`):

| File | Role |
|------|------|
| `zedcafe.wasm` | Export daemon — mounts empty guarded export FS; host pushes game state via `writeFile` at guest mount `zedcafe/` |
| `findplayers.wasm` | One-shot scanner — prints JSON list of all `pid_*` players from `zedcafe/` |

**findplayers flow**

Readiness contract: **mount ready** (`readDir` on export root) then **content ready** (`stats.json` after host push). Content signal matches [`waitzedcafeexportcontentready`](../../../zss/feature/wanix/wanixzedcafehost.ts). Poll budget **30s / 250ms** (`WANIX_ZEDCAFE_EXPORT_READY_*` in [`wanixzedcafeconstants.ts`](../../../zss/feature/wanix/wanixzedcafeconstants.ts)).

Zedcafe warms on **register ready** (sim + memory up), not on wasm drop or `#wanix`. The iframe RPC handler must answer `ping` before the task room boots.

1. Cafe boots the wanix task room and zedcafe export daemon from live memory when export files are available.
2. Drop `findplayers.wasm` as a gojs task. The iframe **blocks spawn** until `#task/{rid}/export/stats.json` is readable, attaches a per-task `zedcafe/` bind (child tasks do not inherit system binds), then `allocate()` / `start()`.
3. The guest polls `zedcafe/stats.json` in its own task namespace (defense-in-depth) and prints one JSON stdout line.

If zedcafe is not ready, spawn is blocked with a terminal error (the guest does not start).

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

1. `#wanix vm` → Linux boots (stock `wanix-linux.tgz` + local `zedcafe-linux-overlay.tgz`).
2. Drop `hello.wasm` → WASI task runs alongside VM.
3. Drop `bundle-one.tgz` → bundle task runs; VM still up.
4. `#wanix vm stop` → VM stops; tasks keep running.

## VM overlay (`zedcafe-linux-overlay.tgz`)

Layers jq, curl, wget, and zedcafe shell helpers on top of the stock Wanix Linux rootfs when `#wanix vm` boots.

Built with `yarn task run ops:fixtures:wanix:linux:overlay:build` (needs Docker):

| Path in guest | Role |
|---------------|------|
| `/boot/rc` | MOTD listing zedcafe tools |
| `/usr/bin/zedcafe-*` | Export introspection (`zedcafe-ready`, `zedcafe-stats`, `zedcafe-books`, …) |
| `/usr/bin/jq`, `curl`, `wget` | JSON and network utilities |

Live game content still mounts at **`/zedcafe/`** from the host export daemon (not baked into the overlay).

**VM smoke**

1. Build overlay (once): `yarn task run ops:fixtures:wanix:linux:overlay:build`
2. `yarn task cafe dev` → `#wanix vm`
3. MOTD appears at boot; after export is ready: `zedcafe-stats`, `zedcafe-books`
4. `curl -I https://example.com` — network sanity

Sources: `linux/` (this directory). Output: `ops/public/wanix/zedcafe-linux-overlay.tgz` and `cafe/public/wanix/`.

**Empty bundle**

1. Drop `bundle-empty.tgz` → warning in log, no crash.

## Regenerate

Requires [WABT](https://github.com/WebAssembly/wabt) (`wat2wasm`, `wasm-validate`):

```bash
yarn task run ops:fixtures:wanix:build
```

Sources live in `src/*.wat` (this directory). Built artifacts land in `ops/public/wanix/` — drag-drop from there or fetch at `/fixtures/wanix/` in dev.
