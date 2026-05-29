# Synth Module

Web-based software synthesizer with a **front-end** (protocol, state, device routing) and **WASM backends** (Maximilian default; DaisySP opt-in).

Legacy Tone.js code is preserved under [`archive/tone/`](archive/tone/README.md) for reference only.

## Documentation

Detailed documentation is in **[docs/](docs/README.md)**. WASM runtime code lives under `backend/wasm/` (Maximilian) and `backend/daisy/` (DaisySP).

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
| Back-end v1 | `backend/wasm/` | Maximilian worklet, voices, drums, FX, recording |
| Back-end v2 | `backend/daisy/` | DaisySP worklet (opt-in), same SAB + scheduler |
| Adapter | `backend/synthbackendfactory.ts` | `SynthBackend` → Maximilian or Daisy |
| Shared | `shared/`, `playnotation.ts`, `synthdefaults.ts`, `voicefxgroup.ts`, `mp3.ts` | Engine-agnostic types and helpers |
| Archive | `archive/tone/` | Legacy Tone.js stack (do not import) |

## Dev flags

| Env | Purpose |
|-----|---------|
| `ZSS_WASM_SPIKE=true` | Phase 0 audible WASM spike only (no full synth backend) |
| `ZSS_WASM_PERF=false` | Full parity-quality Maximilian DSP (default is lighter perf preset on) |
| `ZSS_DAISY_SYNTH=true` | Opt into DaisySP backend (`ZSS_MAXI_SYNTH=true` forces Maximilian) |
| `ZSS_DAISY_PARITY=1` | With `ZSS_PARITY_RENDER=1`, run parity against Daisy offline renderer |
| `ZSS_PARITY_RENDER=1` | Run offline parity render tests (manual gate, not CI) |

WASM synth is always-on in production builds; COOP/COEP headers are enabled in Vite for SharedArrayBuffer.
