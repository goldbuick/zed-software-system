# Synth Module

Web-based software synthesizer with a **front-end** (protocol, state, device routing) and **WASM back-end v1** (Maximilian AudioWorklet + SAB scheduling).

Legacy Tone.js code is preserved under [`archive/tone/`](archive/tone/README.md) for reference only.

## Documentation

Detailed documentation is in **[docs/](docs/README.md)**. WASM runtime code lives under `backend/wasm/`.

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
| Adapter | `backend/wasmsynthadapter.ts` | `SynthBackend` → WASM bridge |
| Shared | `shared/`, `playnotation.ts`, `synthdefaults.ts`, `voicefxgroup.ts`, `mp3.ts` | Engine-agnostic types and helpers |
| Archive | `archive/tone/` | Legacy Tone.js stack (do not import) |

## Dev flags

| Env | Purpose |
|-----|---------|
| `ZSS_WASM_SPIKE=true` | Phase 0 audible WASM spike only (no full synth backend) |
| `ZSS_WASM_PERF=false` | Full parity-quality DSP (default is lighter perf preset on) |

WASM synth is always-on in production builds; COOP/COEP headers are enabled in Vite for SharedArrayBuffer.
