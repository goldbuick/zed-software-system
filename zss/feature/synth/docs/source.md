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
| `HOLLOW_NOISE` | BeepBox hollow chip noise (WASM only) |
| `WHITE_NOISE` | BeepBox white chip noise — `#synth noise` (WASM only) |

## BeepBox chip noise mapping (WASM)

WASM noise voices use [BeepBox](https://github.com/johnnesky/beepbox) `chipNoises` wave tables (32768 samples) and `noiseSynth` playback (pitch-relative smoothing + expression gain). Tone path still uses the legacy 131072-sample Sampler tables until a follow-up.

| `#synth` | BeepBox index | Generation |
|----------|---------------|------------|
| `retro` | 0 | LFSR `1<<14` |
| `noise` | 1 | Fixed-seed PRNG (BeepBox white) |
| `clang` | 2 | LFSR `2<<14` |
| `buzz` | 3 | LFSR `10<<2` |
| `hollow` | 4 | FFT-designed hollow spectrum |
| `metallic` | *(none — ZSS legacy)* | LFSR `15<<2`, fixed `(bit)*4*7.5-8` amplitude |

`#synth noise` and `#synth hollow` require `ZSS_WASM_SYNTH=true`; Tone path returns an error.

## Noise Generation (Tone path — legacy)

Tone noise sources still use a deterministic LFSR-style algorithm:

- **Buffer size:** 131072 samples
- **Feedback taps** vary by type:
  - `RETRO_NOISE`: 1<<14
  - `CLANG_NOISE`: 2<<14
  - `BUZZ_NOISE`: 10<<2
  - `METALLIC_NOISE`: 15<<2 (with random amplitude variation)

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
