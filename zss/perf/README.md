# UI performance tooling

## Perf monitor overlay

Toggle the in-game perf panel with **`Ctrl+I`** or the CLI command **`#perf`**.

When the panel is on:

- **[`PerfMonitorTiles`](perfmonitortiles.tsx)** shows tick timing, render stats, peer wire volume, and related HUD tiles.
- **`gpu geos` / `tex` / `prog`** — renderer resource footprint (`info.memory` + compiled programs). **`tex`** is a lifetime allocation counter: it increases when new GPU textures are created and decreases when they are `dispose()`d (tile/dither layers dispose on unmount). Cycling among the same boards should plateau rather than stair-step on every revisit.
- **[`PerfHud`](hud.tsx)** logs renderer.info to the console once per second.
- In **development** builds, React **`Profiler`** wraps [`TapeComponent`](../screens/tape/component.tsx) and logs commit times as `[zss perf] TapeComponent …`.

## Dev instrumentation

In Vite **development** builds (`import.meta.env.DEV`):

- **`perfmeasure` calls** ([`ui.ts`](ui.ts)) record [User Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing) measures prefixed with `zss:`. Inspect them in Chrome DevTools **Performance** → load profile → **Timings** / User Timing track.
- **`measurestage`** ([`ticktimingstats.ts`](ticktimingstats.ts)) accumulates tick-stage timings for the overlay.

Production builds skip this instrumentation overhead.

## Bundle size

`yarn task run app:analyze` runs a production build with `ZSS_ANALYZER=1` and opens the bundle analyzer (see [ops/docs/tasks.md](../../ops/docs/tasks.md)).

## Browser tools

- **Performance** tab: main-thread and GPU work; complements User Timing entries from `perfmeasure`.
- **React DevTools → Profiler**: component-level commits without app changes.
- **Chrome traces**: for numbers closer to production, record a Performance profile **without** starting **CPU sampling** (avoids `CpuProfiler::StartProfiling` / large `v8::Debugger::AsyncTaskRun` slices in the trace).

## Baseline capture checklist (before/after comparisons)

1. Open cafe in dev, press **`Ctrl+I`** (or run `#perf`) to show the overlay, then reproduce the scenario you care about.
2. Open Chrome **Performance**, start recording **without** enabling **CPU sampling** / JS profiler if you want traces comparable to production-style overhead.
3. Use a **clean profile or incognito** so extensions do not add `FunctionCall` noise.
4. Optional: run a **production** build (`yarn task run app:build` + `yarn task run app:preview`) for a second baseline.
5. After changes, repeat the same steps and compare the **User Timing** `zss:*` rows and frame slices.

## Jest

[`ops/jest.config.ts`](../../ops/jest.config.ts) maps `zss/perf/ui` to [`ops/lib/test/mocks/perfui.ts`](../../ops/lib/test/mocks/perfui.ts) so Node tests do not load Vite `import.meta.env`.
