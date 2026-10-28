# DaisySP backend

**DaisySP is the only synth.** `createsynthbackend()` always boots Daisy via `bootdaisysynth()`.

## Fixtures

Drum metrics live in `ops/fixtures/synth/wasm/parity-metrics-daisy.json`. SOS voice fixtures live under `ops/fixtures/synth/daisy/`. Regenerate after a drum or SOS preset change:

```bash
yarn task run ops:daisy:build
yarn task run ops:fixtures:synth:regen:drums
yarn task run ops:fixtures:synth:regen:sos-voice
```

`yarn task run ops:fixtures:synth:regen:all` runs both after a Daisy build.

## Checks

```bash
yarn task run ops:daisy:regression:test
yarn task run ops:daisy:adsr-parity:test
yarn task run ops:daisy:bench:synth
```

Manual drum render check (not CI):

```bash
ZSS_PARITY_RENDER=1 ZSS_DAISY_PARITY=1 yarn ops:test wasmparity
```

That compares drum patches to `parity-metrics-daisy.json`. Metrics are RMS, peak, spectral centroid, and 3-band energy ratios (`paritymetrics.ts`).

## Build

```bash
yarn task run ops:daisy:build   # requires Emscripten (source emsdk_env.sh)
```

Rebuild and commit `cafe/public/daisy/*` after any C++ change. `ops:daisy:build` is manual only — it is not a step of `cafe:build`.

`yarn task run ops:daisy:bundle:processor` injects SAB offsets from `daisycontrol.ts` into the worklet (must match `kVoiceCfgStride` in `zss_daisy_synth.cpp`).

## Architecture

- WASM build from [WasmPatcher](https://github.com/jaffco/WasmPatcher) (Emscripten + DaisySP submodule at `submodules/DaisySP`)
- Dedicated `daisy-processor.js` AudioWorklet
- SAB channels copied into the WASM control buffer each audio block
- C++ graph reads `zss_osccfg`, `zss_algocfg`, `zss_vibrato`
- Shared SAB and scheduling live in `backend/wasm/`

## Bundle size (2026-05-29)

| Artifact | Size |
|----------|------|
| `cafe/public/daisy/zss_daisy.wasm` | ~75 KB (4× ReverbSc delay storage) |
| `cafe/public/daisy/zss_daisy.js` | ~12 KB |
| `cafe/public/daisy/daisy-processor.js` | ~5 KB |

Only the Daisy WASM ships in production builds.
