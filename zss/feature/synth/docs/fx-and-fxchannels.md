# fx.ts & fxchannels.ts

## fx.ts

Shared effect chain. All voices route through these effects via FX channels.

### volumetodb(value: number)

Converts 0-100 linear scale to dB:
- 0 → ~-35 dB
- 100 → ~0 dB
- Formula: `20 * log10(value) - 35`

### createfx()

Creates Tone.js effects:
- `reverb` — Reverb
- `echo` — FeedbackDelay (8n, 0.666 feedback)
- `autofilter` — AutoFilter
- `distortion` — Distortion (4x oversample)
- `vibrato` — Vibrato
- `fc` / `fcrush` — FrequencyCrusher (rate 32)
- `autowah` — AutoWah

`getreplay()` returns state for: fc, echo, reverb, autofilter, vibrato, distortion (not autowah).

---

## fxchannels.ts

Per-voice FX send/return. Each voice has a send level for each effect.

### createfxchannels(index: number)

Creates:
- **Receive channels:** fc, echo, reverb, autofilter, vibrato, distortion, autowah
- **Send node:** `sendtofx` — Connects to destination and sends to all receive buses

**Prefix:** `offline` when `context.isOffline`, else empty. Enables separate buses for offline rendering.

### Routing

```
Source ──► sendtofx ──► dest (playvolume or bgplayvolume)
    │
    └──► fc.receive ──► FXCHAIN.fc ──► dest
    └──► echo.receive ──► FXCHAIN.echo ──► dest
    ... (same for each effect)
```

Volume on each Channel controls send amount to that effect.
