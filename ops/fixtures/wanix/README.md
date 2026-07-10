# Wanix drag-drop fixtures

WASI `.wasm` and `.tgz` bundles for manual wanix testing (`#wanix`, file drop, paste).

## Tooling setup

Check which compilers are installed and get install hints:

```bash
yarn task run ops:fixtures:wanix:toolchains
```

Install anything reported missing, then regenerate fixtures:

```bash
yarn task run ops:fixtures:wanix:build
```

Use `--strict` to fail when any per-lang hello toolchain is missing (full regen before commit):

```bash
yarn task run ops:fixtures:wanix:build --strict
```

| Toolchain | Required for | Install (macOS) |
|-----------|--------------|-----------------|
| wabt | WAT fixtures (`wat2wasm`) | `brew install wabt` |
| go + `submodules/wanix` | Go WASI, Go gojs, zedcafe | `brew install go` |
| rust + `wasm32-wasip1` | `hello-rust.wasm` | `brew install rust` + `rustup target add wasm32-wasip1` |
| zig | `hello-zig.wasm` | `brew install zig` |
| tinygo | `hello-tinygo.wasm` | `brew tap tinygo-org/tools && brew trust tinygo-org/tools && brew install tinygo` |
| wasi-sdk | `hello-c.wasm` | install to `/opt/wasi-sdk` or set `WASI_SDK_PATH` |
| docker | Linux VM overlay | `brew install --cask docker` |

Sources for per-lang hellos live in `hello/` (see `hello/manifest.json`). WAT sources for greet/alpha/beta/termbridge remain in `src/*.wat`.

## Quick use

1. `yarn task cafe dev`
2. Drag files from **`ops/public/wanix/`** onto the cafe page (or paste from Finder).

| File | Tests |
|------|--------|
| `hello-wat.wasm` | WAT hello — first / incremental `.wasm` drop; prints `Hello from wanix!` |
| `hello-rust.wasm` | Rust WASI hello |
| `hello-zig.wasm` | Zig WASI hello |
| `hello-gowasi.wasm` | Go WASI (`wasip1`) hello |
| `hello-tinygo.wasm` | TinyGo WASI hello |
| `hello-c.wasm` | C WASI hello |
| `hello-gojs.wasm` | Go js/wasm hello |
| `hello-all.tgz` | All `hello-*.wasm` files in one bundle |
| `greet.wasm` | Second `.wasm` drop while a room is already running |
| `bundle-one.tgz` | Single `hello-wat.wasm` inside a gzip tar |
| `bundle-two.tgz` | Two `.wasm` files (`alpha.wasm`, `beta.wasm`) — spawns both tasks |
| `bundle-empty.tgz` | No `.wasm` — expect `wanix bundle … has no .wasm entries` warning |
| `termbridge.wasm` | Term bridge smoke — banner on stdout, stays running; type `ping` + Enter → `-> pong` on the tile |

## GoJS zedcafe tools

Built with `yarn task run ops:fixtures:wanix:zedcafe:build` (run `ops:fixtures:wanix:toolchains` first). `findplayers.wasm` and `greenring.wasm` share: `yarn task run ops:fixtures:wanix:findplayers:build`.

| File | Role |
|------|------|
| `zedcafe.wasm` | Export daemon — mounts schema-guarded export FS; host pushes game state via `writeFile` at guest mount `zedcafe/` |
| `findplayers.wasm` | One-shot scanner — prints a JSON array of export paths containing player elements |
| `greenring.wasm` | Finds onboard players, writes a green terrain ring around each into `board/terrain.json` (imported into sim on the next poll) |

**findplayers flow**

Zedcafe stands up **lazily** on first `#wanix vm` or wasm/tgz drop — not at login. Books load into sim memory only; the export daemon, shadow prime, and host push run when the task or VM room activates. Returning to idle **soft-idles** the wanix iframe (keeps warm `<wanix-system>`; halts zedcafe task and clears host export session). The next VM/task boot reuses the system when possible and rebuilds export from sim. Use hard stop (`stopwanixroom(true)`) to force a full remount.

