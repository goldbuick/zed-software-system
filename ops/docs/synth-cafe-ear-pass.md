# Synth cafe-ear pass

Manual listen checklist for every **live-selectable** Daisy `#synth` voice and its key params. Use when validating OmniOscillator parity, after `ops:daisy:build`, or when moving machines.

Parity target: archive `Tone.Synth` + OmniOscillator type strings (not MonoSynth; not FMSynth — that was bells only). Confidence matrix: [`zss/feature/synth/docs/(catalog)/voice-types-reference.md`](../zss/feature/synth/docs/(catalog)/voice-types-reference.md).

## Setup

1. Cafe running (`yarn task cafe` / `./task cafe dev`).
2. After native/Daisy changes: `yarn task run ops:daisy:build`, then **hard-refresh** the browser.
3. Report each step as `pass` / `fail` / `unclear` (one line). On fail, note heard vs expected.

### Notation

Digits in `#play` are **drums**, not duration or octave.

| Use | Meaning |
|-----|---------|
| `#play qc` | Quarter-note C4 (default octave) |
| `#play hc` | Half-note C4 |
| `#play qceg` | Quarter C D E G |
| `#play qcde` | Short run |

### Session protocol (every voice)

1. `#synth restart`
2. `#synth <type>` (and setup params)
3. Baseline `#play qc`
4. Change one param; `#play` again — expect a clear difference
5. Wave select **reseeds** Omni family defaults (`seedomnioscdefaults`) and clears partials. SOS named types still keep family blobs across hops.

Shared checks (when the voice supports them):

```text
#synth vol -12
#play qc
#synth vol 0
#synth env 0.5 0.2 0.2 0.5
#play qc
```

`#synth port 0.3` only on SYNTH / ALGO / violin:

```text
#synth port 0.3
#play qceg
```

---

## Batch 1 — SYNTH oscillator (OmniOscillator)

### 1.1 basic waves (must sound distinct)

```text
#synth restart
#synth square
#play qc
#synth sine
#play qc
#synth triangle
#play qc
#synth sawtooth
#play qc
```

Optional phase (degrees; 180 = half cycle):

```text
#synth restart
#synth square
#synth phase 0
#play qc
#synth phase 180
#play qc
```

### 1.2 pulse width

```text
#synth restart
#synth pulse
#synth width 0.1
#play qc
#synth width 0.5
#play qc
```

### 1.3 pwm modfreq (rate change, not FM)

```text
#synth restart
#synth pwm
#synth modfreq 2
#play qc
#synth modfreq 8
#play qc
```

### 1.4 AM carrier + harmonicity (+ modenv)

```text
#synth restart
#synth amsine
#play qc
#synth amsquare
#play qc
#synth harmonicity 0.5
#play qc
#synth harmonicity 2
#play qc
#synth modenv 0.5 0.2 0.2 0.5
#play hc
```

### 1.5 FM carrier + harmonicity + modindex (+ modenv)

Tone FMOscillator law: `f ≈ fc*(1+I*m)`. Daisy advances carrier phase with signed Hz (through-zero; not `|f|`).

```text
#synth restart
#synth fmsine
#play qc
#synth fmsquare
#play qc
#synth harmonicity 0.5
#play qc
#synth harmonicity 2
#play qc
#synth modindex 1
#play hc
#synth modindex 8
#play hc
#synth modenv 0.01 0.01 1 0.5
#play qc
#synth modenv 0.5 0.2 0.1 0.5
#play hc
```

Reseed check (harmonicity should reset to 1 after re-select):

```text
#synth restart
#synth fmsquare
#synth harmonicity 11
#synth sine
#synth fmsquare
#play qc
```

### 1.6 fat unison

```text
#synth restart
#synth fatsquare
#play qc
#synth fatsine
#play qc
#synth fatsquare
#synth count 2
#play qc
#synth count 8
#play qc
#synth spread 5
#play qc
#synth spread 40
#play qc
```

### 1.7 partials (basic only; cleared on typed wave)

Partials on basic waves are a **sine stack** (not "square plus harmonics"). Contrast is easier as four plays:

```text
#synth restart
#synth square
#play qc
#synth square 1 0.5 0.25
#play qc
#synth fmsquare
#play qc
#synth square
#play qc
```

| Play | Expect |
|------|--------|
| 1 plain `#synth square` | Hard square buzz |
| 2 `#synth square 1 0.5 0.25` | Softer organ-ish (1f+2f+3f sines) — **must differ from play 1** |
| 3 `#synth fmsquare` | FM grit like step 1.5 — **must not still be the organ stack** |
| 4 `#synth square` again | Hard square again (wave select cleared partials) |

---

## Batch 2 — Noise / bells / doot

For each: restart → type → `#play qc`; then short vs long `env`.

### 2.1 Noise family

```text
#synth restart
#synth retro
#play qc
#synth env 0.001 0.05 0 0.05
#play qc
#synth env 0.01 0.3 0.5 0.5
#play qc
```

