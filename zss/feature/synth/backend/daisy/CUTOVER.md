# DaisySP backend cutover gate

DaisySP runs in parallel with Maximilian behind `ZSS_DAISY_SYNTH=true`. **Maximilian remains the default** until all criteria below pass under manual parity runs.

## Reference target

Parity gates use **archived Tone.js** as ground truth (`parity-metrics-tone.json`), not Maximilian self-fixtures. Regenerate Tone reference after any Tone archive change:

```bash
yarn regen:parity-fixtures:tone
```

Maximilian fixtures (`parity-metrics.json`) remain for WASM self-check only:

```bash
yarn regen:parity-fixtures
```

Daisy drum fixtures (after DaisySP drum migration or preset changes):

```bash
yarn build:daisy
yarn regen:parity-fixtures:daisy-drums
```

### Tone-excluded patches

These have no Tone implementation — excluded from Tone gate count (23/25 voice patches):

- `noise-c4`, `hollow-c4` (WASM-only voices)

Retro/buzz/clang/metallic Daisy targets **Tone LFSR** behavior; Maximilian uses BeepBox tables and may diverge on spectral checks.

## Cutover criteria

1. Voice parity: 23/25 Tone-backed `WASM_PARITY_PATCHES` pass (±1 dB RMS, ±2 dB peak, spectral tolerances per patch profile)
2. Drum parity: 10/10 `DRUM_PARITY_PATCHES` pass vs **Daisy-native fixtures** (`parity-metrics-daisy.json`). Maximilian drums still gate against Tone when using `parity-metrics-tone.json`.
3. FX parity: 7/7 `FX_PARITY_PATCHES` pass vs Tone fixtures
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
# WASM vs committed WASM fixtures
ZSS_PARITY_RENDER=1 yarn test wasmparity

# Daisy vs Tone reference (primary gate)
ZSS_PARITY_RENDER=1 ZSS_DAISY_PARITY=1 ZSS_TONE_REFERENCE=1 yarn test wasmparity
```

Drum patches compare against `parity-metrics-daisy.json` when `ZSS_DAISY_PARITY=1`; voice/FX still use Tone reference with `ZSS_TONE_REFERENCE=1`.

Parity tests are **not** run in CI.

Metrics include RMS, peak, spectral centroid, and 3-band energy ratios (`paritymetrics.ts`).

## Architecture notes

- WASM build pattern from [WasmPatcher](https://github.com/jaffco/WasmPatcher) (Emscripten + DaisySP submodule)
- Dedicated `daisy-processor.js` AudioWorklet (not Maximilian eval)
- SAB channels synced into WASM control buffer each audio block
- C++ graph reads `zss_osccfg`, `zss_algocfg`, `zss_vibrato`; Tone-faithful voices, FX, master; **DaisySP drum classes** for tick/tweet/snares/bass/tom (cowbell/clap/woodblocks remain custom)

## Bundle size (2026-05-29)

| Artifact | Size |
|----------|------|
| `cafe/public/wasm/daisy/zss_daisy.wasm` | ~34 KB |
| `cafe/public/wasm/daisy/zss_daisy.js` | ~12 KB |
| `cafe/public/wasm/daisy/daisy-processor.js` | ~5 KB |

Both Maximilian and Daisy WASM ship in every production build.
