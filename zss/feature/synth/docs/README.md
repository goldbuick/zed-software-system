# Synth Module Documentation

This document provides detailed documentation for each file in the synth module. The synth is a web-based software synthesizer built with Tone.js, supporting multiple sound sources, effects, drum instruments, and recording/playback.

## Quick Links

| Topic | File |
|-------|------|
| [index.ts](index.md) | Main entry, synth factory |
| [algosynth.ts](algosynth.md) | 4-operator FM synth |
| [audiochain.ts](audiochain.md) | Global audio routing |
| [source.ts](source.md) | Sound source factory |
| [playnotation.ts](playnotation.md) | Text notation parser |
| [fx & fxchannels](fx-and-fxchannels.md) | Effects chain |
| [drums](drums.md) | Drum kit |
| [voiceconfig](voiceconfig.md) | Voice/source config API |
| [voicefx](voicefx.md) | FX config API |
| [worklets](worklets.md) | AudioWorklet processors |
| [record & mp3](record-and-mp3.md) | Recording to MP3 |

---

## Table of Contents

1. [Index (index.ts)](#index-indexts)
2. [AlgoSynth (algosynth.ts)](#algosynth-algosynthts)
3. [Audio Chain (audiochain.ts)](#audio-chain-audiochaints)
4. [Source (source.ts)](#source-sourcets)
5. [FX (fx.ts)](#fx-fxts)
6. [FX Channels (fxchannels.ts)](#fx-channels-fxchannelsts)
7. [Source FX Setup (sourcefxsetup.ts)](#source-fx-setup-sourcefxsetupts)
8. [Tick Handler (tickhandler.ts)](#tick-handler-tickhandlerts)
9. [Play Notation (playnotation.ts)](#play-notation-playnotationts)
10. [Record Handler (recordhandler.ts)](#record-handler-recordhandlerts)
11. [MP3 (mp3.ts)](#mp3-mp3ts)
12. [Frequency Crusher Worklet](#frequency-crusher-worklet)
13. [Sidechain Worklet](#sidechain-worklet)
14. [Drums](#drums)
15. [Voice Config](#voice-config)
16. [Voice FX](#voice-fx)

---

## Index (index.ts)

**Purpose:** Main entry point and synth factory. Orchestrates the entire synthesizer system.

**Key Exports:**
- `setupsynth()` — Async initialization; registers AudioWorklet modules (fcrush, sidechain)
- `createsynth()` — Factory that builds and returns the full synth instance (`AUDIO_SYNTH`)

**Responsibilities:**
- Creates the audio chain, source/FX setup, tick handler, and record handler
- Manages playback via a Tone.js `Part` (pacer) that schedules note events
- Provides `addplay()`, `addbgplay()`, `stopplay()` for playback control
- Handles BPM changes, volume controls (play, bgplay, TTS)
- Supports replay of recorded patterns with `applyreplay()` and `synthreplay()`
- Exposes `synthrecord()` and `synthflush()` for recording to MP3
- Supports adding external audio buffers (e.g. TTS) via `addaudiobuffer()`
- `applyreset()` restores default synth/FX state
- `destroy()` cleans up all nodes

**Lifecycle:** Call `setupsynth()` once before creating synths (e.g. in offline rendering). Call `createsynth()` to get a new synth instance.

---

## AlgoSynth (algosynth.ts)

**Purpose:** FM-style algorithmic synthesizer with 4 operators and 8 algorithms.

**Architecture:**
- Extends Tone.js `Monophonic`
- Four `Synth` operators with independent oscillators and envelopes
- Three modulation paths with `harmonicity` (frequency ratio) and `modulationindex` (modulation depth)
- `algorithm` (0–7) controls how operators modulate each other and the output

**Algorithms:**
- **0:** Serial chain: 1→2→3→4 (output from 4)
- **1:** 1,2→3→4 (output from 4)
- **2:** 1→4, 2→3→4 (output from 4)
- **3:** 1,2,3→4 (output from 4)
- **4:** 1→2, 3→4 (output from 2+4)
- **5:** 1→2,1→3,1→4 (output from 2+3+4)
- **6:** 1→2 (output from 2)
- **7:** All four operators to output (additive)

**Parameters:**
- `harmonicity1`, `harmonicity2`, `harmonicity3` — Frequency ratios for modulators
- `modulationindex1`, `modulationindex2`, `modulationindex3` — Modulation depth
- `oscillator1`–`oscillator4` — Oscillator config per operator
- `envelope1`–`envelope4` — Envelope config per operator
- `frequency`, `detune` — Pitch control

---

## Audio Chain (audiochain.ts)

**Purpose:** Builds the global audio routing and processing chain.

**Signal Flow:**
1. **Inputs:** `playvolume`, `bgplayvolume`, `ttsvolume`, `drumvolume`
2. **Sidechain compressor** — Uses `altaction` (TTS + bgplay) and `drumaction` (drums) as sidechain to duck main content
3. **Main compressor** — Static dynamics
4. **Razzle chain** — Vibrato → Chorus for character
5. **Pink noise** — Tape hiss (modulated by oscillator)
6. **Main volume** → Destination and optional `broadcastdestination` (MediaStream for recording/screen share)

**Returns:**
- `mainvolume`, `broadcastdestination`, `razzlegain`
- `playvolume`, `drumvolume`, `bgplayvolume`, `ttsvolume`
- `drum` — Drum instrument triggers

---

## Source (source.ts)

**Purpose:** Factory for sound sources. Defines synth types and creates instances.

**Source Types (`SOURCE_TYPE`):**
- `SYNTH` — Basic Tone.js `Synth` (oscillator + envelope)
- `RETRO_NOISE`, `BUZZ_NOISE`, `CLANG_NOISE`, `METALLIC_NOISE` — Procedural noise via `Sampler` + filters
- `BELLS` — `FMSynth` + `MetalSynth` for sparkle
- `DOOT` — `MembraneSynth`
- `ALGO_SYNTH` — Custom `AlgoSynth` with algorithm index

**Noise Generation:**
- Uses LFSR-style generation for deterministic, retro-style noise
- Different feedback taps produce retro, clang, buzz, metallic variants

**API per source:**
- `applyreset()` — Restore default params
- `getreplay()` / `setreplay()` — Capture/restore state for recording
- `destroy()` — Dispose synth

---

## FX (fx.ts)

**Purpose:** Creates the shared FX chain used by all sources.

**Effects:**
- `reverb` — Tone.js Reverb
- `echo` — FeedbackDelay
- `autofilter` — AutoFilter
- `distortion` — Distortion
- `vibrato` — Vibrato
- `fc` / `fcrush` — Custom FrequencyCrusher (bit-crush style)
- `autowah` — AutoWah

**Utilities:**
- `volumetodb(value)` — Converts 0–100 to dB (approx -35dB at 0, 0dB at 100)

**API:**
- `applyreset()` — Reset all effects to defaults
- `getreplay()` / `setreplay()` — For recording
- `destroy()` — Dispose all nodes

---

## FX Channels (fxchannels.ts)

**Purpose:** Per-voice FX send/return routing. Each voice can send to shared FX with independent mix levels.

**Creates for each channel index:**
- `Channel` nodes for: `fc`, `echo`, `reverb`, `autofilter`, `vibrato`, `distortion`, `autowah`
- FX receives via `receive(prefix + fxname + index)` (e.g. `fc1`, `echo2`)
- `sendtofx` — Sends dry signal to destination; each FX channel sends to its corresponding receive

**API:**
- `getreplay()` / `setreplay()` — Volume levels per FX
- `applyreset()` — Set all FX sends to 0
- `destroy()` — Dispose all nodes

---

## Source FX Setup (sourcefxsetup.ts)

**Purpose:** Wires 8 sources and 4 FX channel groups into the audio chain.

**Layout:**
- **8 sources** — All start as `SYNTH`; can be switched via `changesource()`
- **4 FX groups** — Indices 0–1 for play, 2–3 for bgplay; `mapindextofx()` maps source index to FX group
- Sources connect to their FX group’s `sendtofx`; noise sources use filter chain before send

**Mapping:**
- Sources 0–1 → FX 0
- Sources 2–3 → FX 1
- Sources 4–7 → FX 2

**API:**
- `changesource(index, type, algo)` — Replace source type (and algo for ALGO_SYNTH)
- `connectsource(index)` — Reconnect routing after source change

---

## Tick Handler (tickhandler.ts)

**Purpose:** Handles scheduled note events from the pacer. Drives both playback and recording.

**Types:**
- `RECORDING_STATE` — `recordedticks`, `recordlastpercent`, `recordisrendering`
- `PLAYBACK_STATE` — `pacertime`, `pacercount`, `pacer` (Part)

**Behavior:**
- On each tick: `[chan, duration, note]` where `note` is string (pitch), `number` (drum id), or `null` (rest)
- **String notes:** Trigger synth, handle BELLS sparkle, apply vibrato ramp
- **Numeric notes (drums):**
  - 0: tick (hi-hat)
  - 1: tweet (open hi-hat)
  - 2: cowbell
  - 3: clap
  - 4: hi snare
  - 5: hi woodblock
  - 6: low snare
  - 7: low tom
  - 8: low woodblock
  - 9: bass
  - -1: End-of-pattern marker (decrements `pacercount`)

**Recording:** Pushes `[time, value]` to `recordedticks` unless `recordisrendering > 0` (replay mode).

---

## Play Notation (playnotation.ts)

**Purpose:** Parses and converts text notation into playable note patterns.

**Constants:**
- `SYNTH_SFX_RESET` = 4 — Index where background SFX channels reset

**`SYNTH_OP` enum:** Note names (A–G), rest, sharps/flats, octave up/down, durations (64n–1n, triplet, dotted), drum ops.

**`CHAR_OP_MAP`:** Maps single characters to `SYNTH_OP` (e.g. `'a'`→NOTE_A, `'q'`→TIME_4, `'0'`→DRUM_TICK).

**Key Functions:**
- `invokeplay(synth, starttime, play, withendofpattern)` — Converts `SYNTH_OP[]` or raw string into `SYNTH_NOTE_ENTRY[]` (time, note pairs)
- `parseplay(play)` — Splits string by `;` and maps each substring to `SYNTH_OP[]` via `CHAR_OP_MAP`

**Types:**
- `SYNTH_NOTE` — `null | string | number` (rest, pitch, or drum id)
- `SYNTH_NOTE_ON` — `[chan, duration, note]`
- `SYNTH_NOTE_ENTRY` — `[time, SYNTH_NOTE_ON]`
- `SYNTH_INVOKE` — `SYNTH_OP[] | string`

---

## Record Handler (recordhandler.ts)

**Purpose:** Records synth output to MP3 and manages recording state.

**Functions:**
- `synthflush()` — Clears `recordedticks` and resets rendering state
- `synthrecord(filename)` — Offline renders recorded ticks to MP3:
  1. Computes duration from min/max tick times
  2. Creates `Offline` context
  3. Rebuilds synth with `setupsynth` + `createsynth`
  4. Applies saved source/FX state via `applyreplay`
  5. Schedules notes via `synthreplay`
  6. Renders, converts to MP3, triggers download

**Dependencies:** `converttomp3`, `SOURCE`, `FX`, `FXCHAIN` from `sourceFx`

---

## MP3 (mp3.ts)

**Purpose:** Converts Tone.js `ToneAudioBuffer` (or compatible) to MP3.

**Function:**
- `converttomp3(buffer)` — Uses `@breezystack/lamejs`:
  - Reads mono PCM from channel 0
  - Encodes in 1152-sample blocks
  - Converts float32 → int16, encodes, flushes
  - Returns `Uint8Array` of MP3 data

**Output:** 128 kbps mono MP3.

---

## Frequency Crusher Worklet

### fcrushworklet.js

**Purpose:** AudioWorklet processor for sample-and-hold style bit crushing.

**Parameters:**
- `rate` (1–512) — How often to sample and hold; lower = more crushed

**Behavior:** For each sample, when `count % rate === 0`, holds input; otherwise outputs held value. Produces stepped, lo-fi sound.

### fcrushworkletnode.ts

**Purpose:** Tone.js `Effect` wrapper for the Frequency Crusher worklet.

**Exports:**
- `FrequencyCrusher` — Effect with `rate` param (1–512)
- `addfcrushmodule()` — Registers worklet via `audioWorklet.addModule()`

---

## Sidechain Worklet

### sidechainworklet.js

**Purpose:** AudioWorklet sidechain compressor. Ducks main input based on sidechain level.

**Parameters:** `threshold`, `ratio`, `attack`, `release`, `mix`, `makeupGain`

**Inputs:** Input 0 = main, Input 1 = sidechain (mono sum)

**Behavior:** Computes sidechain level, applies compression to main signal, mixes dry/wet.

### sidechainworkletnode.ts

**Purpose:** Tone.js `Effect` wrapper for the sidechain compressor.

**Exports:**
- `SidechainCompressor` — Effect with threshold, ratio, attack, release, mix, makeupGain; `sidechain` is a Gain node for sidechain input
- `addsidechainmodule()` — Registers worklet

---

## Drums

### drums/index.ts

**Purpose:** Assembles all drum instruments and exposes trigger functions.

**Creates:** hihat, percussion, snare, woodblock, tom, bass

**Returns:** Object with `ticktrigger`, `tweettrigger`, `cowbelltrigger`, `claptrigger`, `hisnaretrigger`, `hiwoodblocktrigger`, `lowsnaretrigger`, `lowtomtrigger`, `lowwoodblocktrigger`, `basstrigger`

### drums/bass.ts

**Purpose:** Bass drum (kick).

**Implementation:** `MembraneSynth` with high octaves, pitch decay. Connects to `drumvolume` and `drumaction` (sidechain).

**Trigger:** `basstrigger(time)` — Plays C1, 8n duration

### drums/hihat.ts

**Purpose:** Closed and open hi-hat.

**Implementation:**
- **Tick (closed):** `NoiseSynth` → highpass 8kHz → EQ3 → volume
- **Tweet (open):** Same chain with longer decay

**Triggers:** `ticktrigger(time)`, `tweettrigger(time)`

### drums/snare.ts

**Purpose:** Hi snare and low snare.

**Implementation:** Each snare = oscillator (triangle) + noise → highpass 10kHz → distortion → volume.

**Hi snare:** 10kHz→300→100 Hz ramp; noise decay 32n  
**Low snare:** 10kHz→150→100 Hz ramp; different envelope

**Triggers:** `hisnaretrigger(duration, time)`, `lowsnaretrigger(duration, time)`

### drums/percussion.ts

**Purpose:** Cowbell and clap.

**Cowbell:** `PolySynth` (square) with bandpass 350Hz, gain envelope  
**Clap:** `NoiseSynth` → highpass 800Hz → EQ3

**Triggers:** `cowbelltrigger(duration, time)`, `claptrigger(duration, time)`

### drums/tom.ts

**Purpose:** Low tom.

**Implementation:** Saw + triangle oscillators + noise; oscillators pitch down from C4/C5 to C0 over duration.

**Trigger:** `lowtomtrigger(duration, time)`

### drums/woodblock.ts

**Purpose:** Hi and low woodblock.

**Implementation:** Each = clack (saw) + donk (sine) through bandpass 256Hz.

**Triggers:** `hiwoodblocktrigger(duration, time)`, `lowwoodblocktrigger(duration, time)`

---

## Voice Config

### voiceconfig/index.ts

**Purpose:** Handles voice/source configuration from external API (e.g. device commands).

**Function:** `synthvoiceconfig(player, synth, index, config, value)`

**Configs:**
- `restart` — `applyreset()` on synth
- `vol` / `volume` — Set source volume
- `port` / `portamento` — Set portamento (SYNTH, ALGO_SYNTH)
- `env` / `envelope` — `[attack, decay, sustain, release]`
- `retro`, `buzz`, `clang`, `metallic`, `bells`, `doot`, `algo0`–`algo7` — Change source type
- Oscillator types (e.g. `sine`, `square`, `pwm`, `pulse`) — Set oscillator type; `value` can be partials array
- Oscillator-specific: `modfreq`, `width`, `phase`, `harmonicity`, `modindex`, `modtype`, `modenv`, `count`, `spread`

**Delegates:** `handlealgosynthconfig()` for ALGO_SYNTH-specific params.

### voiceconfig/algosynth.ts

**Purpose:** AlgoSynth-specific configuration.

**Function:** `handlealgosynthconfig(player, voice, config, value)`

**Configs:**
- `harmonicity`, `harmonicity1`–`harmonicity3`
- `modindex`, `modindex1`–`modindex3`
- `osc1`–`osc4` — Oscillator type string
- `env1`–`env4` / `envelope1`–`envelope4` — `[attack, decay, sustain, release]`

### voiceconfig/validation.ts

**Purpose:** Validates synth type and config before applying.

**Function:** `validatesynthtype(value, maybepartials)`

**Checks:**
- Patterns like `am/fm/fat + sine/square/triangle/sawtooth/custom` with optional partials
- Known types: `pwm`, `pulse`, `retro`, `buzz`, `clang`, `metallic`, `bells`, `doot`, `algo0`–`algo7`
- Custom types with partials require `maybepartials` to be an array

---

## Voice FX

### voicefx/config.ts

**Purpose:** Central FX configuration dispatcher.

**Function:** `synthvoicefxconfig(player, synth, index, fxname, config, value)`

**Configs:**
- `on` — Set FX send to 80 (vibrato/autofilter) or 30 (others)
- `off` — Set send to 0
- Numeric — Set send level (0–100, converted to dB)
- Otherwise delegates to effect-specific handlers

**FX names:** `fc`, `fcrush`, `echo`, `autofilter`, `reverb`, `distort`, `distortion`, `vibrato`, `autowah`

### voicefx/autofilter.ts

**Configs:** `type`, `q`, `depth`, `frequency`, `octaves`

### voicefx/autowah.ts

**Configs:** `basefrequency`, `octaves`, `sensitivity`, `gain`, `follower`

### voicefx/distort.ts

**Configs:** `distortion`, `oversample`

### voicefx/echo.ts

**Configs:** `delaytime`, `feedback`

### voicefx/fcrush.ts

**Configs:** `rate`

### voicefx/reverb.ts

**Configs:** `decay`, `predelay`

### voicefx/vibrato.ts

**Configs:** `maxdelay`

### voicefx/index.ts

**Exports:** `FXNAME` type, `synthvoicefxconfig`
