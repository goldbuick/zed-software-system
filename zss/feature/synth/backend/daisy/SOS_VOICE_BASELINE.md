# SOS voice regression baseline

Recorded after DaisySP fidelity improvements (Phase A/B).

## Bench

Run worst-case load (8 held notes + FX + drums):

```bash
yarn daisy:bench:synth
```

Target: `realtimefactor >= 1.0` on dev hardware for worst-case load.

WASM size after Phase B (`fm2.cpp`): ~79 KB (`zss_daisy.wasm`, 2026-06-05).

Regression: `yarn sos-voices:test` (12 SOS instrument patches vs `ops/fixtures/synth/daisy/sos-voice-fixtures.json`).

Regenerate after intentional voice DSP changes:

```bash
yarn daisy:build
yarn sos-voice-fixtures:regen
```

Gate locally:

```bash
yarn sos-voices:test:full
```

## Patch list

See [`sosvoicepatches.ts`](sosvoicepatches.ts) — 12 SOS instrument renders (wind ×4, piano ×2, bowed ×2, organ ×2, timpani, string ensemble).
