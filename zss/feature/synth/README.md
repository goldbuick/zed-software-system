# Synth Module

Web-based software synthesizer with a **front-end** (protocol, state, device routing) and **DaisySP WASM backend**.

Legacy backends are preserved under [`archive/tone/`](archive/tone/README.md) and [`archive/maxi/`](archive/maxi/README.md) for reference only.

## Documentation

Detailed documentation is in **[docs/](docs/README.md)**. Active runtime: `backend/daisy/` (DSP) + `backend/wasm/` (shared SAB, scheduler, voice/FX config).

Task index: [docs/tasks.md](../../../docs/tasks.md) (daisy group).

## Quick Start

After clone, initialize submodules (DaisySP):

```bash
git submodule update --init --recursive
```

Synth audio is initialized by the device layer on first user gesture (`enableaudio()` in `zss/device/synth.ts`). Application code typically sends commands via firmware / `device/api.ts`, not by calling the backend directly.

```typescript
import { createsynthbackend } from 'zss/feature/synth'
const backend = await createsynthbackend()
backend.addplay('qC4qD4qE4')
```

## Pre-release regression (local)

After editing `backend/daisy/native/`, run:

```bash
yarn task run daisy:regression:test
```

This runs Jest (`backend/daisy/__tests__`, `adsrenvcurve`) then critical Playwright `:full` gates (pitch, play/drum, sidechain, synth env, notepop, short env). **CI** ([`.github/workflows/on-pr-check.yml`](../../../.github/workflows/on-pr-check.yml)) runs `yarn task run app:test` (Jest) only.

## Parity gates (offline)

| Task | Coverage |
|--------|----------|
| `yarn task run daisy:adsr-parity:test` | Short amsaw ADSR + Jest `ZssLinearEnv` |
| `yarn task run daisy:synth-env:test:full` | Long-release `#synth env` (square + fmsquare repro) |
| `yarn task run daisy:play-drum-balance:test:full` | Play vs drum stem balance |
| `yarn task run daisy:sidechain:parity:test:full` | Sidechain on/off duck |
| `yarn task run daisy:pitch-stability:test:full` | Strike/detune / pitch drift |
| `yarn task run daisy:notepop:test:full` | Note-pop A/B |

Carrier `#synth env` is **wave-agnostic** (`ZssLinearEnv` on all SYNTH voices). FM/AM: pin `#synth modenv` when comparing timbre only.

## Native watch loops

`yarn task run daisy:<suite>:loop` watches `backend/daisy/native/` and runs build → render → gate.

- `play-drum`, `sidechain`, `synth-env`, `notepop`, `pitch`
- `--skip-build`, `--calibrate-only`, `--calibrate-on-fail` (opt-in calibrator; slow)

Implementation: [`scripts/run-daisy-parity-loop.ts`](../../../scripts/run-daisy-parity-loop.ts).

## Calibrators (dev-only)

Grid-search scripts rewrite [`zss_config.h`](backend/daisy/native/zss/zss_config.h). **Do not run in CI**; each step can take many minutes.

- `yarn task run daisy:play-drum-balance:calibrate`
- `yarn task run daisy:sidechain:parity:calibrate`
- `yarn task run daisy:synth-env:calibrate`

## Dev flags

| Env / task | Purpose |
|--------------|---------|
| `ZSS_DAISY_PERF=false` | Full-quality Daisy DSP |
| `ZSS_DAISY_NO_SIDECHAIN=1` | Bypass play-bus sidechain (`yarn task run app:dev:no-sc`, `?no_sc=1`) |
| `ZSS_DAISY_NO_MAIN_COMP=1` | Bypass main bus compressor (`?no_comp=1`) |
| `ZSS_PARITY_RENDER=1` | Offline parity renders (manual) |

**FX bus:** [parallel-fx-bus.md](docs/parallel-fx-bus.md). Offline matrix: `yarn task run daisy:level-stability:test:fxmatrix`.

COOP/COEP headers are enabled in Vite for SharedArrayBuffer.
