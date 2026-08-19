# UI performance tooling

## Optimization pass (Aug 2026)

Trace-driven render/gadget fixes (control cache, layer flag cache, tile subimage wiring, reader fast paths) are documented in **[`docs/render-gadget-optimizations.md`](docs/render-gadget-optimizations.md)** — intent, architecture, trace before/after, failure modes, and verification commands. Read that doc before changing [`gadgetclient.ts`](../device/gadgetclient.ts), [`types.ts`](../gadget/data/types.ts) `readgadgetcontrol`, [`gadgetlayersflags.ts`](../memory/gadgetlayersflags.ts), or draw-dirty / tile upload paths.

## Perf monitor overlay

Toggle the in-game perf panel with **`Ctrl+I`** or the CLI command **`#perf`**.

When the panel is on:

- **[`PerfMonitorTiles`](perfmonitortiles.tsx)** shows tick timing, render stats, peer wire volume, and related HUD tiles.
- **`fps`** — smoothed display frame rate from R3F `useFrame` delta.
- **`draws` / `tris` / `pts`** — per-frame WebGL totals from `renderer.info.render` (all nested EffectComposers). `gl.info.autoReset` is disabled while the overlay is mounted so counts accumulate across board FBO passes + the main CRT composer; reset runs at `useFrame` priority 3 (after main composer priority 2). **The overlay panel itself contributes draw calls** — record GPU baselines both with and without Ctrl+I visible.
- **`gpu geos` / `tex` / `prog`** — renderer resource footprint (`info.memory` + compiled programs). **`tex`** is a lifetime allocation counter: it increases when new GPU textures are created and decreases when they are `dispose()`d (tile/dither layers dispose on unmount). Cycling among the same boards should plateau rather than stair-step on every revisit.
- **`tile up` / `tile r` / `spr`** — tile texture upload rate/bytes, tile render commits, sprite attribute update runs ([`renderupdatestats.ts`](renderupdatestats.ts)).
- **`gapply copy` / `apply` / `ops`** — main-thread gadgetclient deepcopy ms/s, applyPatch/fullsync ms/s, and patch op rate ([`gadgetclient.ts`](../device/gadgetclient.ts)).
- **`uni scan` / `gly`** — UnicodeOverlay full-layer scans/s and glyphs found/s.
- **`filt iso` / `fpv` / `m7`** — tile filter-rebuild runs/s by graphics mode.
- **[`PerfHud`](hud.tsx)** logs renderer.info to the console once per second.
- In **development** builds, React **`Profiler`** wraps [`TapeComponent`](../screens/tape/component.tsx) and logs commit times as `[zss perf] TapeComponent …`.

## Dev instrumentation

In Vite **development** builds (`import.meta.env.DEV`):

- **`perfmeasure` calls** ([`ui.ts`](ui.ts)) record [User Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing) measures prefixed with `zss:`. Inspect them in Chrome DevTools **Performance** → load profile → **Timings** / User Timing track.
- **`measurestage`** ([`ticktimingstats.ts`](ticktimingstats.ts)) accumulates tick-stage timings for the overlay.

Production builds skip User Timing / tick-stage overhead. Render counters (`recordtiletextureupload`, `recordgadgetapply`, unicode/filter counters) stay active in all builds so overlay rates remain useful under `cafe:preview`.

## Perf flags (`ZSS_PERF_*`)

Browser builds expose these via `vite.config.ts` `zssprocessenvkeys` (set in the shell before `yarn task run cafe:dev` / `cafe:build`):

| Env | Default | Effect |
|-----|---------|--------|
| `ZSS_PERF_SPATIAL_INDEX` | `true` | Spatial-index path in draw-dirty allowids |
| `ZSS_PERF_INCREMENTAL_LAYERS` | `false` | Skip full layer rebuild when drawallowids is empty. Off by default; set `true` to A/B the cache on. |
| `ZSS_PERF_TILE_SUBIMAGE` | `false` | Partial tile DataTexture uploads when `dirtycells` is passed |

When `PERF_TILE_SUBIMAGE` is enabled, [`Tiles`](../gadget/graphics/tiles.tsx) passes sim `drawdirtycells` through to [`updateTilemapDataTexture`](../gadget/display/tiles.ts) for partial GPU uploads.

## Bundle size

`yarn task run cafe:analyze` runs a production build with `ZSS_ANALYZER=1` and opens the bundle analyzer (see [ops/docs/tasks.md](../../ops/docs/tasks.md)).

## Browser tools

