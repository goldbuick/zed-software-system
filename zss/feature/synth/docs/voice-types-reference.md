# Voice types, config params, and WASM vs Tone defaults

Reference catalog for all ZSS `#synth` voice types. **Origin legend:** **ZSS** = explicit in ZSS source; **Tone** = Tone.js `getDefaults()` / instrument defaults; **WASM-play** = hardcoded in generated play code, not `#synth`-settable.

See also: [fx-types-reference.md](fx-types-reference.md), [voiceconfig.md](voiceconfig.md).

## How voices are addressed

| Command | Voice indices | Role |
|---------|---------------|------|
| `#synth …` | 0–3 | `#play` voices |
| `#synth1`–`#synth4` | 0–3 individually | Per play voice |
| `#synth5 …` | 4–7 | `#bgplay` voices |

Config path: `#synth` → [audio.ts](../../firmware/audio.ts) `handlesynthvoice` → `synthvoice` → backend `setvoiceconfig` → WASM [wasmvoiceconfig.ts](../backend/wasm/wasmvoiceconfig.ts) or Tone [voiceconfig/index.ts](../archive/tone/voiceconfig/index.ts).

---

## 10 internal voice families (`SOURCE_TYPE`)

| `#synth` name | Enum | Tone backend | WASM backend |
|---------------|------|--------------|--------------|
| *(osc wave names)* | `SYNTH` | Yes | Yes |
| `retro` | `RETRO_NOISE` | Yes | Yes |
| `buzz` | `BUZZ_NOISE` | Yes | Yes |
| `clang` | `CLANG_NOISE` | Yes | Yes |
| `metallic` | `METALLIC_NOISE` | Yes | Yes |
| `bells` | `BELLS` | Yes | Yes |
| `doot` | `DOOT` | Yes | Yes |
| `algo0`–`algo7` | `ALGO_SYNTH` | Yes | Yes |
| `hollow` | `HOLLOW_NOISE` | **Error** (WASM-only message) | Yes |
| `noise` | `WHITE_NOISE` | **Error** (WASM-only message) | Yes |

---

## Global params (apply across voice types)

| Param | Aliases | Value | Tone default | WASM default | Notes |
|-------|---------|-------|--------------|--------------|-------|
| `restart` | — | — | Full `applyreset()` | Resets all 8 voices + osc + algo + FX SAB | Tone: [source.ts](../archive/tone/source.ts); WASM: [maxisynth.ts](../backend/wasm/maxisynth.ts) |
| `vol` / `volume` | — | number (dB) | **Tone**: instrument volume from `get()` snapshot | **`0` dB** | All 10 WASM voice types via `zss_voicecfg` slot 5 |
| `port` / `portamento` | — | number (seconds) | **Tone**: `0` (Monophonic) | `0` | Only `SYNTH` + `ALGO_SYNTH`; error on retro in Tone |
| `env` / `envelope` | — | `[a, d, s, r]` | See per-type below | `0.01, 0.01, 0.5, 0.01` (**Tone ZSS reset**) | WASM: [wasmvoicecfgsab.ts](../backend/wasm/wasmvoicecfgsab.ts) |

**Boot / `#synth` no-args / memory default wave:** `square` (**ZSS**, [synthdefaults.ts](../synthdefaults.ts)) on both backends.

**Tone `Synth` library defaults** (before ZSS reset overrides): osc `triangle`, envelope `0.005 / 0.1 / 0.3 / 1`, portamento `0`.

**Tone after ZSS `applyreset()` on SYNTH:** osc `square`, envelope `0.01 / 0.01 / 0.5 / 0.01` (**ZSS**).

---

## 1. SYNTH — oscillator voices

Selecting any validated wave name switches voice to `SYNTH`. Names validated by [validation.ts](../voiceconfig/validation.ts).

### Wave name families

| Family | Examples | Partial suffix |
|--------|----------|----------------|
| Basic | `sine`, `square`, `triangle`, `sawtooth`, `custom` | `custom3`, `sine2` require array value |
| Shaped | `pulse`, `pwm` | — |
| AM | `amsine`, `amsquare`, `amtriangle`, `amsawtooth` | `amsquare3` + array |
| FM | `fmsine`, `fmsquare`, `fmtriangle`, `fmsawtooth` | `fmsquare8` + array |
| Fat | `fatsine`, `fatsquare`, `fattriangle`, `fatsawtooth` | `fatsawtooth4` + array |

`custom` maps to square carrier in WASM ([wasmosctype.ts](../backend/wasm/wasmosctype.ts)).

### Config params by oscillator kind