Readiness contract: **mount ready** (`readDir` on export root) then **content ready** (`stats.json` after host push). Content signal uses `WANIX_MSG_EXPORT` `content-ready` postMessage (parent waits on event, then RPC poll fallback). Poll budget **30s / 250ms** (`WANIX_ZEDCAFE_EXPORT_READY_*` in [`wanixzedcafeconstants.ts`](../../../zss/feature/wanix/wanixzedcafeconstants.ts)).

1. `#wanix vm` or drop a wasm/tgz bundle boots the wanix task room and zedcafe export daemon from live memory.
2. Drop `findplayers.wasm` as a gojs task. The iframe **blocks spawn** until `#task/{rid}/export/stats.json` is readable, attaches a per-task `zedcafe/` bind (child tasks do not inherit system binds), then `allocate()` / `start()`.
3. The guest polls `zedcafe/stats.json` in its own task namespace (defense-in-depth) and prints one JSON stdout line: a sorted array of export-relative paths.

If zedcafe is not ready, spawn is blocked with a terminal error (the guest does not start).

**greenring flow**

Same stand-up as findplayers. Drop `greenring.wasm` with players on a board:

1. Waits for export content, scans for onboard players with coordinates.
2. Writes allowlisted `board/terrain.json` cells (green ring, Chebyshev radius 1) under each player’s book/page.
3. Within ~one import poll cycle (`WANIX_ZEDCAFE_IMPORT_POLL_MS` = 3s), the host imports into the sim worker and the board updates in cafe.

### Headed export validator

With `cafe:dev` running:

```bash
# login path (requires books in storage — matches manual dev login)
yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-zedcafe-vm-export.ts

# deterministic fixture inject (empty storage / CI)
ZEDCAFE_VALIDATE_FIXTURE=1 yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-zedcafe-vm-export.ts
```

Default login path waits for books in sim memory, then `#wanix vm`, then host export with `bookCount >= 1`. Fixture mode injects `example-coolregionsbow.book.json` in-page before VM boot. On failure, see `/tmp/wanix-zedcafe-export-report.json` and timestamped copies under `ops/fixtures/wanix/reports/`. Console lines tagged `[zedcafe-export]` trace push/sync/finalize decisions; `[wanix-perf]` marks phase timing (`drop-start`, `applyroom-warm-reuse`, `export-push-end`, `wasm-write-end`, `spawntask-return`).

## Term bridge (`termbridge.wasm`)

Guest prints a banner via WASI `fd_write` only (no stdin). Input and the `ping` → `pong` reply use the ZSS tile term bridge (`#task/…/term/data`), not WASI `fd_read(0)`.

1. Drop `termbridge.wasm` onto the app (or attach from `#wanix` after drop).
2. Confirm scrollback shows `wanix term bridge ready`.
3. Type `ping` and press Enter — tile should show `-> pong`.

## Suggested flows

**Per-lang hello smoke**

1. Drop any `hello-<lang>.wasm` → task room boots, prints `Hello from wanix!`.
2. Drop `hello-all.tgz` → spawns every hello task.

**Task room**

1. Drop `hello-wat.wasm` → task room boots, one task runs.
2. Drop `greet.wasm` → second task appended (no iframe rebuild flash).
3. Drop `bundle-two.tgz` → alpha + beta tasks spawn.

**VM room**

1. `#wanix vm` → Linux boots (stock `wanix-linux.tgz` + local `zedcafe-linux-overlay.tgz`).
2. Drop `hello-wat.wasm` → WASI task runs alongside VM.
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

```bash
yarn task run ops:fixtures:wanix:toolchains
yarn task run ops:fixtures:wanix:build
```

Built artifacts land in `ops/public/wanix/` — drag-drop from there or fetch at `/fixtures/wanix/` in dev.