- **Performance** tab: main-thread and GPU work; complements User Timing entries from `perfmeasure`.
- **React DevTools → Profiler**: component-level commits without app changes.
- **Chrome traces**: for numbers closer to production, record a Performance profile **without** starting **CPU sampling** (avoids `CpuProfiler::StartProfiling` / large `v8::Debugger::AsyncTaskRun` slices in the trace).

## Baseline capture checklist (before/after comparisons)

1. Open cafe in dev, press **`Ctrl+I`** (or run `#perf`) to show the overlay, then reproduce the scenario you care about.
2. Open Chrome **Performance**, start recording **without** enabling **CPU sampling** / JS profiler if you want traces comparable to production-style overhead.
3. Use a **clean profile or incognito** so extensions do not add `FunctionCall` noise.
4. Optional: run a **production** build (`yarn task run cafe:build` + `yarn task run cafe:preview`) for a second baseline.
5. After changes, repeat the same steps and compare the **User Timing** `zss:*` rows and frame slices.

### Graphics mode matrix

For each mode (`flat`, `iso`, `mode7`, `fpv`), capture steady play and mid-pan (edge exit while departure 3x3 + live 3x3 + depth-2 are mounted). Repeat CRT on vs off when comparing post cost.

Record from the overlay (wait ~2s for rates to settle):

| Metric | Overlay label |
|--------|---------------|
| Display FPS | `fps` |
| Draw calls / triangles | `draws` / `tris` |
| Tile uploads | `tile up` (calls/s + bytes/s) |
| Unicode scans | `uni scan` / `gly` |
| Filter rebuilds | `filt iso` / `fpv` / `m7` |
| Gadget apply | `gapply copy` / `apply` / `ops` |
| Layer build (sim) | `tick … lyr` (`tick:readgadgetlayers`) |

Also capture one pass **with overlay closed** (console `PerfHud` or Chrome Performance) when draw-call absolute numbers matter — the panel adds meshes.

### Baseline table (fill from Ctrl+I)

Populate after a clean session on a populated board. Leave cells blank until measured; do not invent numbers.

| Mode | Scenario | CRT | fps | draws | tris | tile up/s | uni scan/s | filt/s | gapply copy ms/s | lyr ms/s |
|------|----------|-----|-----|-------|------|-----------|------------|--------|------------------|----------|
| flat | steady | on | | | | | | — | | |
| flat | steady | off | | | | | | — | | |
| flat | mid-pan | on | | | | | | — | | |
| iso | steady | on | | | | | | iso | | |
| iso | mid-pan | on | | | | | | iso | | |
| mode7 | steady | on | | | | | | m7 | | |
| mode7 | mid-pan | on | | | | | | m7 | | |
| fpv | steady | on | | | | | | fpv | | |
| fpv | mid-pan | on | | | | | | fpv | | |

**How to fill:** start `yarn task run cafe:dev`, load a book with exits in all four directions, set `#graphics flat|iso|mode7|fpv`, toggle CRT via device/mood as usual, open `#perf`, copy the settled rates into the row. Mid-pan: walk across a board edge and read while `panphase` keeps trail + depth-2 boards mounted.

## Jest

[`ops/jest.config.ts`](../../ops/jest.config.ts) maps `zss/perf/ui` to [`ops/lib/test/mocks/perfui.ts`](../../ops/lib/test/mocks/perfui.ts) and `zss/perf/ticktimingstats` to [`ops/lib/test/mocks/ticktimingstats.ts`](../../ops/lib/test/mocks/ticktimingstats.ts) so Node tests do not load Vite `import.meta.env`.

**Graphics / TSX changes:** Jest does **not** compile the cafe Vite graph. After editing `zss/gadget/graphics/*.tsx`, run `yarn tsc --noEmit -p tsconfig.json` — duplicate bindings and similar errors are otherwise only caught by `cafe:dev`.

## Preventing render-cache regressions

When adding sim-side layer caches or main-thread render memoization:

| Step | Why |
|------|-----|
| `yarn jest ops/tests/unit/memory/incrementallayerscache --config ops/jest.config.ts --no-coverage` | Regression gate for incremental layer cache + sprite rebuild after player move. |
| `yarn tsc --noEmit -p tsconfig.json` after graphics TSX edits | Jest skips the R3F bundle. |
| `yarn task run cafe:build` + `cafe:preview` -- move on an iso board | Prod inlines perf flags; dev server alone is insufficient. |
| A/B `ZSS_PERF_INCREMENTAL_LAYERS=true` in `cafe/.env.local` | Isolates incremental layer path from other render bugs. |

Design rules and failure modes: [`docs/render-gadget-optimizations.md`](docs/render-gadget-optimizations.md) (invariant under optimization 1B).
