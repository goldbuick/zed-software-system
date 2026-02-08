# Voice Config Module

Handles voice/source configuration from external API (e.g. device commands).

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
| `port` / `portamento` | number | Portamento (SYNTH, ALGO_SYNTH only) |
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
