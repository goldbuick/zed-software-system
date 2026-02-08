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

## Implementation Details

### bass.ts
- **MembraneSynth** with 8 octaves, pitch decay 0.125
- Connects to both `drumvolume` and `drumaction` (sidechain)

### hihat.ts
- **NoiseSynth** through highpass filter (8kHz tick, 6kHz open)
- EQ3 for tone shaping
- Short envelope for tick, longer for tweet

### snare.ts
- Oscillator (triangle) + NoiseSynth for body and snap
- Frequency ramp: 10kHz → 300/150 → 100 Hz
- Distortion for grit
- Highpass 10kHz

### percussion.ts
- **Cowbell:** PolySynth (square) at 800+540 Hz, bandpass 350Hz
- **Clap:** NoiseSynth, highpass 800Hz, EQ3

### tom.ts
- Saw + triangle + noise
- Pitch glide from C4/C5 down to C0

### woodblock.ts
- Clack (saw) + donk (sine) through bandpass 256Hz
- Different frequency targets for hi vs low
