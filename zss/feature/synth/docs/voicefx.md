# Voice FX Module

Configures per-voice effect sends and effect parameters. For the full parameter/default catalog (WASM vs Tone), see [fx-types-reference.md](fx-types-reference.md).

## Entry Point

`synthvoicefxconfig(player, synth, index, fxname, config, value)`

- `index`: FX channel index (0-3)
- `fxname`: Effect name (see below)
- `config`: `on`, `off`, numeric (0-100 send level), or effect-specific key
- `value`: Effect-specific value when config is a parameter name

## FX Names

| fxname | Effect | Config Module |
|--------|--------|---------------|
| `fc`, `fcrush` | Frequency Crusher | fcrush.ts |
| `echo` | Feedback Delay | echo.ts |
| `autofilter` | Auto Filter | autofilter.ts |
| `reverb` | Reverb | reverb.ts |
| `distort`, `distortion` | Distortion | distort.ts |
| `vibrato` | Vibrato | vibrato.ts |
| `autowah` | Auto Wah | autowah.ts |

## Global Configs

| config | Effect |
|--------|--------|
| `on` | Sets send to **50** (vibrato/autofilter/distortion on WASM) or **18** (others). Tone: distortion `on` is **18**; WASM distortion `on` is **50**. |
| `off` | Sets send to 0 |
| number (0-100) | Sets send level (converted via volumetodb) |

## Effect-Specific Configs

### autofilter.ts
- `type` — Filter type
- `q` — Q factor
- `depth` — Modulation depth
- `frequency` — LFO rate (Hz)
- `octaves` — Filter range
- `basefrequency` — Cutoff floor (WASM only)

### autowah.ts
- `basefrequency` — Wah center frequency
- `octaves` — Wah range
- `sensitivity` — Input sensitivity
- `gain` — Output gain
- `follower` — Envelope follower amount

### distort.ts
- `distortion` — Distortion amount (0-1)
- `oversample` — Oversample type (`'none'`, `'2x'`, `'4x'`)

### echo.ts
- `delaytime` — Delay time in seconds
- `feedback` — Feedback amount (0-1)

### fcrush.ts
- `rate` — Sample-and-hold rate (1-512)

### reverb.ts
- `decay` — Reverb decay time
- `predelay` — Pre-delay in seconds

### vibrato.ts
- `maxdelay` — Maximum delay for vibrato depth
- `depth` — Modulation depth (WASM only)
- `frequency` — LFO rate in Hz (WASM only)
