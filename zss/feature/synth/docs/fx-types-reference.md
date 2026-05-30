# Voice FX types, config params, and WASM vs Tone defaults

Reference catalog for all ZSS voice FX (`#echo`, `#reverb`, `#fcrush`, etc.). **Not in scope:** master-chain FX (sidechain, compressor, razzle).

See also: [voice-types-reference.md](voice-types-reference.md), [voicefx.md](voicefx.md).

---

## Seven voice FX types

| FX name(s) | Effect | Tone class / impl | WASM impl |
|------------|--------|-------------------|-----------|
| `fc`, `fcrush` | Frequency crusher | Custom `FrequencyCrusher` worklet | Sample-and-hold `fxfcrush()` |
| `echo` | Delay + feedback | `FeedbackDelay` | `maxiDelayline` `fxecho()` |
| `reverb` | Convolution reverb | `Reverb` | 4-comb + predelay `fxreverb()` |
| `autofilter` | LFO filter sweep | `AutoFilter` | LFO + biquad `fxautofilterbus()` |
| `vibrato` | Pitch wobble | `Vibrato` (wet in FX chain) | Pitch cents `playvibratocents()` — **not serial wet** |
| `distort`, `distortion` | Waveshaper | `Distortion` | `tonedistort()` / `fxdistortwet()` |
| `autowah` | Envelope filter | `AutoWah` | Follower + peaking `fxautowahbus()` |

Aliases: `fcrush`→`fc`, `distort`→`distortion`.

---

## Global send controls (all FX, all buses)

| Config | Behavior |
|--------|----------|
| `on` | Enable send (preset level below) |
| `off` | Mute send |
| `0–100` (number) | Send level via `volumetodb(v) = 20·log10(v) − 35` |

**`on` preset levels** ([voicefx/index.ts](../archive/tone/voicefx/index.ts), [wasmfxstate.ts](../backend/wasm/wasmfxstate.ts)):

| FX | Tone `on` | WASM `on` |
|----|-----------|-----------|
| `vibrato`, `autofilter` | **50** | **50** |
| `distortion` | **18** | **50** |
| `echo`, `reverb`, `fc`, `autowah` | **18** | **18** |

Default send at boot: **0** (all FX off).

---

## Architecture: routing and param scope

| Aspect | Tone (archived) | WASM (active) |
|--------|-----------------|---------------|
| Send buses | **2** (play vs bgplay+tts) | **4** (echo1–4) |
| Effect **parameters** | **Global** shared `FXCHAIN` | **Per bus** SAB param block |
| Effect **send level** | Per bus via `Channel.volume` | Per bus via SAB send slot |
| Vibrato | Wet delay in FX chain | Pitch modulation (groups 0–2 only) |

### 4-bus mapping (WASM + firmware)

| Group | Suffix | Audio source |
|-------|--------|--------------|
| 0 | `*1` | `#play` voices 0–1 |
| 1 | `*2` | `#play` voices 2–3 |
| 2 | `*3` | `#bgplay` voices 4–7 |
| 3 | `*4` | TTS input |

Bare `#echo`, `#reverb`, etc. → groups **0 and 1** only. `#echo1`…`#echo4` → single group.

**WASM serial chain** ([wasmfxplaycode.ts](../backend/wasm/wasmfxplaycode.ts)): fc → echo → reverb → autofilter → distortion → autowah (vibrato skipped — pitch only).

---

## Per-FX reference

### 1. `fc` / `fcrush`

| Param | Tone default | WASM default |
|-------|--------------|--------------|
| `rate` | **32** (ZSS reset); **64** Tone class | **32** |
| send `on` | 18 | 18 |

Range: Tone worklet **1–512**. WASM: `rate ≤ 1` → **1**.

### 2. `echo`

| Param | Tone default | WASM default |
|-------|--------------|--------------|
| `delaytime` | ZSS: **`'8n'`**; Tone lib: **0.25 s** | `tonenotationseconds('8n')` |
| `feedback` | ZSS: **0.666**; Tone lib: **0.125** | **0.666** |
| send `on` | 18 | 18 |

WASM fallbacks: delay ≤ 0.0001 → **0.22 s**; feedback clamped **0–0.95**.

### 3. `reverb`

| Param | Tone default | WASM default |
|-------|--------------|--------------|
| `decay` | ZSS: **2.5**; Tone lib: **1.5** | **2.5** |
| `predelay` | **0.01** | **0.01** |
| send `on` | 18 | 18 |

WASM: custom 4-comb topology (not Tone convolution).

### 4. `autofilter`

| Param | Tone (ZSS reset) | WASM default | Notes |
|-------|------------------|--------------|-------|
| `frequency` | **3** | **3** | LFO rate (Hz) |
| `depth` | **0.5** | **0.5** | |
| `octaves` | **5** | **5** | |
| `q` | **1** | **1** | |
| `type` | lowpass | **0** = lowpass | WASM: 8 filter types |
| `basefrequency` | not in `#synth` API | **200** | **WASM-only** config key |
| send `on` | **50** | **50** | |

### 5. `vibrato`

| Param | Tone (ZSS reset) | WASM default | Notes |
|-------|------------------|--------------|-------|
| `maxdelay` | **0.5** | **0.02** | Major divergence |
| `depth` | not in `#synth` API | **0** | **WASM-only** |
| `frequency` | not in `#synth` API | **5** | **WASM-only** |
| send `on` | **50** | **50** | |

