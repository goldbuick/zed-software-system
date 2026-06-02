# Synth implementation matrix

Cross-reference for how ZSS implements voices, FX, drums, and master-chain processing across **DaisySP WASM** (active), archived **Maximilian WASM**, and archived **Tone.js**.

Deep param/default catalogs: [voice-types-reference.md](voice-types-reference.md), [fx-types-reference.md](fx-types-reference.md), [audiochain.md](audiochain.md), [drums.md](drums.md), [CUTOVER.md](../backend/daisy/CUTOVER.md).

## Backend legend

```mermaid
flowchart LR
  synthCmd["#synth / #play / FX cmds"]
  sab["SharedArrayBuffer control"]
  daisy["DaisySP WASM active"]
  maxi["Maximilian archive/maxi"]
  tone["Tone.js archive/tone"]
  synthCmd --> sab
  sab --> daisy
  tone -.->|"parity reference only"| daisy
  maxi -.->|"archived May 2026"| tone
```

- **DaisySP** (active): monolithic C++ in [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp), [`daisyengine.ts`](../backend/daisy/daisyengine.ts)
- **Maximilian** (archived): [`archive/maxi/`](../archive/maxi/) — generated play code, no longer selectable at runtime
- **Tone** (archived): [`archive/tone/`](../archive/tone/) — parity ground truth; Daisy voice/FX Tone-gated, drums use Daisy-native fixtures

**DaisySP runtime usage:** `Oscillator`, `Adsr` (doot/sparkle/algo operators only), `Decimator`, `Overdrive`, `Svf`, `Phasor`, `DelayLine`, `Chorus`, `WhiteNoise`, `DcBlock`, `OnePole`, `Autowah`, `StringVoice` (`#synth pluck` strike), `ModalVoice` (bells), `Drip`, and (Daisy drums) `AnalogBassDrum`, `SyntheticBassDrum`. **`#synth env`** on play voices uses custom **`ZssLinearEnv`** (linear ADSR, note-on reset, Tone parity) — not DaisySP `Adsr`. **`#synth string`** uses custom SOS ensemble DSP (saws + `Svf`/`OnePole`). **Voice FX bus:** **parallel sends** in `applyfxgroup()` (each FX from same dry; DAW additive mix); return-bus **compressor on wet sum** ([parallel-fx-bus.md](parallel-fx-bus.md)). **Main bus compressor:** Tone-shaped knee in `mastercompressor()` (single 3/150 ms envelope). **Sidechain duck:** custom power-domain envelope on play bus (active). **`#reverb`** uses custom 4-comb + predelay + `tanh(wet × 1.6)` (Maxi match).

---

## Table 1 — Voice types (`SOURCE_TYPE`)

Enum: [`shared/sourcetype.ts`](../shared/sourcetype.ts). Dispatch: `VoiceType` in [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp) (archived Maxi: [`archive/maxi/voiceplaycode.ts`](../archive/maxi/voiceplaycode.ts)).

