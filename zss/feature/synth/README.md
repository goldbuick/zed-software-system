# Synth Module

Web-based software synthesizer with a **front-end** (protocol, state, device routing) and a **DaisySP WASM backend**.

## Documentation

Detailed documentation is in **[docs/](docs/index.mdx)**. Active runtime: `backend/daisy/` (DSP) + `backend/wasm/` (shared SAB, scheduler, voice/FX config).

Task index: [ops/docs/tasks.md](../../../ops/docs/tasks.md) (daisy group).

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
yarn task run ops:daisy:regression:test
```

This runs Jest (`backend/daisy`, `adsrenvcurve`) then Playwright `:full` gates (pitch, play/drum, notepop). **CI** ([`.github/workflows/on-pr-check.yml`](../../../.github/workflows/on-pr-check.yml)) runs `yarn task run ops:test` (Jest) only.

## Parity gates (offline)

| Task | Coverage |
|--------|----------|
| `yarn task run ops:daisy:adsr-parity:test` | Jest `ZssLinearEnv` |
| `yarn task run ops:daisy:play-drum-balance:test:full` | Play vs drum stem balance |
| `yarn task run ops:daisy:pitch-stability:test:full` | Strike/detune / pitch drift |
| `yarn task run ops:daisy:notepop:test:full` | Note-pop A/B |

Carrier `#synth env` is **wave-agnostic** (`ZssLinearEnv` on all SYNTH voices). FM/AM: pin `#synth modenv` when comparing timbre only.

## Native watch loops

`yarn task run ops:daisy:<suite>:loop` watches `backend/daisy/native/` and runs build → render → gate.

- `play-drum`, `notepop`, `pitch`
- `--skip-build`, `--calibrate-only`, `--calibrate-on-fail` (opt-in calibrator; slow)

Implementation: [`tasks/lib/daisy/parity-loop.ts`](../../../tasks/lib/daisy/parity-loop.ts).

## Calibrators (dev-only)

Grid-search scripts rewrite [`zss_config.h`](backend/daisy/native/zss/zss_config.h). **Do not run in CI**; each step can take many minutes.

- `yarn task run ops:daisy:play-drum-balance:calibrate`

## Dev flags

| Env / task | Purpose |
|--------------|---------|
| `ZSS_DAISY_PERF=false` | Full-quality Daisy DSP |
| `ZSS_DAISY_NO_SIDECHAIN=1` | Bypass play-bus sidechain (`yarn task run cafe:dev:no-sc`, `?no_sc=1`) |
| `ZSS_DAISY_NO_MAIN_COMP=1` | Bypass main bus compressor (`?no_comp=1`) |
| `ZSS_PARITY_RENDER=1` | Offline parity renders (manual) |

**FX bus:** [parallel-fx-bus.md](docs/(path)/parallel-fx-bus.md). Offline matrix: `yarn task run ops:daisy:level-stability:test:fxmatrix`.

COOP/COEP headers are enabled in Vite for SharedArrayBuffer.
