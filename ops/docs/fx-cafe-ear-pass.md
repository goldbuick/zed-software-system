# FX cafe-ear pass

Manual listen checklist for every **live Daisy voice FX** send and its key params. Use when validating parallel FX buses, after `ops:daisy:build`, or when moving machines.

Confidence matrix / param defaults: [`zss/feature/synth/docs/(catalog)/fx-types-reference.md`](../zss/feature/synth/docs/(catalog)/fx-types-reference.md). Player command surface: [`effects.md`](../zss/feature/synth/docs/(play)/effects.md).

**Out of scope:** main-bus sidechain / compressor / razzle (see [audiochain](../zss/feature/synth/docs/(path)/audiochain.md) / [gain-levels](../zss/feature/synth/docs/(path)/gain-levels.mdx)).

## Setup

1. Cafe running (`yarn task cafe` / `./task cafe dev`).
2. After native/Daisy changes: `yarn task run ops:daisy:build`, then **hard-refresh** the browser.
3. Report each step as `pass` / `fail` / `unclear` (one line). On fail, note heard vs expected.

### Notation

Digits in `#play` are **drums**, not duration or octave.

| Use | Meaning |
|-----|---------|
| `#play qc` | Quarter-note C4 (default octave) |
| `#play hc` | Half-note C4 (sustained) |
| `#play qceg` | Quarter C D E G |
| `#play qcde` | Short run |

### Dry carrier (every batch)

```text
#synth restart
#synth sawtooth
```

Use `#play qc` for most FX; `#play hc` for vibrato; `#play qceg` for autowah (envelope needs dynamics).

### FX isolation

`#synth restart` resets FX sends and params (`defaultwasmfxsab`). No mute-all block needed after restart. Mid-batch, turn off only the FX you just enabled (or restart again).

### Shared protocol notes

- Bare `#echo` / `#reverb` / etc. hit play groups **0+1** only. `#echo1`…`#echo4` is a single group.
- Daisy FX are **parallel sends** (same dry tap; wet sum + return compressor). No serial order between types.
- Vibrato is **pitch cents**, not serial wet — listen on sustained `#play hc`.
- `distort oversample` is Tone-only / N/A on Daisy — **skip**.
- Prefer audible extremes (same style as voice ear batches).

---

## Batch 1 — fcrush

### 1.1 send on / off / numeric

```text
#synth restart
#synth sawtooth
#play qc
#fcrush on
#play qc
#fcrush off
#play qc
#fcrush 80
#play qc
#fcrush 0
#play qc
```

| Play | Expect |
|------|--------|
| dry / after `off` / `0` | Clean saw |
| `on` / `80` | Sample-and-hold crush / lo-fi grit |

### 1.2 rate

```text
#fcrush on
#fcrush rate 4
#play qc
#fcrush rate 128
#play qc
```

Low rate = heavier crush / stepped; high rate = closer to dry.

---

## Batch 2 — echo

### 2.1 on / off

```text
#synth restart
#synth sawtooth
#play qc
#echo on
#play qc
#echo off
#play qc
```

### 2.2 delaytime

Use a short envelope + moderate feedback so spacing is obvious:

```text
#echo on
#echo feedback 0.35
#synth env 0.001 0.05 0 0.05
#echo delaytime 16n
#play qc
#echo delaytime 1n
#play qc
```

Short slap (`16n`) vs clearly longer spaced repeats (`1n`).

### 2.3 feedback

```text
#echo on
#echo delaytime 8n
#echo feedback 0.1
#play qc
#echo feedback 0.9
#play qc
```

Few repeats vs long ringing trail (clamped ≤ 0.95).

---

## Batch 3 — reverb

### 3.1 on / off

```text
#synth restart
#synth sawtooth
#play qc
#reverb on
#play qc
#reverb off
#play qc
```

### 3.2 decay

```text
#reverb on
#reverb decay 0.5
#play qc
#reverb decay 6
#play qc
```

Short room vs long wash.

### 3.3 predelay

```text
#reverb on
#reverb decay 2.5
#reverb predelay 0
#play qc
#reverb predelay 0.08
#play qc
```

Immediate bloom vs audible gap before the wash.

---

## Batch 4 — autofilter

### 4.1 on / off

```text
#synth restart
#synth sawtooth
#play hc
#autofilter on
#play hc
#autofilter off
#play hc
```

### 4.2 frequency / depth / octaves / q

```text
#autofilter on
#autofilter frequency 1
#play hc
#autofilter frequency 8
#play hc
#autofilter frequency 3
#autofilter depth 0.1
#play hc
#autofilter depth 1
#play hc
#autofilter depth 0.5
#autofilter octaves 1
#play hc
#autofilter octaves 6
#play hc
#autofilter octaves 5
#autofilter q 0.5
#play hc
#autofilter q 8
#play hc
```

### 4.3 type + WASM basefrequency

```text
#autofilter on
#autofilter type lowpass
#play hc
#autofilter type highpass
#play hc
#autofilter type lowpass
#autofilter basefrequency 80
#play hc
#autofilter basefrequency 800
#play hc
```