| ZSS name | Enum | Maxi (archived) | DaisySP WASM | Tone (archived) | Closest [DaisySP feature](https://github.com/electro-smith/DaisySP#-features) | Key files |
|----------|------|------------|--------------|-----------------|-------------------------------------------------------------------------------|-----------|
| `sine`/`square`/…/`fat*` | `SYNTH` | `maxiOsc` + hand-rolled ADSR; AM/FM/PWM/fat | `ZssLinearEnv` + `Oscillator` | `Tone.Synth` + `OmniOscillator` | Subtractive / FM (`Oscillator`, linear env) | `wasmoscplaycode.ts`, `wasmosctype.ts`, cpp `synthsource()` |
| `retro` | `RETRO_NOISE` | LFSR table resample + ADSR | Custom LFSR tables + ADSR | `Sampler` + shelf filters | Noise (custom, not `Whitenoise`) | `noiseplaycode.ts`, `noisewave.ts` |
| `buzz` | `BUZZ_NOISE` | same (different LFSR tap) | same | same | Noise | `noisemeta.ts` |
| `clang` | `CLANG_NOISE` | same | same | same | Noise | same |
| `metallic` | `METALLIC_NOISE` | same + amplitude norm | same | same | Noise | same |
| `hollow` | `HOLLOW_NOISE` | FFT hollow table | same | Error (WASM-only) | Noise (custom spectral) | `noisewave.ts` |
| `noise` | `WHITE_NOISE` | PRNG white table | same | Error (WASM-only) | Whitenoise (custom PRNG) | `noisewave.ts` |
| `bells` | `BELLS` | FM stack + sparkle osc | `ModalVoice` + sparkle FM | `FMSynth` + `MetalSynth` | Physical modeling + FM sparkle | cpp `processvoice()` |
| `doot` | `DOOT` | sine + pitch-decay loop | `Oscillator` + `Adsr` | `MembraneSynth` | Drum / physical (Membrane-like) | `voiceplaycode.ts` `dootvoice()` |
| `algo0`–`algo7` | `ALGO_SYNTH` | 4× osc + 5× ADSR, 8 routings | 4× `Oscillator` + 5× `Adsr` | custom `AlgoSynth` | FM (4-op routing) | `wasmalgoplaycode.ts`, [algosynth.md](algosynth.md) |
| `string` | `STRING_VOICE` (algo 0) | — (Daisy-only) | SOS ensemble (`stringmachinevoice`) | — | Subtractive string-machine | cpp `stringmachinevoice()` |
| `pluck` | `STRING_VOICE` (algo 1) | — (Daisy-only) | `StringVoice` strike | — | Physical modeling | cpp `processvoice()` |
| `drip` | `DRIP_VOICE` | — (Daisy-only) | `Drip` | — | Physical modeling | cpp `processvoice()` |

**SYNTH sub-modes** ([`wasmosctype.ts`](../backend/wasm/wasmosctype.ts)): basic waves, pulse/PWM, AM, FM, fat.

---

## Table 2 — Voice FX (7 types)

Serial wet chain (Maxi + Daisy): **fc → echo → reverb → autofilter → distortion → autowah**. Vibrato is pitch-mod, not in wet chain. See [fx-types-reference.md](fx-types-reference.md).

| ZSS FX | Aliases | Maximilian | DaisySP WASM | Tone | DaisySP module | Swap status | Key files |
|--------|---------|------------|--------------|------|----------------|-------------|-----------|
| `fc` | `fcrush` | Sample-and-hold `fxfcrush()` | `Decimator` | `FrequencyCrusher` worklet | `Decimator` | **Swapped** | `wasmfxplaycode.ts`, cpp |
| `echo` | — | `maxiDelayline` | `DelayLine` | `FeedbackDelay` | `DelayLine` | **Swapped** | `wasmfxplaycode.ts` |
| `reverb` | — | 4-comb + predelay | 4-comb + predelay (custom) | `Reverb` (convolution) | — | **Done** | `wasmfxplaycode.ts`, `zss_daisy_synth.cpp` |
| `autofilter` | — | LFO + biquad | `Svf` + `Phasor` | `AutoFilter` | `Svf`, `Phasor` | **Swapped** | `wasmautofilterplaycode.ts` |
| `vibrato` | — | Pitch cents `playvibratocents()` | Same + `fxvibratolfo` | Wet `Vibrato` in chain | `Oscillator` (LFO) | Keep custom | `wasmvibratoplaycode.ts` |
| `distortion` | `distort` | `tonedistort()` | `Overdrive` | `Distortion` | `Overdrive` | **Swapped** | `wasmfxplaycode.ts` |
| `autowah` | — | Envelope follower + peaking | `Autowah` (heuristic SAB map) | `AutoWah` | `Autowah` | **Done** (Daisy) | `wasmautowahplaycode.ts`, cpp |

**Bus layout:** 4 groups via [`voicefxgroup.ts`](../voicefxgroup.ts). SAB: [`wasmfxstate.ts`](../backend/wasm/wasmfxstate.ts).

---

## Table 3 — Master chain (not voice FX)

| Processor | Role | Maximilian | DaisySP WASM | Tone | DaisySP module | Swap status | Key files |
|-----------|------|------------|--------------|------|----------------|-------------|-----------|
| Sidechain duck | Duck `#play` when bg/TTS/drums hit | Power-domain detector; clap+bass tap | Custom envelope + TTS key | `SidechainCompressor` worklet | Custom | **Active** (Daisy) | `wasmsidechainplaycode.ts`, cpp |
| Main compressor | Bus dynamics | -28 dB / 4:1 / 3 ms / 150 ms | Custom knee compressor | `Tone.Compressor` knee 30 dB | Custom | **Active** (Daisy) | cpp `mastercompressor()` |
| Razzle | Master character | `maxiDelayline` + `maxiOsc` | Manual vibrato delay + `Chorus` + hiss | `Vibrato` + `Chorus` + noise | `Chorus` (partial) | **Partial swap** | `wasmrazzleplaycode.ts` |
| Output safety | Peak control | — | `Limiter` | — | Final clamp | **Done** (Daisy) | cpp `zss_process()` |
| DC block | Master out | — | `DcBlock` | — | `DcBlock` | **Swapped** | cpp `zss_process()` |
| Master trim | Level staging | -2 dB trim + 22 dB makeup | Same | Tone graph gains | **-10 dB trim**, 0 makeup (no comp); play **Tone volumetodb(20)**; drum **play × 1.35** | — | [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp) |

**Sidechain params (Daisy):** threshold −42 dB (power domain), ratio 5:1, attack 5 ms, release 100 ms, mix 0.75, makeup +24 dB; bg/TTS send −12 dB, drum send −28 dB.

**FX bus gain (Daisy):** per-send linear gain from [`wasmfxstate.ts`](../backend/wasm/wasmfxstate.ts) (`on` → 18 or 50 for autofilter/distort/vibrato). Parallel **`wet_sum`** compressed before `dry + wet_sum`. Offline matrix: `yarn test:level-stability --filter fxmatrix`.

```mermaid
flowchart LR
  play["play bus + voice FX"]
  duck["sidechain gain"]
  mix["+ bgplay + TTS + drums"]
  razz["razzle"]
  lim["clamp + dcblock"]
  out["master vol → output"]
  play --> duck --> mix --> razz --> lim --> out
  bg["bgplay"] --> scTrigger["sidechain trigger"]
  tts["TTS"] --> scTrigger
  drums["drums clap+bass tap"] --> scTrigger
  scTrigger --> duck
  bg --> mix
  tts --> mix
  drums --> mix
```

---

## Table 4 — Drums (10 IDs)

**Daisy backend:** [DaisySP Drums](https://github.com/electro-smith/DaisySP/tree/master/Source/Drums/) where classes exist; unmatched IDs stay custom. **Maximilian** keeps Tone-parity kit in [`drumplaycode.ts`](../backend/wasm/drumplaycode.ts).

| ID | Drum | Maximilian | DaisySP WASM | Tone | DaisySP class | Swap status | Key files |
|----|------|------------|--------------|------|---------------|-------------|-----------|
| 0 | Tick | Noise + hipass | Custom noise + EQ | `NoiseSynth` + filter | — | **Keep custom** | `drumplaycode.ts`, cpp `drumtick()` |
| 1 | Tweet | longer noise hat | Custom noise + EQ | same | — | **Keep custom** | cpp `drumtweet()` |
| 2 | Cowbell | dual square + bandpass | Custom | `PolySynth` | — | Keep custom | `drumcowbell()` |
| 3 | Clap | noise + EQ chain | `WhiteNoise` + EQ | `NoiseSynth` + EQ | `WhiteNoise` (source) | **Partial swap** | `drumclap()`; sidechain tap |
| 4 | Hi snare | osc + noise + distort | Custom (WASM parity) | same | Custom | **Done** (Daisy) | same |
| 5 | Hi woodblock | clack + donk | Custom | bandpass stack | — | Keep custom | `drumwoodblock(true)` |
| 6 | Low snare | lower freq snare | Custom (WASM parity) | same | Custom | **Done** (Daisy) | same |
| 7 | Low tom | pitch glide tom | `SyntheticBassDrum` tom substitute | saw/tri/noise glide | `SyntheticBassDrum` | Migrated | same |
| 8 | Low woodblock | lower woodblock | Custom | same | — | Keep custom | `drumwoodblock(false)` |
| 9 | Bass | membrane-style kick | `AnalogBassDrum` | `MembraneSynth` | `AnalogBassDrum` | Migrated | same; sidechain tap |

**Parity:** Maximilian drums vs Tone. Daisy drums vs Daisy-native fixtures (not Tone).

---

## Table 5 — DaisySP modules: linked vs used

| DaisySP category | Used in ZSS runtime | Notes |
|------------------|---------------------|-------|
| `Oscillator` | Yes | Voices, FX LFOs, razzle vibrato/hiss, custom drums |
| `Adsr` | Yes | Gated voices/algo |
| `Decimator`, `Overdrive`, `Svf`, `Phasor` | Yes | Voice FX (Tier 1–2 swaps) |
| `DelayLine` | Yes | Echo FX |
| `Chorus` | Yes | Razzle chorus half |
| `WhiteNoise` | Yes | Drum noise source (tick/tweet/clap paths via `drumnoise()`) |
| `Limiter`, `DcBlock` | Yes | Master output chain |
| `StringVoice` (`pluck` only) | Yes | `#synth pluck` strike mode; `#synth string` uses custom ensemble DSP |
| `AnalogBassDrum`, `SyntheticBassDrum` | Yes | Daisy backend drums (bass + tom) |
| `Compressor` (LGPL) | Yes | Daisy main bus only |
| `HiHat` | No | Reverted — tick/tweet kept custom |
| `SyntheticSnareDrum` | No | Fallback if AnalogSnare presets insufficient |
| `Fm2`, etc. | No | Future candidates (`KarplusString` / `Drip` wired — see Table 1) |

---

## Table 6 — DaisySP swap opportunities (Daisy backend)

**Feasibility:** Easy = refactor · Medium = param mapping · Hard = breaks Tone gate · N/A = no module

### Voice FX

| ZSS custom | DaisySP candidate | Feasibility | Swap status | Notes |
|------------|-------------------|-------------|-------------|-------|
| `fxfcrush()` | `Decimator` | Medium | **Done** | Rate reduction only; no bitcrush |
| `fxecho()` | `DelayLine` | Easy | **Done** | Ring buffer removed |
| `fxreverb()` | 4-comb + predelay | Low | **Done** | Same topology WASM + Daisy; Tone uses convolution |
| `fxautofilterbus()` | `Svf` + `Phasor` | Medium | **Done** | Bandpass sweep |
| `tonedistort()` | `Overdrive` | Hard | **Done** | Different curve (accepted) |
| `fxautowahbus()` | `Autowah` | Hard | **Done** (Daisy) | Heuristic map: octaves→SetWah, gain→SetLevel, sensitivity→input boost |
| Vibrato pitch cents | `PitchShifter` | Hard | Keep custom | Source pitch mod, not wet delay |

### Master chain

| ZSS custom | DaisySP candidate | Feasibility | Swap status |
|------------|-------------------|-------------|-------------|
| Sidechain + compressor | Custom envelope | — | Partial | Daisy: full-mix detect + 30 dB knee; sidechain matches Tone worklet |
| Razzle chorus | `Chorus` | Medium | **Done** (vibrato/hiss manual) |
| Output safety | `Limiter` | Easy | **Done** |
| DC offset | `DcBlock` | Easy | **Done** |

### Drums

| ZSS drum | DaisySP class | Swap status |
|----------|---------------|-------------|
| 0–1 Tick/Tweet | — | **Keep custom** (HiHat reverted) |
| 4, 6 Snares | `AnalogSnareDrum` | Migrated |
| 9 Bass | `AnalogBassDrum` | Migrated |
| 7 Tom | `SyntheticBassDrum` | Migrated |
| 3 Clap noise source | `WhiteNoise` | **Done** (EQ chain kept) |
| 2, 5, 8 | — | Keep custom |

### Build gaps (future)

| Module | Source | Enables |
|--------|--------|---------|
| LGPL `Compressor` | DaisySP-LGPL | Daisy main bus dynamics (linked) |

---

## Primary source files

| Topic | Path |
|-------|------|
| Voice types | [`shared/sourcetype.ts`](../shared/sourcetype.ts), [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp) |
| Archived Maxi voices | [`archive/maxi/voiceplaycode.ts`](../archive/maxi/voiceplaycode.ts) |
| Daisy FX | C++ FX modules in [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp), [`wasmfxstate.ts`](../backend/wasm/wasmfxstate.ts) |
| Daisy master | C++ master chain in [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp) |
| Archived Maxi drums | [`archive/maxi/drumplaycode.ts`](../archive/maxi/drumplaycode.ts) |
| Daisy DSP | [`zss_daisy_synth.cpp`](../backend/daisy/native/zss_daisy_synth.cpp) |
| Daisy build | [`build-daisy.sh`](../backend/daisy/native/build-daisy.sh) |
| Backend factory | [`synthbackendfactory.ts`](../backend/synthbackendfactory.ts) |
| Firmware | [`firmware/audio.ts`](../../firmware/audio.ts) |

---

## Summary A — DaisySP migrations

### Phase 1 — drums (prior)

| Category | ZSS feature | DaisySP module | Status |
|----------|-------------|----------------|--------|
| Drums | Tick (0), Tweet (1) | — | **Keep custom** (HiHat reverted) |
| Drums | Hi snare (4), Low snare (6) | `AnalogSnareDrum` | Migrated |
| Drums | Bass (9) | `AnalogBassDrum` | Migrated |
| Drums | Low tom (7) | `SyntheticBassDrum` | Migrated (tom substitute) |
| Drums | Cowbell, woodblocks (2,5,8) | — | Keep custom |
| Voices | Core 10 `SOURCE_TYPE` families | `Oscillator`, `Adsr` | Already in use |

### Phase 2 — FX + master (implemented)

| Category | ZSS feature | DaisySP module | Status |
|----------|-------------|----------------|--------|
| FX | Echo | `DelayLine` | **Done** |
| FX | FC crush | `Decimator` | **Done** |
| FX | Autofilter | `Svf` + `Phasor` | **Done** |
| FX | Distortion | `Overdrive` | **Done** |
| FX | Autowah | `Autowah` | **Done** (Daisy) |
| Master | Razzle chorus | `Chorus` | **Done** (partial) |
| Master | Output safety | `Limiter` | **Done** |
| Master | DC block | `DcBlock` | **Done** |
| Drums | Clap/tick/tweet noise | `WhiteNoise` | **Done** (EQ kept) |

**Not migrating:** Maximilian reverb (4-comb), Maximilian master/sidechain (custom), noise voices, doot, algo synth.

---

## Summary B — New voice types (Physical Modeling)

| Proposed `#synth` name | DaisySP class | Status | Build deps |
|------------------------|---------------|--------|--------------|
| `string` | SOS ensemble (saws + Svf) | **Done** (Daisy-only, algo 0) | `detune`/`pwm`/`vib`/`filter` via SAB slots 6–9 |
| `pluck` | `StringVoice` | **Done** (Daisy-only, algo 1) | `structure`/`brightness`/`damping`/`accent` via SAB |
| `bells` | `ModalVoice` + sparkle FM | **Done** (Daisy `BELLS` slot) | `modalvoice.cpp`, `resonator.cpp` |
| `drip` | `Drip` | **Done** (Daisy-only) | `drip.cpp` |

```mermaid
flowchart TB
  subgraph phase1 [Phase 1 drums]
    snare["Snare Bass Tom"]
    custom["Tick Tweet Cowbell Woodblock"]
  end
  subgraph phase2 [Phase 2 FX master]
    fx["DelayLine Decimator Overdrive Svf"]
    master["Chorus Limiter DcBlock"]
  end
  subgraph phase2voices [Phase 2 new voices]
    sv["StringVoice"]
    mv["ModalVoice"]
  end
  phase1 --> doc["implementation-matrix.md"]
  phase2 --> doc
  phase2voices --> doc
```

Recommendation: core simplify-first swaps are complete; optional follow-ups include `Fm2`, bitcrush on `Decimator`, and LGPL `Compressor`.
