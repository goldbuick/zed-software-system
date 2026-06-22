# `cafe/public`

Static assets served at site root by Vite (`public/`). Do not add ad-hoc trees here; parity renders, archived synth WASM, and Wanix pins live under `ops/`.

## Allowed paths

| Path | Purpose |
|------|---------|
| `benchmarks-min/` | GPU benchmark JSON used by the cafe renderer |
| `models/` | Optional on-disk speech models (large downloads) |
| `wasm/coep/` | COOP/COEP helper scripts for threaded WASM |
| `wasm/daisy/` | Built Daisy synth WASM + worklet (`yarn task run daisy:build`) |
| `wasm/memory/` | Built memory WASM |

## Not here

- `wasm/archive/` — removed; legacy maximilian assets are under `ops/archive/wasm/`
- `renders/` — offline parity WAVs under `ops/fixtures/` and task output dirs
- `fixtures/` — dev-only static tree from `ops/fixtures/public/` (Vite middleware)
- `wanix/` — runtime pin (`BUILD_ID`) is written by `wanix-ensure.sh` to `ops/fixtures/wanix/`; harness HTML is under `ops/fixtures/harness/wanix/`
