# zed-cafe drag-drop task read scenario

Prove a **dropped WASI task** can read the session book mirror at `./zed-cafe/stats.json` after Wanix export is warm.

## Fixture

| Artifact | Purpose |
|----------|---------|
| `zedcaferead.c` / `zedcaferead.wat` | Source — `path_open` + `fd_read` on `zed-cafe/stats.json`, prints `zed-cafe ok: …` |
| `zedcaferead.wasm` | Built locally (`yarn task run wanix:wasm:build`) — drag this onto the app |

## Build fixture wasm

```bash
yarn task run wanix:wasm:build
# → ops/fixtures/wanix/zedcaferead.wasm
```

Optional C rebuild when wasi-sdk is installed: `yarn task run wanix:wasm:build:c` (overwrites from `zedcaferead.c`).

## A — Headed Playwright gate

**Precondition:** dev server running (`yarn task app dev`).

```bash
yarn task run wanix:zed-cafe:task-read:validate
```

Drops `zedcaferead.wasm` in the full app and asserts tile apilog contains `zed-cafe ok:`.

## B — Full app drag-drop (manual)

**Precondition:** Wanix warm and zed-cafe export populated (import **wanixtour** book, or edit any book and wait ~2s for debounced export).

1. `yarn task app dev`
2. Confirm export exists (optional): `#wanix` menu scrollback should not show sustained export errors; or run `yarn task run wanix:zed-cafe:export:validate` with dev server up.
3. Drag `ops/fixtures/wanix/zedcaferead.wasm` onto the canvas (same as `termbridge.wasm`).
4. Tile opens when the task writes stdout; expect:

   ```text
   zed-cafe ok: {"exportedAt":...,"bookCount":...}
   ```

5. **Fail signals**
   - `zed-cafe missing` — `./zed-cafe/stats.json` not mounted (export not ready or wrong layout)
   - `zed-cafe empty` — path exists but read returned no bytes

## C — wanixtour in-app

1. Import `ops/fixtures/content/templates/wanixtour` (see tour README).
2. Walk to **STEP 4 — ZED-CAFE FS** (`wanixzedcafe` board).
3. Ensure session has at least one book (tour import counts).
4. Drop `zedcaferead.wasm` and confirm the same `zed-cafe ok:` line on the tile.

## Notes

- Task path is **`zed-cafe/stats.json`** (relative, no leading `/`) — matches WASI task namespace, not VM serial `/zed-cafe/…`.
- Do not patch WASI `fd_read(0)` stdin; stdout goes through the term bridge (`fd_write` → tile).
- Rebuild `zedcaferead.wasm` after editing `zedcaferead.c`.

## D — Duplex guest write (WASI → host import)

| Artifact | Purpose |
|----------|---------|
| `zedcafewrite.c` | Overwrites `./zed-cafe/stats.json` with `"guestTouch": true` |
| `zedcafewrite.wasm` | Built via `yarn task run wanix:wasm:build` (`zedcafewrite.wat`; optional C rebuild with wasi-sdk) |

**Headed Playwright gate** (dev server running):

```bash
yarn task run wanix:wasm:build
yarn task run wanix:zed-cafe:duplex:validate
```

**Manual** (drop `zedcafewrite.wasm`, then `#wanix pull` or wait for auto-poll): same steps as gate B for write fixture.

Steady-state host→guest updates use live `writeFile` into `#task/<rid>/export` (no gojs restart per edit). Guest→MEMORY uses fingerprint poll + `#wanix pull`.

## E — VM zed-cafe visibility (headed Playwright)

Primary acceptance gate: after `#wanix vm`, the Linux guest must show `/zed-cafe/` on the root filesystem.

**Automated** (dev server running):

```bash
yarn task run wanix:vm:zed-cafe:validate
```

**Milestones**

| Step | Check | Pass |
|------|-------|------|
| A (boot gate only) | iframe apilog after `#wanix vm` | `#ramfs/zed-cafe ready — remounting wanix-system with wanix-vm` |
| B | (wait for shell) | prompt `~ #` |
| C | `ls /` | listing contains `zed-cafe` |
| D | `ls /zed-cafe` | listing contains `stats.json` |
| E | `cat /zed-cafe/stats.json` | JSON with `"bookCount"` or `"exportedAt"` |

Book import seeds host memory only; iframe apilog appears after `#wanix vm` starts the iframe. Do not wait for export apilog before spawn in validators.

Related gates: `wanix:zed-cafe:export:validate` (milestones B–E), `wanix:vm:boot:validate` (book seed + Milestone A + B–E).
