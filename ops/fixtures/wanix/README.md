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
| `#wanix vm` prep | [`examples/basic-vm.html`](https://github.com/tractordev/wanix/blob/main/examples/basic-vm.html) — linux + `#vm` ns + v86 binds **before** first `ready` | `spawnwanixvmspace` → two-phase `vm-active` (`bootstage: export` then `boot`) in iframe child |
| VM serial console | `<wanix-vm export="ttyS0" term>` + `#vm/<rid>/term/data` | `<wanix-vm>` must be **initial child** on boot remount — not appended after `ready` |
| Term I/O | `<wanix-term path="…" raw>` (we use tile bridge instead of xterm) | `wanixhost.ts` + `WanixTermInput` |
| `./zed-cafe/` / `/zed-cafe/` export | gojs export → live ns bind (task) or capture + VM remount (VM) | `wanixstateexport.ts` + `wanixzedcafe.ts` + `wanixiframechildmount.ts` |
| **Namespace export (LAN)** | Upstream **Wanix CLI console protocol** (browser dials out) | `wanixbridgehost.ts` + `#wanix bridge <wss-url>` |

Session books mirror to **`./zed-cafe/`** (WASI tasks) or **`/zed-cafe/`** (Linux VM) when Wanix is warm. Host pushes edits via live `writeFile` into `#task/<rid>/export` (no gojs restart per edit). Guest edits import via auto-poll (~3s) or **`#wanix pull`**.

Build the gojs export guest (runs automatically before `app:build`):

```bash
yarn task run wanix:zed-cafe:build
```

Shipped at `/wanix/zed-cafe.wasm` (`cafe/public/wanix/`). Staging: wasm file bind `{ dst: #ramfs/zed-cafe.wasm, src: /wanix/zed-cafe.wasm }`; gojs cmd is `#ramfs/zed-cafe.wasm`.

**Inbox** (`#ramfs/zed-cafe-inbox.json`):

| Layout | Staging |
|--------|---------|
| Task | `putwanixfile` when wanix root exists; iframe verifies before gojs `start` |
| VM | **File bind at mount** — host passes `inboxbytes` into `spawnvm` (no `putwanixfile` while `vm-prepared`) |

**Export → guest:**

| Layout | Mount |
|--------|-------|
| Task | ns bind `{ dst: zed-cafe, src: #task/<rid>/export }` after `waitzedcafeexportready` → `./zed-cafe/` |
| VM | **Two-phase boot** — export phase: gojs only; boot phase: capture files from `#task/<rid>/export`, file binds on `#ramfs/zed-cafe/*`, `<wanix-vm>` child bind `zed-cafe` ← `#ramfs/zed-cafe` → `/zed-cafe/` |

On task export bind failure, fallback: `#ramfs/zed-cafe` ← export, then `zed-cafe` ← `#ramfs/zed-cafe`. Guest `ls /` (VM) should show normal Linux dirs plus **`zed-cafe/`** only — no `_wanix`, `zed-cafe.wasm`, or inbox on `/`.

Agent docs: `.cursor/skills/wanix-zed-cafe-export/SKILL.md`, `.cursor/rules/wanix-zed-cafe-export.mdc`, `.cursor/rules/wanix-vm-lifecycle.mdc`.

**Local gates** (dev server must be running: `yarn task app dev`):

```bash
yarn task run wanix:zed-cafe:export:validate   # headed full app #wanix vm → cat /zed-cafe/stats.json
yarn task run wanix:vm:zed-cafe:validate       # primary: #wanix vm → ls / shows zed-cafe (6m script cap)
yarn task run wanix:zed-cafe:duplex:validate   # headed: drop zedcafewrite.wasm + #wanix pull
yarn task run wanix:zed-cafe:task-read:validate # headed: drop zedcaferead.wasm → zed-cafe ok:
yarn task run wanix:vm:boot:validate           # seeded book + #wanix vm boot gate
```

| Layout | Read books |
|--------|------------|
| Task | `cat zed-cafe/stats.json` |
| VM | `cat /zed-cafe/stats.json` |

Layout:

```text
zed-cafe/
  stats.json
  books/<kebab-case-name>-<book-id>/
    stats.json
    pages/<kebab-case-name>-<page-id>/
      stats.json
      board/
        terrain.json
        stats.json
        objects/<object-id>.json
      object/element.json
      terrain/element.json
      charset/bitmap.json
      palette/bitmap.json
```

Folder segments are `{kebab-case-name}-{id}` for human browsing; canonical ids remain in `stats.json` bodies. Export/push validates this layout; import does not accept legacy `books/<id>/` paths.

**Schema owner:** `zss/feature/wanix/zedcafetreeschema.ts` (host export/push). Guest FS create guard: `ops/fixtures/wanix/zed-cafe/schemaguardfs.go` with allowlist in `allowed-path-patterns.json` (Jest parity with TS regexes). VM `#ramfs/zed-cafe` ns-binds from guarded `#task/<rid>/export`.

Verify: warm Wanix → `ls zed-cafe/books/` shows `demo-book1`-style dirs → `yarn task run wanix:zed-cafe:export:validate`.

Playwright gates use bounded waits ([`tasks/groups/wanix.ts`](../../../tasks/groups/wanix.ts)):

- `SCRIPT_TOTAL_MS` default **420000** (7m hard cap per script)
- `VM_SHELL_MS` default **360000**
- Override: `ZSS_WANIX_VM_SCRIPT_TIMEOUT_MS`, `ZSS_WANIX_VM_SHELL_TIMEOUT_MS`

Validators capture **iframe** apilog (`zss-wanix-term-apilog` postMessage), not host tape scrollback.

VM prep must **not** call `_setupNamespace` a second time after `#ramfs` (that caused the Go `writeFile` panic). `#wanix vm` uses `spawnwanixvmspace` then two-phase iframe remount (`bootstage: export` → `boot`).

Import **`wanixtour`** book for a playable demo of `./zed-cafe/` on the `wanixzedcafe` board.

### VM baseline (headed Playwright)

Use upstream-faithful validation via the full app — not standalone HTML:

```bash
yarn task run wanix:vm:zed-cafe:validate   # #wanix vm → shell + /zed-cafe/stats.json
yarn task run wanix:vm:boot:validate       # book seed + remount milestones
```

If these gates pass headed but a manual `#wanix vm` path fails, the defect is in ZSS spawn/mount code, not the environment.

### Namespace export — browser bridge + upstream console protocol

Browsers cannot accept inbound WebSocket connections. The zed.cafe Wanix iframe dials **out** as the 9P server via [`zss/feature/wanix/wanixbridgehost.ts`](../../../zss/feature/wanix/wanixbridgehost.ts); external clients connect as 9P clients.

External access uses the **upstream Wanix CLI console protocol** (not yet on main in the pinned submodule). Paste the CLI-printed tape line:

```text
#wanix bridge wss://localhost:7777/wanix-bridge-host?token=…
```

Stop: `#wanix bridge stop`.

HTTPS dev (`yarn task app dev`) cannot use bare `ws://` URLs (mixed content). Vite proxies WSS → local WS:

| Path | Role |
|------|------|
| `/wanix-bridge-host` | Browser host session (iframe dials out) |
| `/wanix-remote-9p` | Remote 9P import (`wanix serve` or console protocol listener) |

Remote import in the full app: `#wanix remote connect wss://…` (see **WSS remote import** below). Harness: [/wanix/wss-import.html](http://localhost:7777/wanix/wss-import.html).

## Quick build (Go WASI)

Requires **Go** only (`brew install go`):

```bash
yarn task run wanix:wasm:build
```

Compiles [`wasi/`](wasi/) packages to `.wasm` in this directory via [`build-wasm-go.sh`](build-wasm-go.sh) (`GOOS=wasip1 GOARCH=wasm`).

| Source | Output | Role |
|--------|--------|------|
| `wasi/hello` | `hello.wasm` | one-shot hello (batch stdout) |
| `wasi/hold` | `hold.wasm` | infinite loop (e2e term-write while running) |
| `wasi/termbridge` | `termbridge.wasm` | **ZSS tile term bridge demo** — banner on stdout, then hold |
| `wasi/zedcaferead` | `zedcaferead.wasm` | read `zed-cafe/stats.json`, print `zed-cafe ok: …` |
| `wasi/zedcafewrite` | `zedcafewrite.wasm` | overwrite `zed-cafe/stats.json` with `guestTouch` |
| `wasi/zedcafewritebad` | `zedcafewritebad.wasm` | schema guard negative — create `zed-cafe/evil.json` must fail |
| `wasi/zedcafelist` | `zedcafelist.wasm` | walk `./zed-cafe/` tree |

Drag the `.wasm` onto a running app (`yarn task app dev`). Multiple drops run in parallel; use `#wanix` to attach, stop, or unmount.

Build WASI fixtures + zed-cafe export daemon:

```bash
yarn task run wanix:wasm:build:all
```

Agent docs: rule `wanix-wasi-sdk.mdc` (Go WASI fixtures).

### zed-cafe task read (`zedcaferead.wasm`)

After Wanix is warm and session books have exported to `./zed-cafe/`, drop `zedcaferead.wasm` to prove a WASI task can read `zed-cafe/stats.json`.

Full scenario: [`zed-cafe-task-read-scenario.md`](zed-cafe-task-read-scenario.md)

```bash
yarn task run wanix:wasm:build
yarn task app dev
# drag ops/fixtures/wanix/zedcaferead.wasm — expect: zed-cafe ok: {"bookCount":...
# gate: yarn task run wanix:zed-cafe:task-read:validate
```

### zed-cafe task list (`zedcafelist.wasm`)

Lists `./zed-cafe/` after export warm. Dropping `zedcafelist.wasm` (or other zed-cafe fixtures) **boots the gojs export daemon** if it is not already running; wait for apilog **`guest zed-cafe ready`** before expecting output. Console `#task/N/export … does not exist` lines during export boot are gojs polling noise — the headed gate `wanix:zed-cafe:list:validate` fails if they persist after warm.

```bash
yarn task run wanix:wasm:build
yarn task app dev
# optional: #wanix pull — warms export before drop
# drag ops/fixtures/wanix/zedcafelist.wasm — expect: zed-cafe list + stats.json
# gate: yarn task run wanix:zed-cafe:list:validate
```

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

## WSS remote import (`wanix serve`)

Mount a directory served by upstream **`wanix serve`** into the local iframe namespace via WebSocket 9P (`type="import"`). The dev server proxies **`/wanix-remote-9p`** → `ws://127.0.0.1:7654` so the https app can connect without mixed-content errors.

**Terminal A** — serve a scratch directory (default listen `:7654`):

```bash
mkdir -p /tmp/wanix-remote-test
echo 'hello from serve' > /tmp/wanix-remote-test/hello.txt
wanix serve /tmp/wanix-remote-test
```

**Terminal B** — full app:

```bash
yarn task app dev
```

- `#wanix remote` menu → `#wanix remote connect wss://localhost:7777/wanix-remote-9p` → `#wanix vm` → `ls /remote` and `cat /remote/hello.txt`

Disconnect via the **Disconnect** hyperlink in the `#wanix remote` menu.

## Manual verification

1. `yarn task app dev`
2. Drop `hello.wasm` or use `#wanix` commands
3. For VM term bridge: `#wanix vm` — prep in apilog; tile opens on first cell snapshot
4. For VM baseline: `yarn task run wanix:vm:zed-cafe:validate` (headed Playwright)

## VM keystroke repro (debug)

1. `yarn task app dev`
2. `ZSS_WANIX_SHOW=true` in `cafe/.env.local` (or `window.ZSS_WANIX_SHOW = true`) — restart dev server if using env
3. `#wanix vm` — prep in apilog; tile opens on first cell snapshot; wait for `~ #`
4. Type a command and Enter — check console for `[wanix] iframe-term-size` / `iframe-pixel-size` if sizing looks wrong (set `ZSS_WANIX_SHOW=true` in `cafe/.env.local`)
5. Second command — if input stops, check worker panic in console

After code changes, repeat steps 1–5 manually or run `yarn task run wanix:vm:zed-cafe:validate` to bisect VM term issues.
