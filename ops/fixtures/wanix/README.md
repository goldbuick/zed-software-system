# Wanix integration fixtures + scenario playbook

WASI/gojs drop binaries, peer sync roots, and headed Playwright validators for
wanix integration. Architecture: [`zss/feature/wanix/README.md`](../../../zss/feature/wanix/README.md).

Built artifacts live in **`ops/public/wanix/`** (dev URL `/fixtures/wanix/`).
Validators run only via existing `cafe:playwright:headed` — no new citty tasks.

---

## Scenario index

| # | Scenario | Automator | Deps |
|---|----------|-----------|------|
| 1 | Idle default after login | manual | `cafe:dev` |
| 2 | Soft idle then warm reuse on active room | [`validate-warm-reuse.ts`](../../../tasks/lib/wanix/validate-warm-reuse.ts) | `cafe:dev` |
| 3 | Hard remount bumps `mountkey` | same as #2 | `cafe:dev` |
| 4 | Idle drop → task room | [`validate-idle-drop.ts`](../../../tasks/lib/wanix/validate-idle-drop.ts) | `cafe:dev` |
| 5 | Idle VM boot | [`validate-idle-boot.ts`](../../../tasks/lib/wanix/validate-idle-boot.ts) | `cafe:dev` |
| 6 | Multi-task append (`greet`, `bundle-two`) | manual | `cafe:dev` + builds |
| 7 | Empty bundle warning | manual | `bundle-empty.tgz` |
| 7b | Fixture stdout (task + VM + start order) | [`validate-fixtures-stdout.ts`](../../../tasks/lib/wanix/validate-fixtures-stdout.ts) | `cafe:dev` + builds |
| 8 | VM + host export `bookCount >= 1` | [`validate-zedcafe-vm-export.ts`](../../../tasks/lib/wanix/validate-zedcafe-vm-export.ts) | `cafe:dev` |
| 9 | findplayers after content-ready | covered by #8 / manual | builds |
| 10 | greenring writeback import | [`validate-greenring-drop.ts`](../../../tasks/lib/wanix/validate-greenring-drop.ts) | `cafe:dev` |
| 11 | Linux overlay helpers | manual | overlay build + `#wanix vm` |
| 12 | Remote WSS mount | [`validate-wanix-remote-mount.ts`](../../../tasks/lib/wanix/validate-wanix-remote-mount.ts) | `cafe:dev` + `p9server:dev` |
| 13 | Remote zedsync seed + `.zedsync/ready` | [`validate-zedsync-remote.ts`](../../../tasks/lib/wanix/validate-zedsync-remote.ts) | #12 deps + empty peer |
| 14 | Zedsync peer delete restore | same as #13 | empty peer root |
| 15 | FSA folder drop + zedsync | **manual** (Chromium) | folder on disk |
| 16 | listinput stamp poll | [`validate-binddrop-listinput.ts`](../../../tasks/lib/wanix/validate-binddrop-listinput.ts) | `cafe:dev` |
| 17 | input2terrain → import synced | [`validate-binddrop-input2terrain.ts`](../../../tasks/lib/wanix/validate-binddrop-input2terrain.ts) | `cafe:dev` + book |
| 18 | VM `png2terrain.sh` | manual | `#wanix vm` |
| 19 | termbridge ping → pong | [`validate-termbridge.ts`](../../../tasks/lib/wanix/validate-termbridge.ts) | `cafe:dev` |
| 20 | Content-ready race | unit [`wanixzedcafe.contentready-race.test.ts`](../../tests/unit/device/wanixclient/wanixzedcafe.contentready-race.test.ts) | Jest |
| 21 | Soft idle ends zedsync; auto-halt exempt | #13 stop phase | zedsync running |
| 22 | Hard remount wipes FSA binds | manual (see #15) | FSA mount |
| 23 | Zedsync path with spaces rejected | unit + manual one-liner | — |
| 24 | Agent sync latency baseline (`singlefile`) | [`validate-zedcafe-agent-latency.ts`](../../../tasks/lib/wanix/validate-zedcafe-agent-latency.ts) | `cafe:dev` + book |

Each scenario below uses: **Setup / Fixture assets / Steps / Expected signals / Automator / Failure dump**.

---

## Drop staging + start order

All dropped / bundled `.wasm` files stage via a **task-child blob file-bind**
(`wanix-bind type=file` + blob URL on the `wanix-task` element). There is **no**
root `#ramfs` `writeFile` for wasm — that path fails under the VM's
`fskit.UnionFS` (`create … operation not supported`) and hangs on large gojs
binaries. Staging is mode-independent (task room and `#wanix vm`).

**Start order is free:**

| Order | Behavior |
|-------|----------|
| VM then tasks | `#wanix vm` first; drops spawn `wanix-task` children on the live VM room |
| Tasks then VM | Drop wasm first; `#wanix vm` **warm-adds** the VM (same `mountkey`, no hardreset) and **preserves** running tasks |

Automator: [`validate-fixtures-stdout.ts`](../../../tasks/lib/wanix/validate-fixtures-stdout.ts)
(`WANIX_VALIDATE_MODE=task|vm|both|order`).

---

## Tooling setup

```bash
yarn task run ops:fixtures:wanix:toolchains
yarn task run ops:fixtures:wanix:build
# optional guests:
yarn task run ops:fixtures:wanix:zedcafe:build
yarn task run ops:fixtures:wanix:findplayers:build   # findplayers, greenring, zedsync
yarn task run ops:fixtures:wanix:linux:overlay:build # needs Docker
```

| Toolchain | Required for | Install (macOS) |
|-----------|--------------|-----------------|
| wabt | WAT fixtures | `brew install wabt` |
| go + `submodules/wanix` | Go WASI/gojs, zedcafe, zedsync | `brew install go` |
| rust + `wasm32-wasip1` | `hello-rust.wasm` | `brew install rust` + target |
| zig | `hello-zig.wasm` | `brew install zig` |
| tinygo | `hello-tinygo.wasm` | tinygo tap |
| wasi-sdk | `hello-c.wasm` | `/opt/wasi-sdk` or `WASI_SDK_PATH` |
| docker | Linux VM overlay | Docker Desktop |

Sources: `hello/`, `src/*.wat`, `zedcafe/`, `findplayers/`, `greenring/`, `zedsync/`, `listinput/`, `input2terrain/`, `linux/`, `p9server/`.

### Quick drag-drop table

| File | Tests |
|------|--------|
| `hello-*.wasm` / `hello-all.tgz` | Per-lang hello |
| `greet.wasm` | Second wasm while room running |
| `bundle-one.tgz` / `bundle-two.tgz` / `bundle-empty.tgz` | Bundle spawn / empty warn |
| `termbridge.wasm` | Term ping → pong |
| `listinput.wasm` | Bind-on-drop poll |
| `input2terrain.wasm` / `png2terrain.sh` | Stamp → terrain |
| `stamp-{red,green,blue}.png` | Distinct byte lengths (95/96/98) |
| `findplayers.wasm` / `greenring.wasm` / `zedsync.wasm` / `zedcafe.wasm` | Export guests |
| `zedcafe-linux-overlay.tgz` | VM PATH helpers |

---

## Automators (copy-paste)

Prerequisite for all headed scripts: cafe listening (usually `yarn task cafe:dev` on `https://localhost:7777/`).

```bash
# Room / boot
yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-idle-drop.ts

yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-idle-boot.ts

# Fixture stdout (task + VM + order); books via fixture when needed
WANIX_VALIDATE_MODE=both ZEDCAFE_VALIDATE_FIXTURE=1 \
  yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-fixtures-stdout.ts

yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-warm-reuse.ts

# Zedcafe / guests
ZEDCAFE_VALIDATE_FIXTURE=1 yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-zedcafe-vm-export.ts

ZEDCAFE_VALIDATE_FIXTURE=1 yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-greenring-drop.ts

# Remote + zedsync (start p9 first — empty peer for seed/delete-restore)
yarn task run ops:fixtures:wanix:p9server:dev -- ops/fixtures/wanix/scenarios/zedsync-peer

yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-wanix-remote-mount.ts

ZEDCAFE_VALIDATE_FIXTURE=1 WANIX_P9_SERVE_ROOT=$PWD/ops/fixtures/wanix/scenarios/zedsync-peer \
  yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-zedsync-remote.ts

# Bind-on-drop / term
yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-binddrop-listinput.ts

ZEDCAFE_VALIDATE_FIXTURE=1 yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-binddrop-input2terrain.ts

yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-termbridge.ts
```

| Env | Default | Meaning |
|-----|---------|---------|
| `ZEDCAFE_VALIDATE_FIXTURE` | unset | `1` injects `ops/fixtures/books/example-coolregionsbow.book.json` |
| `WANIX_P9_WSS_URL` | `wss://localhost:8765/` | Remote connect URL |
| `WANIX_P9_SERVE_ROOT` | `ops/fixtures/wanix/scenarios/zedsync-peer` | Host path zedsync validator deletes/restores |

| Report | Path |
|--------|------|
| idle/export/greenring | `/tmp/wanix-*-report.json` + copies under `ops/fixtures/wanix/reports/` |
| remote mount | `/tmp/wanix-remote-mount-report.json` |
| zedsync | `/tmp/wanix-zedsync-remote-report.json` |
| listinput | `/tmp/wanix-binddrop-listinput-report.json` |
| input2terrain | `/tmp/wanix-binddrop-input2terrain-report.json` |
| termbridge | `/tmp/wanix-termbridge-report.json` |
| warm reuse | `/tmp/wanix-warm-reuse-report.json` |

Script budget: `PLAYWRIGHT_SCENARIO_TIMEOUT_MS` (180s) via `withscripttimeout`.

---

## Scenarios

### 1. Idle default after login

| | |
|--|--|
| **Setup** | `yarn task cafe:dev` |
| **Fixture assets** | — |
| **Steps** | 1. Open cafe and complete register/login. 2. Do **not** run `#wanix vm` or drop wasm. |
| **Expected signals** | Console may show `[wanix] idle` / ready flag; **no** automatic task/VM `applyroom` for workloads. `#wanix` menu shows idle mode. |
| **Automator** | manual |
| **Failure dump** | — |

### 2–3. Soft idle, warm reuse, hard remount

| | |
|--|--|
| **Setup** | `cafe:dev`; fixtures built (`bundle-one.tgz`) |
| **Fixture assets** | `ops/public/wanix/bundle-one.tgz` |
| **Steps** | 1. Drop `bundle-one.tgz` (task room). 2. Warm path: `ensurewanixtaskroom` while still task (validator). 3. `#wanix stop` → soft idle (same `mountkey`, warm `<wanix-namespace>`). 4. Hard stop (`stopwanixroom(true)`) bumps `mountkey` and remounts. |
| **Expected signals** | `[wanix-perf] applyroom-warm-reuse`; soft: `applyroom-soft-idle`; hard: `applyroom-remount` / higher `mountkey`. Tape: `wanix stop room`. |
| **Automator** | `tasks/lib/wanix/validate-warm-reuse.ts` |
| **Failure dump** | `/tmp/wanix-warm-reuse-report.json` |

Note: dropping wasm **from idle** remounts the task room (`hardreset`); warm reuse applies to re-activate on an **already active** room.

### 4. Idle drop → task room

| | |
|--|--|
| **Setup** | `cafe:dev` |
| **Fixture assets** | `bundle-one.tgz` |
| **Steps** | Drop bundle onto cafe (or run validator). |
| **Expected signals** | `wanix task room starting` → `wanix run` → ready; iframe `wanix-task[id]` count >= 1 |
| **Automator** | `validate-idle-drop.ts` |
| **Failure dump** | script throw / console |

### 5. Idle VM boot

| | |
|--|--|
| **Setup** | `cafe:dev` |
| **Fixture assets** | stock linux + overlay URLs |
| **Steps** | `#wanix vm` |
| **Expected signals** | `wanix vm starting` / `started` |
| **Automator** | `validate-idle-boot.ts` |
| **Failure dump** | console |

### 6. Multi-task append

| | |
|--|--|
| **Setup** | `cafe:dev` |
| **Fixture assets** | `hello-wat.wasm`, `greet.wasm`, `bundle-two.tgz` |
| **Steps** | 1. Drop `hello-wat.wasm`. 2. Drop `greet.wasm` (second task, no iframe flash). 3. Drop `bundle-two.tgz` (alpha + beta). |
| **Expected signals** | Multiple `wanix-task` elements; greet/alpha/beta stdout |
| **Automator** | manual |
| **Failure dump** | — |

### 7. Empty bundle

| | |
|--|--|
| **Setup** | `cafe:dev` |
| **Fixture assets** | `bundle-empty.tgz` |
| **Steps** | Drop empty bundle. |
| **Expected signals** | Warning `wanix bundle … has no .wasm entries`; no crash |
| **Automator** | manual |
| **Failure dump** | — |

### 8–9. VM export + findplayers

| | |
|--|--|
| **Setup** | `cafe:dev`; books in storage **or** `ZEDCAFE_VALIDATE_FIXTURE=1` |
| **Fixture assets** | `example-coolregionsbow.book.json`; optional `findplayers.wasm` |
| **Steps** | 1. `#wanix vm` (validator). 2. Wait host export `bookCount >= 1`. 3. Optional: drop `findplayers.wasm` after content-ready. |
| **Expected signals** | `[zedcafe-export]` / `[wanix-perf]` push marks; findplayers JSON path array on stdout |
| **Automator** | `validate-zedcafe-vm-export.ts` |
| **Failure dump** | `/tmp/wanix-zedcafe-export-report.json`, `ops/fixtures/wanix/reports/` |

### 10. greenring writeback

| | |
|--|--|
| **Setup** | `cafe:dev` + book (`ZEDCAFE_VALIDATE_FIXTURE=1` recommended) |
| **Fixture assets** | `greenring.wasm` |
| **Steps** | Drop `greenring.wasm` with onboard players. |
| **Expected signals** | `{"painted":N}`; `poll-guest-diff=true`; `zedcafe import: synced` |
| **Automator** | `validate-greenring-drop.ts` |
| **Failure dump** | zedcafe report helpers |

### 11. Linux overlay helpers

| | |
|--|--|
| **Setup** | `ops:fixtures:wanix:linux:overlay:build` then `cafe:dev` |
| **Fixture assets** | `zedcafe-linux-overlay.tgz` |
| **Steps** | 1. `#wanix vm`. 2. After export ready: `zedcafe-stats`, `zedcafe-books`, `zedcafe-players`. 3. Optional `curl -I https://example.com`. |
| **Expected signals** | MOTD at boot; helper stdout; live data under `/zedcafe/` |
| **Automator** | manual (overlay contents gated by unit `wanixlinuxoverlay.test.ts`) |
| **Failure dump** | — |

### 12. Remote WSS mount

| | |
|--|--|
| **Setup** | `cafe:dev` + `ops:fixtures:wanix:p9server:dev` (any root) |
| **Fixture assets** | p9 TLS on `wss://localhost:8765/` |
| **Steps** | `#wanix remote connect wss://localhost:8765/ remote` |
| **Expected signals** | `[wanix-perf]` `remote-wss-then` → `remote-wss-fulfill-allowed` → `remote-wss-open`; iframe `readDir('remote')` |
| **Automator** | `validate-wanix-remote-mount.ts` |
| **Failure dump** | `/tmp/wanix-remote-mount-report.json` |

### 13–14. Remote zedsync seed + delete restore

| | |
|--|--|
| **Setup** | `cafe:dev`; **empty** peer: `p9server:dev -- ops/fixtures/wanix/scenarios/zedsync-peer`; book via fixture env |
| **Fixture assets** | `zedsync.wasm` (findplayers build); empty peer README under `scenarios/zedsync-peer/` |
| **Steps** | 1. `#wanix remote connect … remote`. 2. `#wanix zedsync remote`. 3. Wait seed/ready. 4. Delete a peer JSON on disk; wait restore. 5. `#wanix stop` → `zedsync: stopped`. |
| **Expected signals** | Host: `zedsync: seed ready` / `watching`; peer files appear under serve root; deleted file returns; soft stop ends task |
| **Automator** | `validate-zedsync-remote.ts` |
| **Failure dump** | `/tmp/wanix-zedsync-remote-report.json` |

Rules: target path **no spaces**; empty peer seeds from `zedcafe/` (never wipe); skips `.`-prefixed segments; import poll pauses until `<target>/.zedsync/ready`; zedsync exempt from 5‑min task auto-halt.

### 15. FSA folder drop + zedsync (manual)

| | |
|--|--|
| **Setup** | Chromium; `cafe:dev`; folder **without spaces** in the name |
| **Fixture assets** | empty or existing project folder on disk |
| **Steps** | 1. Drop folder onto cafe → mount `/<name>`, menu “externals”. 2. Wait folder mount OK. 3. `#wanix zedsync <foldername>`. |
| **Expected signals** | `wanix folder mount ok $26 /…`; same zedsync seed/ready lines as #13 |
| **Automator** | **manual** (Playwright cannot drive `showDirectoryPicker`; automated peer proof is #13) |
| **Failure dump** | — |

**Hard remount (#22):** `stopwanixroom(true)` clears ephemeral FSA binds — re-drop the folder after hard remount. Prefer soft `#wanix stop` only when you do not need the mount.

### 16. listinput stamp poll

| | |
|--|--|
| **Setup** | `cafe:dev` |
| **Fixture assets** | `listinput.wasm`, `stamp-red.png` |
| **Steps** | 1. Drop `listinput.wasm`. 2. Stay attached. 3. Drop/bind `stamp-red.png` under `input/`. |
| **Expected signals** | `listinput: initial` / `empty`; then `listinput: ok stamp-red.png (95 bytes)` |
| **Automator** | `validate-binddrop-listinput.ts` |
| **Failure dump** | `/tmp/wanix-binddrop-listinput-report.json` |

### 17. input2terrain → import

| | |
|--|--|
| **Setup** | `cafe:dev` + book (`ZEDCAFE_VALIDATE_FIXTURE=1`) |
| **Fixture assets** | `input2terrain.wasm`, `stamp-red.png` |
| **Steps** | Drop `input2terrain.wasm`; validator binddrops stamp as soon as the task element appears so `input/` exists before the guest reads. Manual UX: attach, drop stamp, re-run from term if needed. |
| **Expected signals** | `input2terrain: wrote … (16 cells … 95 bytes)`; `zedcafe import: synced` |
| **Automator** | `validate-binddrop-input2terrain.ts` |
| **Failure dump** | `/tmp/wanix-binddrop-input2terrain-report.json` |

### 18. VM png2terrain

| | |
|--|--|
| **Setup** | `cafe:dev`; `#wanix vm`; attach `linux-vm` |
| **Fixture assets** | `png2terrain.sh`, stamps |
| **Steps** | Drop script + stamp while attached; `sh input/png2terrain.sh`. |
| **Expected signals** | cell count stdout; `zedcafe import: synced` |
| **Automator** | manual |
| **Failure dump** | — |

### 19. termbridge

| | |
|--|--|
| **Setup** | `cafe:dev` |
| **Fixture assets** | `termbridge.wasm` |
| **Steps** | Drop; wait banner; type `ping` + Enter (validator uses `termwrite`). |
| **Expected signals** | `wanix term bridge ready`; `-> pong` (tile bridge, not WASI stdin) |
| **Automator** | `validate-termbridge.ts` |
| **Failure dump** | `/tmp/wanix-termbridge-report.json` |

### 20. Content-ready race

Mount ready (`readDir` export) then content ready (`stats.json` / `exportready`). Spawn of findplayers blocks until content ready. Covered by unit test; headed coverage via #8/#9.

### 21. Soft idle ends zedsync

After #13 steady state, `#wanix stop` → guest/`zedsync: stopped`. Quiet watch loop is **not** killed by 5‑min term idle auto-halt (exempt like zedcafe).

### 22. Hard remount wipes FSA

See #15. Soft idle keeps warm system + remotes; hard reset clears FSA binds.

### 23. Path with spaces

`#wanix zedsync My Folder` fails (Wanix splits `cmd` on spaces). Use a path without spaces. Unit coverage in client/guest tests.

---

## Agent sync latency baseline

SLO budgets and workload profiles live in
[`WANIX_AGENT_LATENCY_SLOS`](../../../zss/feature/wanix/wanixbootregression.ts)
(sim<->guest legs sub-200ms; `peer-to-sim` end-to-end sub-400ms) alongside the
existing boot regression gates. `assessagentlatencyslos(samples)` and
`percentilems(samples, p)` in the same module compute p50/p95 per path and
flag any path with zero samples as missing.

| Workload profile | Meaning |
|---|---|
| `singlefile` | One object write/read round trip |
| `batchobjects` | Many objects touched in one sync tick |
| `structuraldelete` | Board/layer structural removal (not a plain object write) |

Baseline collector (drives the greenring `singlefile` workload; derives
`sim-to-guest` / `guest-to-sim` samples from console-arrival timestamps of
existing `[wanix-perf] drop-export-pull-*` and greenring paint/import marks):

```bash
ZEDCAFE_VALIDATE_FIXTURE=1 yarn task run cafe:playwright:headed --url https://localhost:7777/ \
  tasks/lib/wanix/validate-zedcafe-agent-latency.ts
```

`sim-to-peer` / `peer-to-sim` require a running zedsync peer and are not
driven by this script — run `validate-zedsync-remote.ts` (see #13-14 above)
against a live `p9server:dev` peer to collect those legs; the report marks
them `measured: false` until then.

| Report | Path |
|--------|------|
| agent latency (tmp) | `/tmp/wanix-zedcafe-agent-latency-report.json` |
| agent latency (baseline copy) | `ops/fixtures/wanix/reports/agent-latency-baseline.json` |

---

## Peer sync notes (remote / FSA)

Browser Wanix cannot export its namespace to an arbitrary host folder. Options:

1. **WSS 9P** — `p9server:dev` + `#wanix remote connect` + `#wanix zedsync remote`
2. **FSA** — drop folder + `#wanix zedsync <name>` (Chromium)

Empty peer seed root for automators: [`scenarios/zedsync-peer/`](scenarios/zedsync-peer/). Pre-populated sample (gitignored local default for `p9server:dev`): `p9server/serve-root/`.

```bash
yarn task run ops:fixtures:wanix:p9server:dev -- ops/fixtures/wanix/scenarios/zedsync-peer
#wanix remote connect wss://localhost:8765/ remote
#wanix zedsync remote
```

Confirm WSS: p9server logs connections; DevTools Network on **wanix iframe** (not parent Vite HMR). Perf order must not await WSS before append (ready timeout).

---

## Bind-on-drop (`input/`)

While **attached**, non-task file drops (stamps, scripts, etc.) bind under
`input/<name>`. **`.wasm` / `.tgz` always spawn tasks** even when attached
(they never go through bind-on-drop).

| Stamp | Bytes | Cells (`% 40 + 1`) |
|-------|------:|-------------------:|
| `stamp-red.png` | 95 | 16 |
| `stamp-green.png` | 96 | 17 |
| `stamp-blue.png` | 98 | 19 |

---

## GoJS zedcafe tools

| File | Role |
|------|------|
| `zedcafe.wasm` | Export daemon at guest `zedcafe/` |
| `findplayers.wasm` | Scan export for player paths |
| `greenring.wasm` | Paint green terrain ring → import |

Zedcafe stands up **lazily** on first VM or wasm/tgz drop. Soft idle clears export session; next boot rebuilds from sim.

---

## Regenerate

```bash
yarn task run ops:fixtures:wanix:toolchains
yarn task run ops:fixtures:wanix:build
yarn task run ops:fixtures:wanix:findplayers:build
```

Artifacts: `ops/public/wanix/` (and staged under `cafe/public/wanix/` where builds copy).
