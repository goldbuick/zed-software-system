# zed-cafe drag-drop task read scenario

Prove a **dropped WASI task** can read the session book mirror at `./zed-cafe/stats.json` after Wanix export is warm.

## Fixture

| Artifact | Purpose |
|----------|---------|
| `zedcaferead.c` / `zedcaferead.wat` | Source — `path_open` + `fd_read` on `zed-cafe/stats.json`, prints `zed-cafe ok: …` |
| `zedcaferead.wasm` | Built locally (`yarn task run wanix:wasm:build`) — drag this onto the app |
| `ops/fixtures/harness/wanix/zed-cafe-task-read.html` | Isolated harness (no React) — sets `window.zedcafeTaskReadResult` |

## Build fixture wasm

```bash
yarn task run wanix:wasm:build
# → ops/fixtures/wanix/zedcaferead.wasm
```

Optional C rebuild when wasi-sdk is installed: `yarn task run wanix:wasm:build:c` (overwrites from `zedcaferead.c`).

## A — Isolated harness (fast)

1. `yarn task app dev`
2. Open `https://localhost:7777/wanix/zed-cafe-task-read.html`
3. Pass when `window.zedcafeTaskReadResult.pass === true` (`stats_probe` shows bytes and task wrote `zed-cafe-read.ok`)

The harness polls for `zed-cafe-read.ok` in the task root listing (written by the wasm on success). In the full app, expect the same read on the **tile** via stdout (`zed-cafe ok: …`).

Automated gate (dev server must be running):

```bash
yarn task run wanix:zed-cafe:task-read:validate
```

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
