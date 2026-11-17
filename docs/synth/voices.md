---
title: Synth
description: Learn #synth voices by family — what they sound like, which knobs matter, and pasteable A/B recipes.
---

This page is for writing music in cafe.

## Before you play

| Command | What it does |
|---------|--------------|
| `#synth <name>` | Select / configure all four `#play` voices |
| `#synth1` … `#synth4` | One play voice |
| `#synth5 …` | `#bgplay` voices |
| `#synth restart` | Clear sticky config and FX SAB when A/B gets muddy |

:::tip Digits in `#play` are drums
`#play 50 c` is woodblock + hat + C — not “C at tempo 50”. Prefer `#play qc`, `hc`, or `qceg`. See [notation](/synth/playnotation).
:::

**Expect language below** means: paste the recipe, listen once, change one knob, listen again.

## Shared knobs (all voices)

| Key | Meaning |
|-----|---------|
| `vol` | Level in dB. Type select already applies a per-voice normalize; `#synth vol` overrides. |
| `env <a> <d> <s> <r>` | Attack / decay / sustain / release (seconds; sustain 0–1) |
| `port <seconds>` | Portamento (glide). Works on oscillator, algo, and violin. |

Configs can survive a type switch until `#synth restart`.

```text
#synth square
#synth env 0.01 0.1 0.4 0.2
#play qceg
```

**Expect:** short square arpeggio with a little sustain.

---

## Basic waves

Clean single oscillators: `sine`, `square`, `triangle`, `sawtooth`, `custom` (`custom` maps to square in Daisy).

| Key | Ear meaning |
|-----|-------------|
| `phase <degrees>` | Start phase (180 = half cycle). Used by basic and fat waves. |

```text
#synth sine
#play hc
#synth square
#play hc
```

**Expect:** soft round tone → bright hollow square, same pitch and length.

---

## Pulse and PWM

| Voice | Intent |
|-------|--------|
| `pulse` | Fixed pulse shape |
| `pwm` | Pulse width moves with an LFO |

| Key | Range | Ear meaning |
|-----|-------|-------------|
| `width` | −1…1 (default ~0.2) | Pulse shape — thinner vs fatter |
| `modfreq` | Hz (default 1) | **PWM LFO rate**, not FM. Faster = buzzier warble |

```text
#synth pulse
#synth width 0.1
#play qc
#synth pwm
#synth modfreq 4
#synth width 0.4
#play hc
```

**Expect:** static thin pulse → slow-then-faster width wiggle on a held note.

---

## AM and FM

AM rings the carrier with a modulator. FM bends pitch with a modulator (`#synth fm*` ≈ Tone FMOscillator, not FMSynth).

| Key | AM | FM | Defaults |
|-----|----|----|----------|
| `harmonicity` | yes | yes | `1` (mod Hz = note × ratio; `2` = octave) |
| `modtype` | yes | yes | `square` (`sine` / `triangle` / `sawtooth` also) |
| `modenv` | yes | yes | ADSR on modulation depth |
| `modindex` | no | **yes** | `2` — depth. Law: `f ≈ fc * (1 + I * m)` |

```text
#synth fmsine
#synth harmonicity 1
#synth modindex 2
#play qc
#synth modindex 8
#play qc
```

**Expect:** mild metallic FM → much more clangy / sideband-heavy.

```text
#synth amsquare
#synth harmonicity 2
#play hc
```

**Expect:** amplitude wobble at twice the note rate (octave-related AM).

---

## Fat (unison)

Several detuned copies of one wave: `fatsine`, `fatsquare`, `fattriangle`, `fatsawtooth`.

| Key | Default | Ear meaning |
|-----|---------|-------------|
| `count` | 3 | How many oscillators |
| `spread` | 20 | Cents between them (not piano unison) |
| `phase` | 0 | Same as basic waves |

```text
#synth fatsawtooth
#synth count 3
#synth spread 20
#play hc
#synth spread 80
#play hc
```

**Expect:** mild chorus → wide detuned stack.

---

## Noise, chips, bells, doot

| Voice | Intent |
|-------|--------|
| `retro` / `buzz` / `clang` / `metallic` | Chip / LFSR noise flavors |
| `noise` / `hollow` | White / hollow spectral noise (Daisy) |
| `bells` | Modal one-shot chime |
| `doot` | Short pitched blip |

Mostly `env` and `vol` — no oscillator knobs.

```text
#synth bells
#play qc
#synth metallic
#play qceg
```

**Expect:** decaying bell hit → scratchy metallic run.

---

## Algo FM (`algo0`–`algo7`)

Four-operator FM routings. Select with `#synth algoN`, then set keys with `#synth …` (not `#algo0 …`).

| Key | Meaning |
|-----|---------|
| `harmonicity1`…`3` | Operator frequency ratios |
| `modindex1`…`3` | Operator modulation depths |
| `osc1`…`osc4` | Wave: basic / pulse / pwm only |
| `env1`…`env4` | Per-op envelopes |
| `env` / `port` / `vol` | Outer voice envelope, glide, level |

