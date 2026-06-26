# UI performance tooling

## `ZSS_DEBUG_PERF_UI`

Set `ZSS_DEBUG_PERF_UI=true` in `cafe/.env` or `cafe/.env.local` (see [`cafe/.env`](../../cafe/.env)). Rebuild or restart Vite so `import.meta.env` picks it up.

When enabled:

- **`perfmeasure` calls** ([`ui.ts`](ui.ts)) record [User Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing) measures prefixed with `zss:`. Inspect them in Chrome DevTools **Performance** → load profile → **Timings** / User Timing track.
- **React `Profiler`** wraps [`TapeComponent`](../screens/tape/component.tsx) in development only and logs commit times to the console as `[zss perf] TapeComponent …`.

When disabled, helpers are no-ops and the `Profiler` wrapper is not used.

## Bundle size

`yarn task run app:analyze` runs a production build with `ZSS_ANALYZER=1` and opens the bundle analyzer (see [ops/docs/tasks.md](../../ops/docs/tasks.md)).

## Browser tools

- **Performance** tab: main-thread and GPU work; complements User Timing entries from `perfmeasure`.
- **React DevTools → Profiler**: component-level commits without app changes.
- **Chrome traces**: for numbers closer to production, record a Performance profile **without** starting **CPU sampling** (avoids `CpuProfiler::StartProfiling` / large `v8::Debugger::AsyncTaskRun` slices in the trace).

## Baseline capture checklist (before/after comparisons)

1. Set `ZSS_DEBUG_PERF_UI=true`, restart Vite, reproduce the scenario you care about.
2. Open Chrome **Performance**, start recording **without** enabling **CPU sampling** / JS profiler if you want traces comparable to production-style overhead.
3. Use a **clean profile or incognito** so extensions do not add `FunctionCall` noise.
4. Optional: run a **production** build (`yarn task run app:build` + `yarn task run app:preview`) for a second baseline.
5. After changes, repeat the same steps and compare the **User Timing** `zss:*` rows and frame slices.

## Jest

[`ops/jest.config.ts`](../../ops/jest.config.ts) maps `zss/perf/ui` to [`ops/lib/test/mocks/perfui.ts`](../../ops/lib/test/mocks/perfui.ts) so Node tests do not load `zss/config` (`import.meta.env` from Vite).