| Osc kind | `#synth` params | WASM default | Tone default (when applicable) |
|----------|-----------------|--------------|--------------------------------|
| **All SYNTH** | `env` / `envelope`, `port` / `portamento` | env above; port `0` | Tone reset env `0.01/0.01/0.5/0.01`; port `0` |
| **sine/square/triangle/sawtooth/custom** | `phase` | `0` | **Tone** Oscillator: `0` |
| **pulse** | `width` | `0.2` | **Tone** PulseOscillator: `0.2` |
| **pwm** | `modfreq`, `modulationfrequency` | `1` | **Tone** PWMOscillator: `1` Hz (range 0.1–5) |
| **am\*** | `harmonicity`, `modtype`/`modulationtype`, `modenv`/`modulationenvelope` | harm `1`, modtype `square`, modenv `0.01/0.01/1/0.5` | **Tone** AMOscillator: harm `1`, modtype `square` |
| **fm\*** | `harmonicity`, `modindex`, `modtype`, `modenv` | harm `1`, modindex `2`, modtype `square`, modenv `0.01/0.01/1/0.5` | **Tone** FMOscillator: harm `1`, modindex `2`, modtype `square` |
| **fat\*** | `count`, `phase`, `spread` | count `3`, phase `0`, spread `20` | **Tone** FatOscillator class default: count `3`, spread `20`, type `sawtooth`; **`fatsine` stacks sines** (OmniOscillator suffix) |
| **Partials** | array value or trailing numbers | partialcount `0`, 8 zeros | **Tone**: partials `[]`, partialCount `0` |

WASM osc defaults: [wasmoscconfigsab.ts](../backend/wasm/wasmoscconfigsab.ts) `DEFAULT_WASM_OSC_CONFIG`.

**WASM play-code fallbacks** (when SAB value is 0): width `0.2`, modindex `2`, harmonicity `1`, fat count `3`, spread `20` ([voiceplaycode.ts](../backend/wasm/voiceplaycode.ts)).

### WASM vs Tone — SYNTH summary

| Aspect | Tone | WASM |
|--------|------|------|
| Default boot wave | `square` (ZSS reset) | `square` |
| Default envelope | `0.01/0.01/0.5/0.01` after reset | `0.01/0.01/0.5/0.01` |
| Pulse width default | `0.2` (Tone lib) | `0.2` |
| FM modtype default | `square` | `square` |
| Per-voice volume | Supported (`vol`) | Supported (`vol` / `volume`, all types) |
| Partial waves | Tone OmniOscillator | Same command surface |

---

## 2. Noise voices — `retro`, `buzz`, `clang`, `metallic`, `noise`, `hollow`

### User-configurable

| Param | Tone | WASM |
|-------|------|------|
| Type selection | Yes (except `noise`/`hollow` error) | Yes (all six) |
| `env` / `envelope` | Yes | Yes |
| `port` | Error on retro | Ignored (not applied) |
| Osc/algo params | No | No |

### Tone-only fixed params (at source creation, [source.ts](../archive/tone/source.ts))

| Param | retro/buzz/clang/metallic |
|-------|---------------------------|
| Sampler volume | `-44` dB (**ZSS**) |
| filter1 | lowshelf, gain `-32`, freq `440` (**ZSS**) |
| filter2 | highshelf, gain `32`, freq `440` (**ZSS**) |
| Reset envelope | `0.01 / 0.01 / 0.5 / 0.01` (**ZSS**) |

LFSR tap differences per type are in `generatenoisesynth()` (not user-configurable).

### WASM-only fixed meta ([noisemeta.ts](../backend/wasm/noisemeta.ts)) — not `#synth`-settable

| Type | basepitch | pitchfiltermult | issoft | expression |
|------|-----------|-----------------|--------|------------|
| `retro` | 69 | 1024 | false | 0.25 |
| `buzz` | 69 | 1024 | false | 0.3 |
| `clang` | 69 | 1024 | false | 0.4 |
| `metallic` | 69 | 1024 | false | 0.4 |
| `hollow` | 96 | 1.0 | true | 1.5 |
| `noise` | 69 | 8.0 | true | 1.0 |

Default envelope: same WASM global `0.01/0.01/0.5/0.01`.

---

## 3. `bells` (`BELLS`)

### User-configurable

| Param | Tone | WASM |
|-------|------|------|
| `env` / `envelope` | Yes (FMSynth carrier envelope) | Yes (drives `bellenvs` only) |
| FM params | Via Tone FMSynth API, **not** exposed as `#synth` keys | **Not configurable** |

### Tone fixed at creation + reset ([source.ts](../archive/tone/source.ts))

