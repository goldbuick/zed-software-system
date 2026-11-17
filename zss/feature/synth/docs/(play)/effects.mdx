---
title: Effects
description: Learn voice FX sends — bus addressing, starter presets, and what each effect should sound like.
---

Voice FX are **parallel sends**: dry stays full; wet is mixed beside it. Bus law: [FX bus](/synth/parallel-fx-bus).

## How sends work

| Form | Meaning |
|------|---------|
| `#echo on` / `#echo off` | Enable / mute (preset send level) |
| `#echo <0–100>` | Send amount (`0` = off) |
| `#echo delaytime …` | Effect parameter |

:::tip Isolate one effect
Turn others off, change one knob, listen. If A/B gets sticky, `#synth restart` clears FX SAB.
:::

### Which bus?

Bare `#echo`, `#reverb`, … hit **play groups 0 and 1** (all four `#play` voices). Numbered suffix picks one bus:

| Suffix | Audio |
|--------|--------|
| `*1` | `#play` voices 0–1 |
| `*2` | `#play` voices 2–3 |
| `*3` | `#bgplay` voices 4–7 |
| `*4` | TTS |

Mnemonic: `*1` = play, `*3` = bgplay. Example: `#echo3 on` for background delay only.

**`on` preset levels:** vibrato / autofilter ≈ 50; echo / reverb / fcrush / distort / autowah ≈ 18.

---

## Distort — foldback grit

Sine foldback, not soft clip. `oversample` is Tone-only — skip it on Daisy.

| Key | Default | Ear |
|-----|---------|-----|
| `distortion` | 0.4 | Fold amount — higher = harsher |

```text
#synth square
#distort off
#play hc
#distort on
#distort distortion 0.8
#play hc
```

**Expect:** clean square → folded / raspy square.

---

## Vibrato — pitch wobble

Pitch cents on the voice (not a wet delay). `#vibrato on` auto-targets depth ~0.5 when depth was ~0. Use a held note: `#play hc`.

| Key | Default | Ear |
|-----|---------|-----|
| `depth` | 0 (auto ~0.5 on `on`) | How wide the wobble |
| `frequency` | 5 | Wobble rate (Hz) |
| `maxdelay` | 0.02 (WASM) | Legacy Tone name; keep fixed while A/B depth |

```text
#synth sine
#vibrato on
#vibrato depth 0.05
#play hc
#vibrato depth 1
#play hc
```

**Expect:** almost still → obvious pitch shake. Same maxdelay both times.

---

## Autowah — envelope filter

Follower opens the filter from note energy. Needs a **run of notes** (`qceg`), not one held tone. There is **no LFO** here — that is `#autofilter`. Crank send so on/off is obvious.

| Key | Default | Ear |
|-----|---------|-----|
| `basefrequency` | 100 | Closed filter floor |
| `octaves` | 6 | How far it opens |
| `sensitivity` | −3 dB | How easily notes trigger |
| `gain` | 25 dB | Peak loudness of the wah |
| `follower` | 0.2 s | Smoothing — the “clock” of the sweep |

```text
#synth sawtooth
#autowah off
#play qceg
#autowah on
#autowah gain 30
#play qceg
```

**Expect:** dry run → vocal / quacky filter that opens on each note attack.

---

## Echo — slapback vs trails

| Key | Default | Ear |
|-----|---------|-----|
| `delaytime` | `8n` (or seconds / `4n` / `16n` …) | Time between repeats |
| `feedback` | 0.666 (clamped ≤ ~0.95) | How long the trail lasts |

### Starter: slapback

```text
#synth square
#echo on
#echo delaytime 16n
#echo feedback 0.25
#play qc eg
```

**Expect:** tight short repeats, notes still clear.

### Starter: long hall delay

```text
#echo delaytime 4n
#echo feedback 0.8
#play qc
```

**Expect:** slower echoes that hang longer.

Bgplay only: `#echo3 on` then the same params.

---

## Reverb — room wash

| Key | Default | Ear |
|-----|---------|-----|
| `decay` | 2.5 | How long the tail lasts |
| `predelay` | 0.01 | Gap before the wash starts |

### Starter: small room

```text
#synth piano
#reverb on
#reverb decay 1.2
#reverb predelay 0.01
#play qc eg
```

**Expect:** short room around the dry attack.

### Starter: big hall

```text
#reverb decay 4
#reverb predelay 0.05
#play qc
```

**Expect:** longer wash; attack still audible because dry is parallel.

---

## Frequency crush — `fcrush` / `fc`

Sample-and-hold grit.

| Key | Default | Ear |
|-----|---------|-----|
| `rate` | 32 (≥ 1) | Lower = crunchier / more aliased |

```text
#synth sawtooth
#fcrush on
#fcrush rate 64
#play hc
#fcrush rate 8
#play hc
```

**Expect:** mild lo-fi → harsh crushed tone.

---

## Autofilter — LFO sweep

LFO moves a filter (unlike autowah’s follower).

| Key | Default | Ear |
|-----|---------|-----|
| `frequency` | 3 | LFO rate (Hz) |
| `depth` | 0.5 | Sweep intensity |
| `octaves` | 5 | Sweep range |
| `q` | 1 | Resonance |
| `type` | lowpass | Biquad type ([MDN names](https://developer.mozilla.org/en-US/docs/Web/API/BiquadFilterNode/type)) |

```text
#synth sawtooth
#autofilter on
#autofilter frequency 1
#autofilter depth 0.8
#play hw
```

**Expect:** slow whoosh of brightness on a held note.

---

## Multi-FX together

Sends sum in parallel — order between FX types does not chain.

```text
#synth square
#echo on
#echo delaytime 8n
#echo feedback 0.4
#reverb on
#reverb decay 2.5
#play qceg
```

**Expect:** delay repeats **and** room wash, with dry attack still clear.

More routing detail: [parallel FX bus](/synth/parallel-fx-bus).

---

## Next

- [Synth voices](/synth/voices) — pick a patch
- [Notation](/synth/playnotation) — `#play` characters
- [FX bus](/synth/parallel-fx-bus) — parallel send routing