**Tone:** wet delay in FX chain. **WASM:** pitch cents on gated voices; auto-targets depth **0.5** when send on but depth ≈ 0. Group 3 (TTS) never gets vibrato pitch mod.

### 6. `distort` / `distortion`

| Param | Tone default | WASM default |
|-------|--------------|--------------|
| `distortion` | **0.4** | **0.4** |
| `oversample` | **`'none'`** | **N/A (Tone-only)** |
| send `on` | **18** | **50** |

### 7. `autowah`

| Param | Tone default | WASM default |
|-------|--------------|--------------|
| `basefrequency` | **100** | **100** |
| `octaves` | **6** | **6** |
| `sensitivity` | **0** | **0** |
| `gain` | **2** dB | **2** dB |
| `follower` | **0.2** s | **0.2** s |
| `Q` | **2** (internal) | **2** hardcoded |
| send `on` | 18 | 18 |

Tone: all buses share one `FXCHAIN.autowah` — param changes affect every bus.

**Daisy WASM:** uses `daisysp::Autowah` (soundpipe). `octaves` → `SetWah`, `gain` → `SetLevel`, `sensitivity` → input pre-gain. `basefrequency` and `follower` are no-ops on Daisy (Maximilian keeps full Tone-style biquad follower).

---

## WASM SAB param slots (per group)

| Idx | Param | Default |
|-----|-------|---------|
| 0 | echo delaytime | `tonenotationseconds('8n')` |
| 1 | echo feedback | 0.666 |
| 2 | reverb decay | 2.5 |
| 3 | reverb predelay | 0.01 |
| 4 | fc rate | 32 |
| 5 | distortion | 0.4 |
| 6 | autofilter frequency | 3 |
| 7 | autofilter depth | 0.5 |
| 8 | vibrato maxdelay | 0.02 |
| 9 | autowah sensitivity | 0 |
| 10 | vibrato depth | 0 |
| 11 | vibrato frequency | 5 |
| 12 | autowah basefrequency | 100 |
| 13 | autowah octaves | 6 |
| 14 | autowah gain | 2 |
| 15 | autowah follower | 0.2 |
| 16 | autofilter basefrequency | 200 |
| 17 | autofilter octaves | 5 |
| 18 | autofilter q | 1 |
| 19 | autofilter type | 0 (lowpass) |

Sends: 7 slots per group (fc, echo, reverb, autofilter, vibrato, distortion, autowah). All default **0**.

Full layout: [wasmfxstate.ts](../backend/wasm/wasmfxstate.ts).

---

## Tone.js library defaults vs ZSS overrides

ZSS [fx.ts](../archive/tone/fx.ts) `applyreset()` overrides Tone library defaults:

```
reverb:     wet 0.5, decay 2.5, preDelay 0.01
echo:       wet 0.5, delayTime '8n', feedback 0.666
autofilter: wet 0.5, depth 0.5, frequency 3, octaves 5
distortion: wet 1, oversample 'none'
vibrato:    wet 1, depth 0, maxDelay 0.5
fc:         wet 1, rate 32
autowah:    wet 1 (+ Tone AutoWah.getDefaults() for params)
```

Tone.js library `getDefaults()` when ZSS does not override: FeedbackDelay delay **0.25** / feedback **0.125**; Reverb decay **1.5**; AutoFilter baseFrequency **200** / octaves **2.6**; Vibrato maxDelay **0.005** / depth **0.1**; Distortion **0.4**; AutoWah as above; FrequencyCrusher rate **64**.

Sources: [Tone.js effect source](https://github.com/Tonejs/Tone.js/tree/dev/Tone/effect).

---

## Backend parity summary

| Topic | Tone | WASM |
|-------|------|------|
| Send buses | 2 | 4 |
| Param scope | Global FXCHAIN | Per-bus SAB |
| `distortion oversample` | Yes | No |
| `autofilter basefrequency` | Not in API | Yes |
| `vibrato depth`, `frequency` | Not in API | Yes |
| Vibrato mechanism | Wet delay | Pitch cents |
| Reverb algorithm | Convolution | Custom comb |

---

## Command quick reference

```
Global send:  on | off | 0-100

Per-bus:      echo1-4, reverb1-4, fcrush1-4, autofilter1-4,
              distort1-4, vibrato1-4, autowah1-4

Play-wide:    echo, reverb, fcrush, autofilter, distort, vibrato, autowah
              (groups 0 + 1 only)
```

---

## Primary source files

| Topic | Path |
|-------|------|
| WASM SAB + config | [wasmfxstate.ts](../backend/wasm/wasmfxstate.ts) |
| WASM DSP chain | [wasmfxplaycode.ts](../backend/wasm/wasmfxplaycode.ts) |
| Bus mapping | [voicefxgroup.ts](../voicefxgroup.ts) |
| Firmware commands | [firmware/audio.ts](../../firmware/audio.ts) |
| Tone FX chain | [archive/tone/fx.ts](../archive/tone/fx.ts) |
| Tone voicefx dispatch | [archive/tone/voicefx/index.ts](../archive/tone/voicefx/index.ts) |
