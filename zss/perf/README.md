# UI performance tooling

## `ZSS_DEBUG_PERF_UI`

Set `ZSS_DEBUG_PERF_UI=true` in `cafe/.env` or `cafe/.env.local` (see [`cafe/.env`](../../cafe/.env)). Rebuild or restart Vite so `import.meta.env` picks it up.

When enabled:

- **`perfmeasure` calls** ([`ui.ts`](ui.ts)) record [User Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing) measures prefixed with `zss:`. Inspect them in Chrome DevTools **Performance** → load profile → **Timings** / User Timing track.
- **React `Profiler`** wraps [`TapeComponent`](../screens/tape/component.tsx) in development only and logs commit times to the console as `[zss perf] TapeComponent …`.
- **`PerfHud`** ([`hud.tsx`](hud.tsx)) mounts inside the R3F engine: an on-screen [stats-gl](https://github.com/RenaudRohlinger/stats-gl) overlay (CPU / GPU / FPS) and a 1 Hz console log of `renderer.info` (`calls`, `triangles`, `lines`, `points`, `geometries`, `textures`, `programs`). Use the delta-calls-per-second value to catch silent draw-call regressions.

When disabled, helpers are no-ops, the `Profiler` wrapper is not used, and `PerfHud` returns `null`.

## Bundle size

`yarn analyize` runs a production build with `ZSS_ANALYZER=1` and opens the bundle analyzer (see root [`package.json`](../../package.json)).

## Browser tools

- **Performance** tab: main-thread and GPU work; complements User Timing entries from `perfmeasure`.
- **React DevTools → Profiler**: component-level commits without app changes.
- **Chrome traces**: for numbers closer to production, record a Performance profile **without** starting **CPU sampling** (avoids `CpuProfiler::StartProfiling` / large `v8::Debugger::AsyncTaskRun` slices in the trace).

## Baseline capture checklist (before/after comparisons)

1. Set `ZSS_DEBUG_PERF_UI=true`, restart Vite, reproduce the scenario you care about.
2. Open Chrome **Performance**, start recording **without** enabling **CPU sampling** / JS profiler if you want traces comparable to production-style overhead.
3. Use a **clean profile or incognito** so extensions do not add `FunctionCall` noise.
4. Optional: run a **production** build (`yarn build` + `yarn preview`) for a second baseline.
5. After changes, repeat the same steps and compare the **User Timing** `zss:*` rows and frame slices.

### Reference scenarios

Capture each of these with `PerfHud` visible and the console open so `[zss perf]` lines are recorded:

1. **Idle tape/terminal** — app open to the terminal, no board visible, no typing. Should be the cheapest scene.
2. **Flat board with marquee** — a board loaded, an exit visible, and a scroll marquee on-screen. Exercises `FlatGraphics`, `ScrollMarquee`, and the tile upload path together.
3. **3D board with CRT + scanlines** — FPV/ISO/Mode7 board with the CRT and scanline FX enabled (requires a high-tier GPU tier detection or forced config). Exercises the post-processing stack.

Record the first few seconds after things settle; note the **delta calls/s**, **GPU ms** from stats-gl, and any `TapeComponent` commits from the React `Profiler`.

## Jest

`jest.config.ts` maps `zss/perf/ui` to [`zss/__mocks__/perfui.ts`](../__mocks__/perfui.ts) so Node tests do not load `zss/config` (`import.meta.env` from Vite).

## Expected deltas (regression gates)

The Three.js / R3F performance pass introduced the following invariants. If `PerfHud` and the React `Profiler` numbers drift significantly from these across the reference scenarios, something regressed.

- **Idle tape/terminal** — React commits per second should stay flat (no per-frame commits). Draw calls per second should not rise when no typing is happening. Prior to the work, `ScrollMarquee` caused a React commit per scroll tick; it is now ref-driven and commits only when inputs change.
- **Flat board with marquee** — `TilesRender` should not allocate (previously `.slice()` called three times per render per tile buffer). Data texture uploads are driven by the tile store `render` counter; uploads per second = `changed()` ticks per second, not commits per second. `FlatGraphics` has one tuple subscription over the 8 exit fields instead of 8 subscriptions.
- **3D board with CRT + scanlines** — `EffectComposerMain` is unmounted entirely when `shouldcrt` is false; when on, CRT fragment runs 2 octaves of noise instead of 3. Board FBO allocation scales with `useDeviceData.gpudprscale` (1.0 / 0.75 / 0.5 by tier).
- **Pure-ASCII grids** — `<Tiles>` no longer mounts `<UnicodeOverlay>` when the char scan finds no code points > 255. Allocations of `Float32Array(maxcells * 2)` pairs (offset/uv/color/bgindex) disappear for ASCII-only layers.
- **Unicode overlay atlas** — `zss/gadget/display/unicodeatlas.ts` keeps one persistent `DataTexture` (1536×1536, ~2.4 MB RGBA-equivalent once) for SDF glyphs; sampling uses `LinearFilter` (not integer `usampler2D`). Raster size follows `viewport.dpr * useDeviceData().gpudprscale`; changing that product clears the atlas and `UnicodeOverlay` refreshes `uniforms.atlas`.

If you change any of the above, re-run the three reference scenarios and record the new numbers here.
