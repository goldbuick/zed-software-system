# Parallel voice FX bus (Daisy)

DSP spec for per-group voice FX routing in `zss_daisy_synth.cpp`.

## Routing

- **4 FX groups** (play 0–1, play 2–3, bgplay, TTS) — see [voicefxgroup.ts](../voicefxgroup.ts).
- Each effect is a **parallel send** from the same dry sample per block.
- **Vibrato** is not in the wet sum; it modulates pitch on play voices before the FX tap.

## Bus law (DAW additive)

```
wet_sum = Σᵢ sendᵢ · Δᵢ(dry)

Δᵢ = wetᵢ(dry) − dry     for fc, echo, reverb, distortion
Δᵢ = fxautofilterbus(dry)   (already wet − dry)
Δᵢ = fxautowahbus(dry)      (already wet − dry)

wet_sum = fxreturncompress(wet_sum, group)

out = dry + wet_sum
```

- **Dry is always full level** on the main path.
- **No order** between FX types (echo does not see reverb).
- Per-group processor state (`ZssFxGroup`) — `#echo1`…`#echo4` stay independent.

## Send levels

| Source | Range |
|--------|--------|
| `#fx off` | 0 |
| `#fx on` | Preset via `volumetodb` — 18 (most FX), 50 (autofilter, distortion, vibrato) |
| `#fx 0–100` | `volumetodb(v) = 20·log10(v) − 35` → linear send in SAB |

## Return-bus compressor

Applied to **`wet_sum` only** (dry punch preserved).

| Constant | Value |
|----------|--------|
| Threshold | −20 dBFS (envelope) |
| Ratio | 3:1 |
| Knee | 6 dB |
| Attack | 2 ms |
| Release | 80 ms |

Per-group envelope follower in `ZssFxGroup::return_comp_env`.

## Per-algorithm trims (unchanged)

- Reverb: `tanh(wet × 1.6)`
- Echo: feedback clamp 0–0.95
- Distortion: `Overdrive` with ×3 input drive

## Master chain (out of scope)

Sidechain duck → master compressor → razzle → volume — unchanged downstream of `applyfxgroup`.

## Regression

`yarn test:level-stability --filter fxmatrix` — peak vs `fxmatrix-dry` (≤6 dB), peak ≤ −0.5 dBFS.
