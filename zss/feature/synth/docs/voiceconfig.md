# Voice Config Module

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
| `restart` | — | Applies full synth reset |
| `vol` / `volume` | number | Source volume |
| `port` / `portamento` | number (seconds) | Portamento (SYNTH, ALGO_SYNTH only) |
| `env` / `envelope` | [a,d,s,r] | ADSR envelope |

## Source Type Changes

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
| `drip` | DRIP_VOICE (WASM only) |

## Pluck Configs (wasmvoiceconfig.ts, WASM only)

| Config | Value | Description |
|--------|-------|-------------|
| `structure` | number (0–1) | StringVoice bridge/dispersion |
| `brightness` | number (0–1) | Excitation brightness |
| `damping` | number (0–1) | String damping |
| `accent` | number (0–1) | Strike accent |

Applies only when voice is `#synth pluck`. Defaults: `0.14`, `0.22`, `0.68`, `0.48`.

## String ensemble configs (wasmvoiceconfig.ts, WASM only, `#synth string`)

| Config | Value | Description |
|--------|-------|-------------|
| `detune` | number (0–1) | VCO spread (0–8¢) |
| `pwm` | number (0–1) | OSC2 square-LFO FM depth |
| `vib` | number (0–1) | VCO1 vibrato depth (0–8¢) |
| `filter` | number (0–1) | LP cutoff scale + filter envelope |

Applies only when voice is `#synth string` (algo 0). Defaults: `0.25`, `0.2`, `0.35`, `0.5`. See [voice-types-reference.md](voice-types-reference.md) §5.

## Oscillator Types (SYNTH)

When config is a valid oscillator type: `sine`, `square`, `triangle`, `sawtooth`, `pwm`, `pulse`, `custom`, `amsine`, `fmsine`, `fatsine`, etc.

- `value` as `number[]`: partials for custom/partial oscillators
- `value` as `number`: single partial

## Oscillator-Specific Configs

| Oscillator | Config | Description |
|------------|--------|-------------|
| pwm | `modfreq` | Modulation frequency |
| pulse | `width` | Pulse width |
| sine/square/triangle/sawtooth/custom | `phase` | Phase offset |
| am* | `harmonicity`, `modtype`, `modenv` | AM params |
| fm* | `harmonicity`, `modindex`, `modtype`, `modenv` | FM params |
| fat* | `count`, `phase`, `spread` | Fat oscillator params |

## AlgoSynth Configs (algosynth.ts)

| Config | Value | Description |
|--------|-------|-------------|
| `harmonicity` | number | All three harmonicities |
| `harmonicity1`-`3` | number | Per-operator |
| `modindex` | number | All three mod indices |
| `modindex1`-`3` | number | Per-operator |
| `osc1`-`osc4` | string | Oscillator type |
| `env1`-`env4` | [a,d,s,r] | Per-operator envelope |

## Validation (validation.ts)

`validatesynthtype(value, maybepartials)` — Validates before applying:
- Custom/partial types require `maybepartials` to be array
- Known types (pwm, pulse, retro, etc.) always valid
- Oscillator variants must match `(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*`
