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
| `listinput.wasm` | Bind-on-drop smoke — polls `input/` every 500ms; prints on change (`once` argv = one-shot) |
| `input2terrain.wasm` | Task bind-on-drop — reads `input/*.png` (or argv), writes `zedcafe/…/board/terrain.json` |
| `png2terrain.sh` | VM bind-on-drop — same pipeline (`sh input/png2terrain.sh [name.png]`) |
| `stamp-red.png` | 8×8 red input (95 bytes → 16 cells) |
| `stamp-green.png` | 8×8 green input (96 bytes → 17 cells) |
| `stamp-blue.png` | 8×8 blue input (98 bytes → 19 cells) |

## Remote import + zedsync

Browser Wanix cannot export its namespace to an external folder. Workaround:

1. Serve a host folder over WebSocket 9P
2. `#wanix remote connect` imports that mount (idle → stands up a task room and mounts immediately; no prior wasm drop needed)
3. `#wanix zedsync <dst>` mirrors it with `zedcafe/` (r/w; remote deletes are restored from zedcafe)

### Start a 9P WebSocket server

Cafe only accepts **`wss://`** remotes. Use the local fixture (TLS via cafe mkcert):

```bash
# empty default root under ops/fixtures/wanix/p9server/serve-root
yarn task run ops:fixtures:wanix:p9server:dev

# or pick a folder
yarn task run ops:fixtures:wanix:p9server:dev -- ~/Desktop/zedcafe-sync

# always wss://localhost:8765/ (override with -port); then in cafe:
#wanix remote connect wss://localhost:8765/ remote
#wanix zedsync remote

go test ./p9server/ ./zedsync/ -count=1   # from ops/fixtures/wanix
```

**How to confirm the WSS is alive**

- p9server stdout should log `p9server: new connection from …` on each browser connect (and closed / 9p session lines).
- DevTools Network → Socket: select the **wanix iframe** context (or enable “frames”). Parent-page `?token=…` Pending sockets are Vite HMR, not the 9P remote.
- Console `[wanix-perf]`: `remote-import-prepare` / `remote-wss-force-dial` (`pre-append-start`) → `remote-wss-socket-open` → `remote-wss-open` / `remote-import-open`, then room ready. Do **not** await WSS before append (that settled the import Promise early and deadlocked Go wasm → `wanix-system ready timeout`).
- `#wanix zedsync remote` requires a matching remote mount and an active room; guest prints `waiting for target dir ...` before seed, then `seed progress N/M` while copying. Guest export-ready wait is 600s; host `.zedsync-ready` wait is 900s. Per-cell `board/terrain/<index>.json` trees are rejected — wipe/re-seed remotes after schema changes.
- **Live flat-file edits** (flags, `board/terrain.json`, etc. under the served folder) are supported while zedsync is running. `SteadyTick` recovers gojs FS panics into a retryable tick error (watcher stays up). Host export **defers removes** during guest-dirty/import so concurrent remote→zedcafe writes are not racing `directory not empty` deletes; benign ENOTEMPTY on remove is soft-logged.

### Cafe commands

```text
#wanix remote connect wss://localhost:8765/ remote
#wanix zedsync remote
```

- Target path must **not contain spaces** (Wanix splits `cmd` on spaces).
- Empty remote is seeded from `zedcafe/` first (never wipes zedcafe because remote started empty).
- Sync skips any path with a `.`-prefixed segment (dotfiles, hidden dirs, `.zedsync-ready`).
- After ready: deleting a file on the **remote** restores it from `zedcafe/`; deleting from **zedcafe** still removes the remote peer.
- Import poll pauses until `<target>/.zedsync-ready`, then resumes.
- `#wanix stop` / soft idle ends the zedsync task — look for `zedsync: stopped`. The 5‑minute term idle auto-halt applies to one-shot dropped wasm tasks only; **zedsync** (like **zedcafe**) is exempt so a quiet watch loop stays alive.
- Build guest: `yarn task run ops:fixtures:wanix:findplayers:build` → `cafe/public/wanix/zedsync.wasm` (also staged under `ops/public/wanix/`)

### Headed remote-mount validator

