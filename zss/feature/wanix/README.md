# Wanix terminal integration

Runs [wanix](https://github.com/tractordev/wanix) (a browser OS with a Linux
v86 VM and WASI tasks) inside ZSS and renders its terminal sessions as colored
tiles in the ZSS terminal screen.

## Architecture

Two halves talk over `postMessage` RPC across an iframe boundary:

- **Child (iframe): [`cafe/wanix.ts`](../../../cafe/wanix.ts)** — loads
  `wanix.min.js`, owns the `<wanix-system>` element, allocates VMs/tasks, opens
  each term's `data` pipe, parses the byte stream into a cell grid, and posts
  grid snapshots to the parent. Zed-cafe export daemon boot/bind logic lives in
  [`wanixzedcafehost.ts`](wanixzedcafehost.ts) (imported by `cafe/wanix.ts`).
  Served at `/wanix.html` via a hidden ("ghost") iframe mounted by
  [`wanixhost.tsx`](wanixhost.tsx).
- **Parent (ZSS): [`wanixbridge.ts`](wanixbridge.ts)** — sends RPC calls
  (`applyroom`, `startvm`, `spawntask`, `termwrite`, `termfit`, …), receives
  `cells` snapshots into [`wanixtermbuffer.ts`](wanixtermbuffer.ts), and tracks
  which session is attached in [`wanixattachstate.ts`](wanixattachstate.ts).

The grid engine ([`wanixtermgridstate.ts`](wanixtermgridstate.ts)) is shared by
both sides: the child writes bytes into it (ANSI SGR color, scrollback,
alt-screen), the parent renders snapshots from it.

```
ZSS terminal screen ─┐                          ┌─ <wanix-system>
                     │  postMessage RPC + cells │    ├─ <wanix-vm> / <wanix-task>
                     │  + session lifecycle     │
  wanixbridge.ts ◄───┼──────────────────────────┼──► cafe/wanix.ts
  wanixtermbuffer ◄──┘                          └─   term data pipe → grid
```

## Key decisions & gotchas

### Full-Go wasm, not the published TinyGo build
The npm `wanix@0.4.0-alpha8` dist ships a **TinyGo**-compiled `wanix.wasm`
whose `syscall/js` runtime corrupts under heavy terminal I/O (upstream
[tractordev/wanix#171](https://github.com/tractordev/wanix/issues/171)) —
symptom was `RangeError: Offset is outside the bounds of the DataView` /
`Value.Set on undefined` panics after running e.g. `ls -la` a few times.

Fix: a **full-Go** build from the matching commit (`b21f64d4`, npm `gitHead`
for alpha8) is hosted at
[`cafe/public/wanix/wanix.wasm`](../../../cafe/public/wanix/wanix.wasm)
and selected via the `wasm` attribute on `<wanix-system>`. The wanix loader
sniffs the binary: no `asyncify_start_unwind` marker → it logs "Go WASM
detected" and uses the stable Go glue.

To rebuild (must match the `wanix.min.js` version's commit for ABI parity):

```sh
git clone https://github.com/tractordev/wanix && cd wanix
git checkout <gitHead of the wanix npm version in cafe/wanix.html>
GOOS=js GOARCH=wasm go build -o wanix.wasm ./wasm
# verify it is NOT tinygo: `rg -c asyncify_start_unwind wanix.wasm` → no match
```

### `<wanix-vm>` auto-allocates — do not call `allocate()`
The element's `_awake()` runs on the system `ready` event and calls
`allocate()` itself. Calling `vmel.allocate()` from `applyroom` a second time
throws `VM already allocated`. Only `connectvmtermsession()` (which waits on the
term `data` path) then `vmel.start()` are needed.

### Resize
`termfit` RPC forwards `{cols, rows}` to the child, which drives wanix's
terminal winsize and reflows the local grid. The primary buffer preserves and
rewraps scrollback on resize; the alternate buffer is cleared/resized and the
guest repaints. See resize handling in `wanixtermgridstate.ts`.

### Attach / detach
The worker ([`cafe/wanix.ts`](../../../cafe/wanix.ts)) owns which terminal is
**active** and posts `zss-wanix-session` messages (`open`, `active`, `close`) to
the parent. Auto-attach happens only when the worker sends `active` and nothing
is attached yet (and the user has not manually detached). The parent never
guesses a target from buffer order.

Manual attach/detach via `#wanix attach` / `#wanix detach` or the menu takes
precedence. A new `active` message does not steal focus from an already-attached
session. When a non-attached session ends, its buffer and task entry are pruned
from the menu; if the attached session ends, the parent does nothing until the
user acts via the menu.

### Keyboard shortcuts (attached terminal)

The bottom row of the terminal screen is a hint bar. `Ctrl+\` is a prefix key
(tmux-style); the next keystroke is a command:

| After `Ctrl+\` | Action |
|---|---|
| `n` or `Right` | next session |
| `p` or `Left` | previous session |
| `d` or `Ctrl+\` | detach |
| `Esc` | cancel prefix |
| other key | cancel prefix, forward key to guest |

While attached, the hint bar shows `Ctrl+\ : detach / switch`. After arming the
prefix it shows `Ctrl+\  n next  p prev  d detach  Esc cancel`.

Scrollback: `PageUp` / `PageDown` (hold `Ctrl` for 10 lines). All other typing
forwards to the guest when the viewport is at the live line.

## Files

| File | Role |
|---|---|
| `cafe/wanix.ts` | iframe orchestrator: system, VM/task lifecycle, term read loop, RPC handler |
| `wanixzedcafehost.ts` | iframe-side zed-cafe: `<wanix-bind>` setup, Go wasm boot, export tree I/O |
| `wanixzedcafe.ts` | parent-side zed-cafe: export/import, daemon lifecycle, device API |
| `wanixhost.tsx` | mounts the hidden `/wanix.html` iframe |
| `wanixbridge.ts` | parent RPC client + ready/cells message handling |
| `wanixtermgridstate.ts` | shared cell-grid engine (ANSI parse, scrollback, alt-screen, resize) |
| `wanixtermbuffer.ts` | parent-side snapshot store per session |
| `wanixattachstate.ts` | which session is attached; auto-attach |
| `wanixroom.ts` / `wanixroomtypes.ts` | room config (archives, remotes, tasks, vm) + VM start/stop |
| `wanixmenu.ts` | terminal menu tape (`#wanix`) |
| `wanixrpcmessages.ts` | shared `postMessage` type constants (parent + iframe) |
| `wanixcmd.ts` | `#wanix` CLI command wiring |