Repeat type line for: `buzz`, `clang`, `metallic`, `hollow`, `noise`.

### 2.2 bells

```text
#synth restart
#synth bells
#play qc
#synth env 0.01 0.5 0.2 0.5
#play qc
```

(Default is a one-shot strike that decays; reshape should still be audible.)

### 2.3 doot

```text
#synth restart
#synth doot
#play qc
#synth env 0.001 0.05 0 0.05
#play qc
#synth env 0.01 0.2 0.3 0.4
#play qc
```

---

## Batch 3 — Algo `algo0`–`algo7`

### 3.1 Each algo speaks

```text
#synth restart
#synth algo0
#play qc
```

Repeat for `algo1` … `algo7`.

### 3.2 Params on algo0 and algo4

```text
#synth restart
#synth algo0
#play qc
#synth osc4 sawtooth
#play qc
#synth osc4 sine
#play qc
#synth harmonicity1 0.5
#play qc
#synth harmonicity1 4
#play qc
#synth modindex1 1
#play qc
#synth modindex1 8
#play qc
#synth env 0.5 0.2 0.2 0.5
#play qc
#synth port 0.3
#play qceg
```

```text
#synth restart
#synth algo4
#play qc
#synth osc4 sawtooth
#play qc
#synth osc1 square
#play qc
#synth harmonicity1 2
#synth modindex1 4
#play qc
```

(am/fm/fat on `oscN` must reject — already Jest-locked; ear only that valid oscN changes timbre.)

---

## Batch 4 — SOS / named instruments

### 4.1 string

```text
#synth restart
#synth string
#play qc
#synth detune 0
#play qc
#synth detune 0.8
#play qc
#synth pwm 0
#play qc
#synth pwm 0.9
#play qc
#synth vib 0
#play qc
#synth vib 0.9
#play qc
#synth filter 0
#play qc
#synth filter 1
#play qc
```

### 4.2 pluck

```text
#synth restart
#synth pluck
#play qc
#synth structure 0
#play qc
#synth structure 1
#play qc
#synth brightness 0
#play qc
#synth brightness 1
#play qc
#synth damping 0.1
#play qc
#synth damping 0.85
#play qc
#synth accent 0
#play qc
#synth accent 1
#play qc
```

### 4.3 winds (type each; params on flute)

```text
#synth restart
#synth flute
#play qc
#synth clarinet
#play qc
#synth brass
#play qc
#synth flute
#synth breath 0
#play qc
#synth breath 1
#play qc
#synth pressure 0
#play qc
#synth pressure 1
#play qc
#synth brightness 0
#play qc
#synth brightness 1
#play qc
#synth resonance 0
#play qc
#synth resonance 1
#play qc
```

### 4.4 piano

```text
#synth restart
#synth piano
#play qc
#synth spread 0
#play qc
#synth spread 1
#play qc
#synth hammer 0
#play qc
#synth hammer 1
#play qc
#synth brightness 0
#play qc
#synth brightness 1
#play qc
#synth damping 0
#play qc
#synth damping 1
#play qc
```

### 4.5 violin

```text
#synth restart
#synth violin
#play qc
#synth bow 0
#play qc
#synth bow 1
#play qc
#synth pressure 0
#play qc
#synth pressure 1
#play qc
#synth vib 0
#play qc
#synth vib 1
#play qc
#synth body 0
#play qc
#synth body 1
#play qc
#synth port 0.3
#play qceg
```

### 4.6 steel

```text
#synth restart
#synth steel
#play qc
#synth pick 0
#play qc
#synth pick 1
#play qc
#synth body 0
#play qc
#synth body 1
#play qc
#synth damping 0
#play qc
#synth damping 1
#play qc
#synth position 0
#play qc
#synth position 1
#play qc
```

### 4.7 tonewheel

```text
#synth restart
#synth tonewheel
#play qc
#synth drawbar 0
#play qc
#synth drawbar 1
#play qc
#synth click 0
#play qc
#synth click 1
#play qc
#synth leak 0
#play qc
#synth leak 1
#play qc
#synth bright 0
#play qc
#synth bright 1
#play qc
```

---

## Out of scope (removed named types)

Do not expect: `drip`, `panpipe`, `epiano`, `timpani`, `viola`, `nylon`, bare `drawbar` as voice.

---

## On fail

1. Trace `#synth` → SAB → native sample owner ([daisy-synth-config](../.cursor/skills/daisy-synth-config/SKILL.md)).
2. Smallest fix at owner; no fallbacks / new sync layers.
3. Native: `CLANG_FORMAT=… yarn task run ops:native:lint:fix` then `yarn task run ops:daisy:build` → hard-refresh → same ear steps.
4. Update confidence matrix Wired → Proven / Broken + owner.

## Automated locks (not a substitute for ear)

```bash
yarn jest ops/tests/unit/feature/synth/backend/wasm/wasmvoiceconfig.test.ts \
  ops/tests/unit/feature/synth/backend/daisy/fmsquarecarrier.test.ts \
  --config ops/jest.config.ts --no-coverage
```