**Main FMSynth (after ZSS reset):** harmonicity `1.5`, modulationIndex `30`, carrier `sine`, modulator `square`, envelope `0.01/3/0.3/6`, modulationEnvelope `0.5/1/0.2/4`.

**Sparkle MetalSynth (fixed, not reset):** volume `-16` dB, envelope `0.001/1.4/0/0.321`, harmonicity `5.1`, modulationIndex `32`, resonance `4000`, octaves `1.5`.

**Tone FMSynth library baseline:** ModulationSynth defaults — harmonicity `3`, modulationIndex `10`.

### WASM hardcoded in play code ([voiceplaycode.ts](../backend/wasm/voiceplaycode.ts))

Bell FM: harm `1.5`, modindex `30`, envelope init → **0.01/3/0.3/6** s. Sparkle: harm `5.1`, modindex `32`, envelope → **0.001/1.4/0/0.321** s. Output `× 0.35`.

`#synth env` overrides bell carrier envelope only; sparkle envelope is **WASM-play fixed**.

---

## 4. `doot` (`DOOT` / MembraneSynth)

### User-configurable

| Param | Tone | WASM |
|-------|------|------|
| `env` / `envelope` | Yes | Yes (drives `dootenvs`) |
| `port` | Ignored | Ignored |

### Tone defaults (MembraneSynth.getDefaults)

envelope `0.001/0.4/0.01/1.4`, osc `sine`, octaves `8`, pitchDecay `0.05`. ZSS `applyreset()` for doot: full Tone snapshot, no ZSS overrides.

### WASM play code

Init envelope → **0.001/0.4/0.01/1.4** s, pitch decay `× 0.9993`/sample while gated, output `× 0.6`. `octaves` and `pitchDecay` are **not** `#synth`-configurable on either backend.

---

## 5. `algo0`–`algo7` (`ALGO_SYNTH`)

### User-configurable (both backends)

| Param | Aliases | Sets |
|-------|---------|------|
| `harmonicity` | — | all three harmonicities |
| `harmonicity1`–`3` | — | per modulator |
| `modindex` | — | all three mod indices |
| `modindex1`–`3` | — | per modulator |
| `osc1`–`osc4` | — | operator wave |
| `env1`–`env4` | `envelope1`–`4` | per-operator ADSR |
| `port` / `portamento` | — | glide |

### Defaults (ZSS AlgoSynth + WASM mirror)

algorithm via `algoN` name; harmonicity1/2/3 `2`; modindex1/2/3 `1`; osc1–4 `sine`; env1–4 `0.01/0.01/1/0.5`; operator volume `-10` dB.

### Critical WASM vs Tone difference

Voice-level `env` / `envelope` is **ignored** on WASM for algo voices — use `env1`–`env4`.

---

## Command quick reference

```
Global:     restart | vol/volume | port/portamento | env/envelope

Sources:    retro | buzz | clang | metallic | bells | doot
            algo0 … algo7
            noise | hollow          (WASM only; Tone errors)

Osc types:  sine | square | triangle | sawtooth | custom | pwm | pulse
            (am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*

Osc params: phase | width | modfreq/modulationfrequency
            harmonicity | modindex | modtype/modulationtype
            modenv/modulationenvelope | count | spread
            (+ array partials as value)

Algo:       harmonicity | harmonicity1-3 | modindex | modindex1-3
            osc1-osc4 | env1-4 | envelope1-4
```

---

## Backend parity summary

| Topic | Tone (archived) | WASM (active) |
|-------|-----------------|---------------|
| Voice types | 8 creatable; `noise`/`hollow` error | All 10 types |
| `#synth` no args | Applies `square` wave only | Same; full reset is `#synth restart` |
| Default envelope | `0.01/0.01/0.5/0.01` on reset | `0.01/0.01/0.5/0.01` |
| Per-voice volume | Yes | Yes (all 10 types) |
| Algo voice envelope | Per-operator + outer | Per-operator + outer (`algooutenvs`) |
| Config storage | Tone instrument state | SAB arrays pushed to worklet |

---

## Primary source files

| Topic | Path |
|-------|------|
| Command parsing | [firmware/audio.ts](../../firmware/audio.ts) |
| Type validation | [voiceconfig/validation.ts](../voiceconfig/validation.ts) |
| WASM voice routing | [wasmvoiceconfig.ts](../backend/wasm/wasmvoiceconfig.ts) |
| WASM play behavior | [voiceplaycode.ts](../backend/wasm/voiceplaycode.ts) |
| Tone voice config | [archive/tone/voiceconfig/index.ts](../archive/tone/voiceconfig/index.ts) |
| Tone source creation | [archive/tone/source.ts](../archive/tone/source.ts) |
