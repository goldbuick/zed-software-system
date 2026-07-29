---
title: Voice Config Module
---

Handles voice/source configuration from external API (e.g. device commands). For the full voice-type catalog (WASM vs Tone), see [voice-types-reference.md](voice-types-reference.md).

## Entry Point

`synthvoiceconfig(player, synth, index, config, value)`

- `player`: Player identifier for error reporting
- `synth`: AUDIO_SYNTH instance (or null)
- `index`: Source index (0-7)
- `config`: Config key (string or number)
- `value`: Config value (number, string, or array)

## Global Configs

| Config | Value | Description |
|--------|-------|-------------|
| `restart` | — | Applies full synth reset (clears per-slot config memory) |
| `vol` / `volume` | number | Source volume |
| `port` / `portamento` | number (seconds) | Portamento (SYNTH, ALGO_SYNTH, BOWED_VOICE) |
| `env` / `envelope` | [a,d,s,r] | ADSR envelope |

## Config memory across type switches

Per play/bgplay voice index, family blobs (`stringensemble`, `pluck`, `wind`, …) and osc/algo rows stay in memory when you change type. ADSR and portamento are snapshotted per `(type, algo)` so switching away and back restores the last settings for that voice. Exclusive keys (e.g. `detune`, `structure`) also write dormantly into their family blob. Only `#synth restart` (and boot defaults) fully clear this memory.

Top-level config-only commands (`#string`, `#fmsquare`, `#piano1`, …) adjust those slots without selecting the type — use `#synth <name>` to select.

## Source Type Changes

First visit to a named type (or SYNTH via a wave name) installs that destination's default ADSR. Returning to a previously used `(type, algo)` restores the snapshotted envelope and portamento. Same-SYNTH wave changes (`square` → `sawtooth`) keep the current envelope. `#synth bells` installs Tone-parity carrier env `0.01/3/0.3/6` on first visit.

| Config | Source Type |
|--------|-------------|
| `retro` | RETRO_NOISE |
| `buzz` | BUZZ_NOISE |
| `clang` | CLANG_NOISE |
| `metallic` | METALLIC_NOISE |
| `bells` | BELLS |
| `doot` | DOOT |
| `algo0` - `algo7` | ALGO_SYNTH (algorithm 0-7) |
| `string` | STRING_VOICE (algo 0, WASM only) |
| `pluck` | STRING_VOICE (algo 1, WASM only) |
| `flute` / `clarinet` / `brass` | WIND_VOICE (algo 0–2, WASM only) |
| `piano` | PIANO_VOICE (algo 0, WASM only) |
| `violin` | BOWED_VOICE (algo 0, WASM only) |
| `steel` | GUITAR_VOICE (algo 1, WASM only) |
| `tonewheel` | ORGAN_VOICE (algo 0, WASM only; `drawbar` remains an organ **param**) |

## Wind configs (wasmvoiceconfig.ts, WASM only)

Select defaults come from **`winddefaults(algo)`**, not the pool `DEFAULT_WASM_WIND` (`0.3/0.45/0.45/0.15`).

| Config | Value | flute | clarinet | brass |
|--------|-------|-------|----------|-------|
| `breath` | 0–1 | 0.35 | 0.25 | 0.15 |
| `pressure` | 0–1 | 0.4 | 0.35 | 0.65 |
| `brightness` | 0–1 | 0.45 | 0.3 | 0.55 |
| `resonance` | 0–1 | 0.1 | 0.2 | 0.35 |

## Shared `#synth` keys (fallthrough)

Overlapping names must **fall through** when the current voice is not the owner (same pattern as piano `spread` vs fat `spread`). Exclusive keys may write dormantly into their family blob.

| Key | Owners | Exclusive? |
|-----|--------|------------|
| `spread` | piano (0–1), fat (cents) | no |
| `brightness` / `damping` | pluck, wind, piano, guitar | no |
| `pressure` | wind, bowed | no |
| `vib` | string, bowed | no |
| `body` | bowed, guitar | no |
| `structure` / `accent` | pluck only | yes (dormant ok) |
| `breath` / `resonance` | wind only | yes (dormant ok) |
| `hammer` | piano only | yes (dormant ok) |
| `bow` | bowed only | yes (dormant ok) |
| `detune` / `pwm` / `filter` | string only | yes (dormant ok; bare `pwm` still selects wave) |

## Piano configs (WASM only)