With `cafe:dev` and `ops:fixtures:wanix:p9server:dev` running:

```bash
yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-wanix-remote-mount.ts
```

Optional: `WANIX_P9_WSS_URL=wss://localhost:8765/` (default). Gates: session ready → `#wanix remote connect …` → `[wanix-perf]` `remote-wss-then` → `remote-wss-fulfill-allowed` → `remote-wss-open` → iframe `readDir('remote')`. On failure, see `/tmp/wanix-remote-mount-report.json`.

## Bind-on-drop pipeline (`input/`)

While **attached** to a Wanix term session, file drops bind under **`input/<name>`** (not spawn tasks). Processors read `input/` and write zedcafe export paths under `zedcafe/…` so the host import cycle can sync boards/terrain.

**Stamps:** three 8×8 PNGs with different byte lengths. Cell count is `bytes % 40 + 1`, so swapping stamps changes stdout and proves the guest read the real file.

| File | Bytes | Cells (`% 40 + 1`) |
|------|------:|-------------------:|
| `stamp-red.png` | 95 | 16 |
| `stamp-green.png` | 96 | 17 |
| `stamp-blue.png` | 98 | 19 |

**Prerequisite (full pipeline):** a book with a board page loaded so `zedcafe/…/board/terrain.json` exists in the export tree.

### Smoke (`listinput.wasm` — live poll)

Default mode is a **long-running watch** (500ms `ReadDir` poll). Leave it attached and drop stamps; do not re-run the task for each file.

1. Drop `listinput.wasm` (idle) → task spawns and starts watching.
2. `#wanix attach <task-id>` (keep the tile focused so stdout stays visible).
3. Expect `listinput: initial` then `listinput: empty` (or existing files if any).
4. Drop `stamp-red.png` → binds to `input/stamp-red.png`.
5. Within ~500ms expect `listinput: change` then `listinput: ok stamp-red.png (95 bytes)`.
6. Drop `stamp-green.png` → expect another `change` with `96 bytes` (basename must update).
7. Optional one-shot: spawn with argv `once` to list and exit.

Note: wanix task idle auto-halt (~5 minutes with no term I/O) may stop the watcher; attached typing/stdout activity resets that timer.

### Task example (`input2terrain.wasm`)

1. Drop `input2terrain.wasm` (idle) → task spawns.
2. `#wanix attach <task-id>`.
3. Drop `stamp-red.png` → binds to `input/stamp-red.png`.
4. Run `input2terrain` in the attached terminal (optional argv: basename).
5. Expect stdout mentioning `stamp-red.png`, `16 cells`, `95 bytes`, then apilog: `zedcafe import: synced …`.
6. Drop `stamp-blue.png`, run again — expect `19 cells` / `98 bytes`.

### VM example (`png2terrain.sh`)

1. `#wanix vm` → attach to `linux-vm`.
2. Drop `png2terrain.sh` → `input/png2terrain.sh` (executable).
3. Drop `stamp-green.png` → `input/stamp-green.png`.
4. In VM terminal: `sh input/png2terrain.sh` (or `sh input/png2terrain.sh stamp-green.png`).
5. Expect stdout with basename + cell count; apilog: `zedcafe import: synced …`.

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
2. Writes allowlisted `board/terrain.json` (green ring, Chebyshev radius 1) under each player’s book/page.
3. When the task term closes (after gojs exit), host kicks one import-poll cycle, imports into the sim worker, and the board updates in cafe.

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
| `/usr/bin/zedcafe-*` | Export introspection (`zedcafe-ready`, `zedcafe-stats`, `zedcafe-books`, `zedcafe-players`, `zedcafe-code`, `zedcafe-find`, …) |
| `/usr/bin/jq`, `curl`, `wget` | JSON and network utilities |

Live game content still mounts at **`/zedcafe/`** from the host export daemon (not baked into the overlay).

**VM smoke**

1. Build overlay (once): `yarn task run ops:fixtures:wanix:linux:overlay:build`
2. `yarn task cafe dev` → `#wanix vm`
3. MOTD appears at boot; after export is ready: `zedcafe-stats`, `zedcafe-books`, `zedcafe-players`, `zedcafe-code`, `zedcafe-find`
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
