# Synth Module

Web-based software synthesizer with a **front-end** (protocol, state, device routing) and **DaisySP WASM backend**.

Legacy backends are preserved under [`archive/tone/`](archive/tone/README.md) and [`archive/maxi/`](archive/maxi/README.md) for reference only.

## Documentation

Detailed documentation is in **[docs/](docs/README.md)**. Active runtime: `backend/daisy/` (DSP) + `backend/wasm/` (shared SAB, scheduler, voice/FX config).

## Quick Start

Synth audio is initialized by the device layer on first user gesture (`enableaudio()` in `zss/device/synth.ts`). Application code typically sends commands via firmware / `device/api.ts`, not by calling the backend directly.

```typescript
import { createsynthbackend } from 'zss/feature/synth'

const backend = await createsynthbackend()
backend.addplay('qC4qD4qE4')
```

## Structure

| Area | Path | Description |
|------|------|-------------|
| Front-end | `frontend/` | `SynthBackend` interface, board state sync |
| Back-end | `backend/daisy/` | DaisySP worklet (default), voices, drums, FX, recording |
| Shared WASM | `backend/wasm/` | SAB channels, play scheduler, voice/FX config, parity helpers |
| Adapter | `backend/synthbackendfactory.ts` | `SynthBackend` → DaisySP |
| Shared | `shared/`, `playnotation.ts`, `synthdefaults.ts`, `voicefxgroup.ts`, `mp3.ts` | Engine-agnostic types and helpers |
| Archive | `archive/tone/`, `archive/maxi/` | Legacy Tone.js and Maximilian stacks (do not import) |

## Dev flags

| Env | Purpose |
|-----|---------|
| `ZSS_DAISY_PERF=false` | Full-quality Daisy DSP (default is lighter perf preset on) |
| `ZSS_DAISY_PARITY=1` | With `ZSS_PARITY_RENDER=1`, run Daisy offline parity renders |
| `ZSS_PARITY_RENDER=1` | Run offline parity render tests (manual gate, not CI) |
| `ZSS_TONE_REFERENCE=1` | Compare Daisy voice/FX renders against Tone fixtures |

**FX bus:** parallel sends + return-bus compressor in `zss_daisy_synth.cpp`. Spec: [parallel-fx-bus.md](docs/parallel-fx-bus.md). Offline matrix: `yarn test:level-stability:fxmatrix`.

COOP/COEP headers are enabled in Vite for SharedArrayBuffer.