Lowpass vs highpass must differ; basefrequency moves the sweep floor (WASM-only key).

---

## Batch 5 — distort

### 5.1 on / off

Daisy `#distort` is sine foldback (timbre wrecks a saw — not a subtle soft-clip). **Hard-refresh** after `ops:daisy:build` so the worklet picks up new wasm.

```text
#synth restart
#synth sawtooth
#play qc
#distort 80
#distort distortion 0.8
#play qc
#distort off
#play qc
```

Expect: clean saw → harsh folded/raspy → clean.

### 5.2 distortion amount

```text
#distort 80
#distort distortion 0.1
#play qc
#distort distortion 0.9
#play qc
```

Mild edge vs heavy drive.

### 5.3 oversample — skip

`#distort oversample …` is Tone-only / N/A on Daisy. Do not ear.

---

## Batch 6 — vibrato

Pitch cents on gated play voices (not a wet delay in the FX sum). Group 3 (TTS) never gets pitch mod.

### 6.1 on / off (sustained)

```text
#synth restart
#synth sawtooth
#play hc
#vibrato on
#play hc
#vibrato off
#play hc
```

`on` with default depth ≈ 0 auto-targets depth **0.5** — expect clear pitch wobble vs dry.

### 6.2 maxdelay / depth / frequency

```text
#vibrato on
#vibrato maxdelay 0.005
#play hc
#vibrato maxdelay 0.05
#play hc
#vibrato depth 0.1
#play hc
#vibrato depth 1
#play hc
#vibrato depth 0.5
#vibrato frequency 2
#play hc
#vibrato frequency 8
#play hc
```

`depth` / `frequency` are WASM-only config keys (not in the player effects scroll). Play SAB envelopes the note window only; FX `depth` / `frequency` own amount and LFO rate.

---

## Batch 7 — autowah

Needs dynamics — use `#play qceg`.

### 7.1 on / off

```text
#synth restart
#synth sawtooth
#play qceg
#autowah on
#play qceg
#autowah off
#play qceg
```

### 7.2 params

```text
#autowah on
#autowah basefrequency 50
#play qceg
#autowah basefrequency 400
#play qceg
#autowah basefrequency 100
#autowah octaves 2
#play qceg
#autowah octaves 8
#play qceg
#autowah octaves 6
#autowah sensitivity -20
#play qceg
#autowah sensitivity 0
#play qceg
#autowah sensitivity -3
#autowah gain 5
#play qceg
#autowah gain 40
#play qceg
#autowah gain 25
#autowah follower 0.05
#play qceg
#autowah follower 0.5
#play qceg
```

---

## Batch 8 — routing (bare vs numbered)

Bare FX → groups 0+1. Suffixed `*1`…`*4` → one group. Group map: `*1` = `#play` 0–1, `*2` = `#play` 2–3, `*3` = `#bgplay`, `*4` = TTS.

### 8.1 bare vs echo1

```text
#synth restart
#synth sawtooth
#echo1 on
#play qc
#echo1 off
#echo on
#play qc
#echo off
#play qc
```

`#echo1 on` alone should wet `#play` (group 0). Bare `#echo on` should also wet. After all off, dry again.

### 8.2 bgplay / echo3 smoke

```text
#echo off
#echo1 off
#echo2 off
#echo3 on
#echo4 off
#bgplay qc
#echo3 off
#bgplay qc
```

Expect wet on `#bgplay` with `#echo3 on`, dry after `off`. (If `#bgplay` is unavailable in the session, mark **unclear** and skip.)

---

## Batch 9 — multi-FX

Parallel sends share one dry tap; wet sum should stay present without smashing the carrier.

```text
#synth restart
#synth sawtooth
#play qc
#echo on
#reverb on
#play qc
#echo off
#reverb off
#play qc
```

| Play | Expect |
|------|--------|
| dry | Clean saw |
| echo+reverb | Delay repeats **and** room wash; still hear dry attack |
| both off | Dry again |

Automated lock (not a substitute for ear):

```bash
yarn task run ops:daisy:level-stability:test:fxmatrix
```

---

## Out of scope

- Main-bus sidechain / compressor / razzle
- `distort oversample` (Tone-only)
- TTS / `#echo4` deep pass (routing smoke covers numbered buses; TTS optional later)

---

## On fail

1. Trace FX command → SAB send/param → native owner (`wasmfxstate.ts` / `zss_fx.cpp` / `applyfxgroup()` in `zss_daisy_synth.cpp`). Spec: [parallel-fx-bus.md](../zss/feature/synth/docs/(path)/parallel-fx-bus.md).
2. Smallest fix at owner; no fallbacks / new sync layers.
3. Native: `CLANG_FORMAT=… yarn task run ops:native:lint:fix` then `yarn task run ops:daisy:build` → hard-refresh → same ear steps.
4. Update confidence notes in fx-types-reference if Wired → Proven / Broken + owner.

## Automated locks (not a substitute for ear)

```bash
yarn task run ops:daisy:level-stability:test:fxmatrix
```
