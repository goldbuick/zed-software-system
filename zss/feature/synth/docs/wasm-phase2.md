# WASM synth — Phase 2 (drums + master chain)

Phase 1 is complete. Phase 2 adds drum digits and a master output chain.

## Enable

Same as Phase 1 — `ZSS_WASM_SYNTH=true` in `cafe/.env.local`.

## What works (Phase 2)

| Feature | Status |
|---------|--------|
| Drum digits `0`–`9` in `#play` | Yes |
| Kick/clap sidechain duck | Yes — WASM voice duck on drums `3` and `9` (drums unscaled in mono mix) |
| Main compressor + volume | Yes — WASM soft-knee (−28 dB, 4:1) + `zss_master` SAB |
| Drum bus gain | Yes — `volumetodb(100) + 10` (+15 dB) |
| Razzle layer | Yes — Maximilian delay + chorus + hiss in `play()` |
| Pattern drum durations | Yes — SAB durations + Tone-fixed tick/tweet/bass |
| Boot drum warm-up | Yes — muted pass fires all 10 drums once |
| `#playvolume` | Yes — via `zss_master` SAB |
| Web Audio FX on synth path | No — single `worklet → destination` bridge |

## Drum map

| Digit | Drum |
|-------|------|
| 0 | Tick (closed hat) |
| 1 | Tweet (open hat) |
| 2 | Cowbell |
| 3 | Clap |
| 4 | Hi snare |
| 5 | Hi woodblock |
| 6 | Low snare |
| 7 | Low tom |
| 8 | Low woodblock |
| 9 | Bass |

## Try it

```text
#play 0123456789
#play q0q1q2q9
```

## Architecture

```text
#play digit
  → maxisynth scheduledrum()
  → zss_drums SAB (strike counters)
  → WASM play(): voices + drums → duck → trim → compressor → razzle → volume
  → worklet → destination
```

## Files

| Path | Role |
|------|------|
| `zss/feature/synth/wasm/drumplaycode.ts` | Maximilian drum DSP |
| `zss/feature/synth/wasm/wasmmasterplaycode.ts` | Duck + compressor + volume in WASM |
| `zss/feature/synth/wasm/wasmrazzleplaycode.ts` | Razzle delay/chorus/hiss in WASM |
| `zss/feature/synth/wasm/wasmmasterchain.ts` | Worklet → destination wiring only |
| `zss/feature/synth/wasm/wasmlevels.ts` | Drum bus + per-drum gains |
| `zss/feature/synth/wasm/warmwasmdrums.ts` | Boot warm-up pass |
| `zss/feature/synth/wasm/maxisynth.ts` | Drum scheduler |

## Next (Phase 3)

1. FX buses — `#echo`, `#reverb`, autofilter, etc.
2. `#bgplayvolume` through master chain