| Config | Value | Default |
|--------|-------|---------|
| `spread` | 0–1 | `0.18` |
| `hammer` | 0–1 | `0.55` |
| `brightness` | 0–1 | `0.5` |
| `damping` | 0–1 | `0.45` |

On `#synth piano`, `spread` is the piano unison param (0–1). On fat SYNTH waves (`fatsawtooth`, etc.), the same key name sets fat detune **cents** (default `20`).

## Bowed configs (WASM only)

| Config | Value | Default |
|--------|-------|---------|
| `bow` | 0–1 | `0.24` |
| `pressure` | 0–1 | `0.5` |
| `vib` | 0–1 | `0.35` |
| `body` | 0–1 | `0.55` |

Portamento applies to bowed voices.

## Guitar configs (WASM only) — `#synth steel`

| Config | Value | Default (steel select) |
|--------|-------|------------------------|
| `pick` | 0–1 | `0.5` |
| `body` | 0–1 | `0.35` |
| `damping` | 0–1 | `0.7` (native cap 0.85; DaisySP >= 0.95 = infinite ring) |
| `position` | 0–1 | `0.6` |

## Organ configs (WASM only) — `#synth tonewheel`

| Config | Value | Default |
|--------|-------|---------|
| `drawbar` | 0–1 | `0.7` (param only; not a named voice) |
| `click` | 0–1 | `0.15` |
| `leak` | 0–1 | `0.2` |
| `bright` | 0–1 | `0.5` |

## Pluck Configs (wasmvoiceconfig.ts, WASM only)

| Config | Value | Description |
|--------|-------|-------------|
| `structure` | number (0–1) | StringVoice bridge/dispersion |
| `brightness` | number (0–1) | Excitation brightness |
| `damping` | number (0–1) | String damping |
| `accent` | number (0–1) | Strike accent |

Defaults: `0.14`, `0.38`, `0.72`, `0.12`. Exclusive keys also write dormantly.

## String ensemble configs (wasmvoiceconfig.ts, WASM only, `#synth string`)

| Config | Value | Description |
|--------|-------|-------------|
| `detune` | number (0–1) | VCO spread (0–8¢) |
| `pwm` | number (0–1) | OSC2 square-LFO FM depth |
| `vib` | number (0–1) | VCO1 vibrato depth (0–8¢) |
| `filter` | number (0–1) | LP cutoff scale + filter envelope |

Defaults: `0.25`, `0.2`, `0.35`, `0.5`. See [voice-types-reference.md](voice-types-reference.md) §6.

## Oscillator Types (SYNTH)

When config is a valid oscillator type: `sine`, `square`, `triangle`, `sawtooth`, `pwm`, `pulse`, `custom`, `amsine`, `fmsine`, `fatsine`, etc.

- `value` as `number[]`: partials for custom/partial oscillators
- `value` as `number`: single partial

## Oscillator-Specific Configs

| Oscillator | Config | Description |
|------------|--------|-------------|
| pwm | `modfreq` | LFO rate for pulse-width modulation (Hz) |
| pulse | `width` | Static pulse width |
| sine/square/triangle/sawtooth/custom | `phase` | Phase offset |
| am* | `harmonicity`, `modtype`, `modenv` | AM params (`harmonicity` = modulator ratio) |
| fm* | `harmonicity`, `modindex`, `modtype`, `modenv` | FM params; Daisy modulator Hz = note × `harmonicity` |
| fat* | `count`, `phase`, `spread` | Unison count, phase, detune cents |

## AlgoSynth Configs ([algosynth.md](algosynth.md))

| Config | Value | Description |
|--------|-------|-------------|
| `harmonicity` | number | All three harmonicities |
| `harmonicity1`-`3` | number | Per-operator |
| `modindex` | number | All three mod indices |
| `modindex1`-`3` | number | Per-operator |
| `osc1`-`osc4` | string | Operator wave: `sine`/`square`/`triangle`/`sawtooth`/`pulse`/`pwm` (not am/fm/fat) |
| `env1`-`env4` | [a,d,s,r] | Per-operator envelope |

Voice-level `env` / `envelope` is the outer mix ADSR (`algooutenv`). See [voice-types-reference.md](voice-types-reference.md) for algo routings (`algo4` = `1→2`, `3→4` → op2+op4).

## Validation (validation.ts)

`validatesynthtype(value, maybepartials)` — Validates before applying:
- Custom/partial types require `maybepartials` to be array
- Known types (pwm, pulse, retro, etc.) always valid
- Oscillator variants must match `(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*`
