# ZSS DaisySP synth (native modules)

C++ implementation of the ZSS WebAssembly synth, organized around [DaisySP](https://github.com/electro-smith/DaisySP) module categories.

## Module map

| File | DaisySP area | Responsibility |
|------|----------------|----------------|
| `zss_config.h` | — | Constants, enums, control buffer sizes (must match TS SAB) |
| `zss_math.h` / `zss_math.cpp` | Utility / Filters | `dbtoamp`, `clampf`, biquad EQ |
| `zss_types.h` | — | `ZssVoice`, `ZssEngine`, FX/drum state structs |
| `zss_control.cpp` | Control | `g_control[]`, offsets, `readctrl`, osc/algo cfg readers |
| `zss_noise.cpp` | Noise | LFSR + spectrum tables (retro/buzz/clang/metallic/hollow/white) |
| `zss_vibrato.cpp` | Control + Effects | Play-bus vibrato SAB + FX send depth |
| `zss_osc.cpp` | Synthesis | Oscillators, FM, partials, glide, `synthsource` |
| `zss_voice.cpp` | Synthesis + PhysicalModeling | Algo synth, noise voices, `processvoice` dispatch |
| `zss_drums.cpp` | Drums | Tick/tweet/cowbell/clap/snare/tom/bass + Daisy bass/tom |
| `zss_fx.cpp` | Effects | Parallel FX bus (echo, reverb, crush, autofilter, autowah, drive) |
| `zss_main.cpp` | Dynamics | Sidechain duck, main bus comp, razzle chorus, string machine |
| `zss_engine.cpp` | — | `g_engine`, voice/drum/FX init, engine bring-up |
| `../zss_daisy_synth.cpp` | — | `extern "C"` API: `zss_init`, `zss_process`, control ptr |

## Audio flow (one sample)

```
voices → play0/play1/bg buses
       → applyfxgroup (parallel wet sum per bus)
       → sidechain duck on play bus
       → + drums + TTS
       → main bus compressor → razzle → DC block → out
```

Spec: [parallel-fx-bus.md](../../../docs/parallel-fx-bus.md), [audiochain.md](../../../docs/audiochain.md).

## Build

From repo root: `yarn build:daisy` (runs `native/build-daisy.sh`, compiles all `zss/*.cpp` + `zss_daisy_synth.cpp`).
