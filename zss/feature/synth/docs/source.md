# source.ts

Factory for creating sound sources. Defines all available synth types and their implementations.

## SOURCE_TYPE Enum

| Value | Description |
|-------|-------------|
| `SYNTH` | Basic Tone.js Synth (oscillator + envelope) |
| `RETRO_NOISE` | Procedural retro-style noise |
| `BUZZ_NOISE` | Procedural buzz noise |
| `CLANG_NOISE` | Procedural clang noise |
| `METALLIC_NOISE` | Procedural metallic noise |
| `BELLS` | FMSynth + MetalSynth sparkle |
| `DOOT` | MembraneSynth (drum-like) |
| `ALGO_SYNTH` | Custom 4-operator FM synth |

## Noise Generation

Noise sources use a deterministic LFSR-style algorithm (not crypto-grade PRNG):

- **Buffer size:** 131072 samples
- **Feedback taps** vary by type:
  - `RETRO_NOISE`: 1<<14
  - `CLANG_NOISE`: 2<<14
  - `BUZZ_NOISE`: 10<<2
  - `METALLIC_NOISE`: 15<<2 (with amplitude variation)

METALLIC_NOISE uses additional amplitude scaling for a brighter character.

## Source-Specific Processing

- **Noise sources:** Chain through `filter1` (lowshelf -32dB) and `filter2` (highshelf +32dB) before output
- **BELLS:** Triggers both `synth` and `sparkle` (MetalSynth) for harmonic content
- **ALGO_SYNTH:** Stores `algo` index for algorithm selection

## API

```typescript
const { source, applyreset, getreplay, setreplay, destroy } = createsource(SOURCE_TYPE.SYNTH, 0)
```

Each source returns an object with:
- `source` — The Tone.js node(s)
- `applyreset()` — Restore default parameters
- `getreplay()` — Capture current state for recording
- `setreplay(replay)` — Restore state during replay
- `destroy()` — Dispose nodes
