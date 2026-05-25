# WASM synth — Phase 2 (drums + master chain)

Phase 1 is complete. Phase 2 adds drum digits and a master output chain.

## Enable

Same as Phase 1 — `ZSS_WASM_SYNTH=true` in `cafe/.env.local`.

## What works (Phase 2)

| Feature | Status |
|---------|--------|
| Drum digits `0`–`9` in `#play` | Yes |
| Kick/clap sidechain duck | Yes — `voicegain` duck on drums `3` and `9` |
| Main compressor + volume | Yes — matches Tone main compressor (−28 dB, 4:1) |
| Drum bus gain | Yes — `volumetodb(100) + 10` (+15 dB) |
| Boot drum warm-up | Yes — muted pass fires all 10 drums once |
| `#playvolume` via Web Audio gain | Yes |
| Razzle/chorus/hiss tape layer | No — Phase 3+ |
| Full sidechain worklet | No — simplified duck |

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
  → maxi.send('zss_drums', triggerCounters)
  → WASM drumsout() mixed with voices

worklet → voicegain → compressor → mainvolume → destination
```

## Files

| Path | Role |
|------|------|
| `zss/feature/synth/wasm/drumplaycode.ts` | Maximilian drum DSP |
| `zss/feature/synth/wasm/wasmmasterchain.ts` | Compressor + volume |
| `zss/feature/synth/wasm/wasmlevels.ts` | Drum bus gain constants |
| `zss/feature/synth/wasm/warmwasmdrums.ts` | Boot warm-up pass |
| `zss/feature/synth/wasm/maxisynth.ts` | Drum scheduler |

## Next (Phase 3)

1. FX buses — `#echo`, `#reverb`, autofilter, etc.
2. `#bgplayvolume` through master chain
3. Razzle/chorus/hiss layer (optional polish)