Routing pictures: [algosynth](/synth/algosynth).

```text
#synth algo0
#play qceg
#synth algo5
#play qceg
```

**Expect:** different FM timbres on the same notes (algo5 is usually thinner / brighter than algo0).

```text
#synth algo0
#synth osc1 sine
#synth harmonicity1 2
#synth modindex1 3
#play hc
```

**Expect:** clearer sine carrier with stronger mod from op 1.

---

## Instruments (SOS)

These voices follow Gordon Reid’s [Synth Secrets](https://www.soundonsound.com/series/synth-secrets-sound-sound) instrument articles (Sound On Sound) — subtractive / heuristic models, not sample libraries. Shared `env` / `vol` / `port` (where wired) still apply. Exclusive knobs are 0–1 unless noted.

### String machine — `string`

Based on: [Synthesizing Strings: String Machines](https://www.soundonsound.com/techniques/synthesizing-strings-string-machines), [PWM & String Sounds](https://www.soundonsound.com/techniques/synthesizing-strings-pwm-string-sounds).

| Key | Default-ish | Ear |
|-----|-------------|-----|
| `detune` | 0.25 | Ensemble width |
| `pwm` | 0.2 | OSC2 PWM amount |
| `vib` | 0.35 | Vibrato |
| `filter` | 0.5 | Body brightness |

```text
#synth string
#play hcde
#synth filter 0.9
#play hcde
```

**Expect:** pad-like saw stack → brighter / thinner body.

### Pluck — `pluck`

Based on: [Synthesizing Plucked Strings](https://www.soundonsound.com/techniques/synthesizing-plucked-strings) (DaisySP `StringVoice` / Karplus-Strong family).

`structure`, `brightness`, `damping`, `accent` — strike and decay of a string model.

```text
#synth pluck
#play qc egc
#synth damping 0.3
#play qc egc
```

**Expect:** short plucked notes → longer ring when damping drops.

### Wind — `flute`, `clarinet`, `brass`

Same keys: `breath`, `pressure`, `brightness`, `resonance`.

| Voice | Synth Secrets |
|-------|---------------|
| `flute` | [Synthesizing Simple Flutes](https://www.soundonsound.com/techniques/synthesizing-simple-flutes), [Practical Flute Synthesis](https://www.soundonsound.com/techniques/practical-flute-synthesis) |
| `clarinet` | [Synthesizing Wind Instruments](https://www.soundonsound.com/techniques/synthesizing-wind-instruments) (reed / odd-harmonic square) |
| `brass` | [Synthesizing Brass Instruments](https://www.soundonsound.com/techniques/synthesizing-brass-instruments) |

```text
#synth flute
#play qceg
#synth brass
#play qceg
```

**Expect:** airy flute → brassier / louder formants on the same line.

### Piano — `piano`

Based on: [Synthesizing Pianos](https://www.soundonsound.com/techniques/synthesizing-pianos).

`spread` (0–1 unison), `hammer`, `brightness`, `damping`.

```text
#synth piano
#play qc eg
#synth hammer 0.9
#play qc eg
```

**Expect:** soft hammer → harder attack.

### Violin — `violin`

Based on: [Synthesizing Bowed Strings: The Violin Family](https://www.soundonsound.com/techniques/synthesizing-bowed-strings-violin-family), [Practical Bowed-string Synthesis](https://www.soundonsound.com/techniques/practical-bowed-string-synthesis).

`bow`, `pressure`, `vib`, `body`, plus `port` for slides.

```text
#synth violin
#synth port 0.15
#play hcde
```

**Expect:** bowed tone with audible glide between notes.

### Steel guitar — `steel`

Based on: [The Theoretical Acoustic Guitar Patch](https://www.soundonsound.com/techniques/theoretical-acoustic-guitar-patch), [A Final Attempt To Synthesize Guitars](https://www.soundonsound.com/techniques/final-attempt-synthesize-guitars).

`pick`, `body`, `damping`, `position`.

```text
#synth steel
#play qceg
#synth pick 0.8
#play qceg
```

**Expect:** brighter / snappier pick attack.

### Tonewheel organ — `tonewheel`

Based on: [Synthesizing Tonewheel Organs: Part 1](https://www.soundonsound.com/techniques/synthesizing-tonewheel-organs-part-1), [Part 2](https://www.soundonsound.com/techniques/synthesizing-tonewheel-organs-part-2), [Tonewheel Organ Implementations Compared](https://www.soundonsound.com/techniques/tonewheel-organ-implementations-compared).

| Key | Note |
|-----|------|
| `drawbar` | Organ mix param — **not** a voice type |
| `click` / `leak` / `bright` | Key click, crosstalk, brightness |

```text
#synth tonewheel
#play qceg
#synth drawbar 0.9
#synth bright 0.8
#play qceg
```

**Expect:** fuller drawbar stack and brighter top.

---

## Next

- [Effects](/synth/effects) — echo, reverb, distort, vibrato, …
- [Notation](/synth/playnotation) — `#play` characters
- [Scales](/synth/scales) — copy-paste scale lines
