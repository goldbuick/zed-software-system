# Parallel voice FX bus (Daisy)

DSP spec for per-group voice FX routing in `zss_daisy_synth.cpp`.

## Routing

- **4 FX groups** (play 0–1, play 2–3, bgplay, TTS) — see [voicefxgroup.ts](../voicefxgroup.ts).
- Each effect is a **parallel send** from the same dry sample per block.
- **Vibrato** is not in the wet sum; it modulates pitch on play voices before the FX tap.

## Bus law (Tone-like wet return)

```
wet_sum = Σᵢ sendᵢ · contributionᵢ(dry)

contribution = wetᵢ(dry)              echo, reverb (full effect return)
contribution = wetᵢ(dry) − dry        fcrush, distortion
contribution = fxautofilterbus(dry)   (band − dry)
contribution = fxautowahbus(dry)      (wah delta)

wet_sum × kFxReturnWetTrim → fxreturncompress(wet_sum, group)

out = dry + wet_sum
```

- **Dry is always full level** on the main path.
- **Echo/reverb** use **send × wet** (not send × (wet − dry)) so delay tails and room energy are audible; the old delta law made steady-state echo ~inaudible.
- **No order** between FX types (echo does not see reverb).
- Per-group processor state (`ZssFxGroup`) — `#echo1`…`#echo4` stay independent.

## Send levels

| Source | Range |
|--------|--------|
| `#fx off` | 0 |
| `#fx on` | Preset via `volumetodb` — **50** for all FX (~−1 dB linear send) |
| `#fx 0–100` | `volumetodb(v) = 20·log10(v) − 35` → linear send in SAB |

## Return-bus compressor

Applied to **`wet_sum` only** (dry punch preserved).

| Constant | Value |
|----------|--------|
| Wet trim | **1.4** linear bus gain before compressor |
| Threshold | −24 dBFS (envelope) |
| Ratio | 4:1 |
| Knee | 6 dB |
| Attack | 2 ms |
| Release | 80 ms |

Per-group envelope follower in `ZssFxGroup::return_comp_env`. Detector still runs when `wet_sum` is zero so the envelope can decay between hits.

## Per-algorithm trims (unchanged)

- Reverb: DaisySP-LGPL **ReverbSc** + predelay; `tanh(wet × kReverbPostGain)` (1.6)
- Echo: feedback clamp 0–0.95
- Distortion: `Overdrive` with ×3 input drive

## Main bus (out of scope)

Sidechain duck → master compressor → razzle → volume — unchanged downstream of `applyfxgroup`.

## Regression

`yarn test:level-stability --filter fxmatrix`:

- Peak vs `fxmatrix-dry` (≤6 dB), peak ≤ −0.5 dBFS
- Solo FX audibility: peak within 4 dB of dry (distortion ≥ +4 dB hotter); diagnostic wet-lift report in [`fxbusmetrics.ts`](../backend/daisy/fxbusmetrics.ts)

`yarn test:fx-bus-metrics` — offline wet-lift decomposition report (no Playwright).
