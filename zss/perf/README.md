# UI performance tooling

## `ZSS_PERF_UI`

Set `ZSS_PERF_UI=true` in `cafe/.env` or `cafe/.env.local` (see [`cafe/.env`](../cafe/.env)). Rebuild or restart Vite so `import.meta.env` picks it up.

When enabled:

- **`perfmeasure` calls** ([`ui.ts`](ui.ts)) record [User Timing](https://developer.mozilla.org/en-US/docs/Web/API/Performance_API/User_timing) measures prefixed with `zss:`. Inspect them in Chrome DevTools **Performance** → load profile → **Timings** / User Timing track.
- **React `Profiler`** wraps [`TapeComponent`](../screens/tape/component.tsx) in development only and logs commit times to the console as `[zss perf] TapeComponent …`.

When disabled, helpers are no-ops and the `Profiler` wrapper is not used.

## Bundle size

`yarn analyize` runs a production build with `ZSS_ANALYZER=1` and opens the bundle analyzer (see root [`package.json`](../../package.json)).

## Browser tools

- **Performance** tab: main-thread and GPU work; complements User Timing entries from `perfmeasure`.
- **React DevTools → Profiler**: component-level commits without app changes.
- **Chrome traces**: for numbers closer to production, record a Performance profile **without** starting **CPU sampling** (avoids `CpuProfiler::StartProfiling` / large `v8::Debugger::AsyncTaskRun` slices in the trace).
