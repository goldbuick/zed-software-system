# DaisySP backend cutover gate

DaisySP runs in parallel with Maximilian behind `ZSS_DAISY_SYNTH=true`. **Maximilian remains the default** until all criteria below pass under manual `ZSS_PARITY_RENDER=1` / `ZSS_DAISY_PARITY=1` runs.

## Cutover criteria

1. Voice parity: 22/22 `WASM_PARITY_PATCHES` pass (±1 dB RMS, ±2 dB peak vs Tone fixtures)
2. Drum parity: 10/10 `DRUM_PARITY_PATCHES` pass
3. FX parity: 7/7 `FX_PARITY_PATCHES` pass
4. Master parity: play/bgplay/tts mix fixtures pass
5. Record parity: offline render matches Tone fixture expectations
6. E2E smoke: `#play`, `#bgplay`, `#synth`, FX commands, TTS, `synthrecord`
7. Bench: `yarn bench:daisy-synth` CPU ≤ Maximilian perf mode (`yarn bench:wasm-synth`)
8. Bundle size documented (both backends ship in every build)

## After cutover

1. Flip default in `synthbackendfactory.ts` (Daisy unless `ZSS_MAXI_SYNTH=true`)
2. **Maximilian is never removed** — permanent escape hatch via `ZSS_MAXI_SYNTH=true`

## Build

```bash
yarn build:daisy   # requires Emscripten (source emsdk_env.sh)
```

Rebuild and commit `cafe/public/wasm/daisy/*` after any C++ change. `yarn build:daisy` is **manual only** — not wired into default `yarn build`.

## Manual parity

```bash
ZSS_PARITY_RENDER=1 yarn test wasmparity
ZSS_PARITY_RENDER=1 ZSS_DAISY_PARITY=1 yarn test wasmparity
```

Parity tests are **not** run in CI.

## Architecture notes

- WASM build pattern from [WasmPatcher](https://github.com/jaffco/WasmPatcher) (Emscripten + DaisySP submodule)
- Dedicated `daisy-processor.js` AudioWorklet (not Maximilian eval)
- SAB channels synced into WASM control buffer each audio block
- Hard voices use DaisySP modules only (no Maximilian play-code port)

## Bundle size (2026-05-29)

| Artifact | Size |
|----------|------|
| `cafe/public/wasm/daisy/zss_daisy.wasm` | ~34 KB |
| `cafe/public/wasm/daisy/zss_daisy.js` | ~12 KB |
| `cafe/public/wasm/daisy/daisy-processor.js` | ~5 KB |

Both Maximilian and Daisy WASM ship in every production build.
