# `cafe/public`

Static assets served at site root by Vite (`public/`). Do not add ad-hoc trees here; parity renders and archived synth WASM live under `ops/`.

## Allowed paths

| Path | Purpose |
|------|---------|
| `benchmarks-min/` | GPU benchmark JSON used by the cafe renderer |
| `models/` | Optional on-disk speech models (large downloads) |
| `coep/` | COOP/COEP helper scripts for threaded WASM |
| `daisy/` | Built Daisy synth WASM + worklet (`yarn task run ops:daisy:build`) |

## Not here

- `renders/` — offline parity WAVs under `ops/public/renders/`
- `fixtures/` — dev-only static tree from `ops/public/` (Vite middleware)

Disk layout constants: [`ops/lib/cafepublicpaths.ts`](../../ops/lib/cafepublicpaths.ts).
