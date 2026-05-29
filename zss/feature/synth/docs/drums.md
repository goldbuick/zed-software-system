# Drums Module

Synthesized drum kit. Each file provides one or more drum sounds with trigger functions.

## Overview

| File | Sounds | Trigger Functions |
|------|--------|-------------------|
| index.ts | (assembles all) | All triggers |
| bass.ts | Kick | `basstrigger` |
| hihat.ts | Closed, open | `ticktrigger`, `tweettrigger` |
| snare.ts | Hi snare, low snare | `hisnaretrigger`, `lowsnaretrigger` |
| percussion.ts | Cowbell, clap | `cowbelltrigger`, `claptrigger` |
| tom.ts | Low tom | `lowtomtrigger` |
| woodblock.ts | Hi, low woodblock | `hiwoodblocktrigger`, `lowwoodblocktrigger` |

## Drum ID Mapping (from playnotation)

| ID | Drum | Trigger |
|----|------|---------|
| 0 | Tick | `ticktrigger` |
| 1 | Tweet | `tweettrigger` |
| 2 | Cowbell | `cowbelltrigger` |
| 3 | Clap | `claptrigger` |
| 4 | Hi snare | `hisnaretrigger` |
| 5 | Hi woodblock | `hiwoodblocktrigger` |
| 6 | Low snare | `lowsnaretrigger` |
| 7 | Low tom | `lowtomtrigger` |
| 8 | Low woodblock | `lowwoodblocktrigger` |
| 9 | Bass | `basstrigger` |

## Backend split (Daisy vs Maximilian)

| Backend | Drum implementation |
|---------|---------------------|
| **Maximilian WASM** (default) | Tone-parity custom DSP in [`drumplaycode.ts`](../backend/wasm/drumplaycode.ts) |
| **DaisySP WASM** (`ZSS_DAISY_SYNTH`) | [DaisySP Drums](https://github.com/electro-smith/DaisySP/tree/master/Source/Drums/) for IDs 0, 1, 4, 6, 7, 9; custom C++ for cowbell, clap, woodblocks |

See [implementation-matrix.md](implementation-matrix.md) Table 4.

## Implementation Details

### bass.ts
- **MembraneSynth** with 8 octaves, pitch decay 0.125
- Connects to both `drumvolume` and `drumaction` (sidechain)

### hihat.ts
- **NoiseSynth** through biquad highpass filter (8kHz tick, 6kHz open; -12 dB/oct, Tone parity)
- EQ3 for tone shaping
- Short envelope for tick, longer for tweet

### snare.ts
- Oscillator (triangle) + NoiseSynth for body and snap
- Frequency ramp: 10kHz → 300/150 → 100 Hz
- Distortion for grit
- Highpass 10kHz

### percussion.ts
- **Cowbell:** PolySynth (square) at 800+540 Hz, bandpass 350Hz
- **Clap:** NoiseSynth, biquad highpass 800Hz (-12 dB/oct), EQ3 (WASM matches Tone chain; no dry blend)

### tom.ts
- Saw + triangle + noise
- Pitch glide from C4/C5 down to C0

### woodblock.ts
- Clack (saw) + donk (sine) through bandpass 256Hz
- Different frequency targets for hi vs low
- **WASM** (`drumplaycode.ts`): split clack/donk ADSR (clack decay 0.001s, donk decay 0.1s), summed before filter; voice length shortens to pattern duration + release for indices 5/8
