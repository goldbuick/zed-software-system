# DaisySP backend cutover

**DaisySP is the sole synth backend** (May 2026). Maximilian WASM was archived to `archive/maxi/`.

## Reference target

Parity gates use **archived Tone.js** as ground truth (`parity-metrics-tone.json`). Regenerate Tone reference after any Tone archive change:

```bash
yarn regen:parity-fixtures:tone
```

Daisy drum fixtures (after DaisySP drum migration or preset changes):

```bash
yarn build:daisy
yarn regen:parity-fixtures:daisy-drums
```

### Tone-excluded patches

These have no Tone implementation — excluded from Tone gate count (23/25 voice patches):

- `noise-c4`, `hollow-c4` (noise voices)

## Cutover (done)

`createsynthbackend()` always boots DaisySP via `bootdaisysynth()`.

## Parity gate reference

Manual parity criteria:

1. Voice parity: 23/25 Tone-backed `WASM_PARITY_PATCHES` pass (±1 dB RMS, ±2 dB peak, spectral tolerances per patch profile)
2. Drum parity: 10/10 `DRUM_PARITY_PATCHES` pass vs **Daisy-native fixtures** (`parity-metrics-daisy.json`)
3. FX parity: 7/7 `FX_PARITY_PATCHES` pass vs Tone fixtures
4. Master parity: play/bgplay/tts mix fixtures pass
5. Record parity: offline render matches Tone fixture expectations
6. E2E smoke: `#play`, `#bgplay`, `#synth`, FX commands, TTS, `synthrecord`
7. Bench: `yarn bench:daisy-synth`

## Build

```bash
yarn build:daisy   # requires Emscripten (source emsdk_env.sh)
```

Rebuild and commit `cafe/public/wasm/daisy/*` after any C++ change. `yarn build:daisy` is **manual only** — not wired into default `yarn build`.

`yarn bundle:daisy-processor` injects SAB offsets from `daisycontrol.ts` into the worklet (must match `kVoiceCfgStride` in `zss_daisy_synth.cpp`).

## Manual parity

```bash
# Daisy vs Tone reference (primary gate)
ZSS_PARITY_RENDER=1 ZSS_DAISY_PARITY=1 ZSS_TONE_REFERENCE=1 yarn test wasmparity
```

Drum patches compare against `parity-metrics-daisy.json`; voice/FX use Tone reference with `ZSS_TONE_REFERENCE=1`.

Parity tests are **not** run in CI.

Metrics include RMS, peak, spectral centroid, and 3-band energy ratios (`paritymetrics.ts`).

## Architecture notes

- WASM build pattern from [WasmPatcher](https://github.com/jaffco/WasmPatcher) (Emscripten + DaisySP submodule)
- Dedicated `daisy-processor.js` AudioWorklet
- SAB channels synced into WASM control buffer each audio block
- C++ graph reads `zss_osccfg`, `zss_algocfg`, `zss_vibrato`; Tone-faithful voices, FX, master; **DaisySP drum classes** for tick/tweet/snares/bass/tom (cowbell/clap/woodblocks remain custom)
- Shared SAB/scheduling layer in `backend/wasm/` (not a runtime backend)

## Bundle size (2026-05-29)

| Artifact | Size |
|----------|------|
| `cafe/public/wasm/daisy/zss_daisy.wasm` | ~75 KB (4× ReverbSc delay storage) |
| `cafe/public/wasm/daisy/zss_daisy.js` | ~12 KB |
| `cafe/public/wasm/daisy/daisy-processor.js` | ~5 KB |

Only Daisy WASM ships in production builds. Maximilian assets live under `cafe/public/wasm/archive/maximilian/` (reference only).
