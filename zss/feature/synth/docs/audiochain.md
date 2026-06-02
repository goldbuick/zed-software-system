# audiochain.ts

Builds the global audio routing and processing chain for the synth.

## Signal Flow

```
playvolume ─────┐
               │
bgplayvolume ──┼──► sidechaincompressor ──► razzlegain ──► maincompressor ──► razzledazzle ──► razzlechorus ──► mainvolume ──► destination
ttsvolume ─────┤         ▲                        │
               │         │                        │
drumvolume ────┴─────────┼────────────────────────┘
                         │
drumaction ──────────────┘
altaction ────────────────────────────────────────────────────────────────────────────┘
                         │
hiss (pink noise) ───────┘
```

`razzlegain` sums ducked play with bg, TTS, and drums before the main compressor.

## Components

### Sidechain Compressor

- **Threshold:** -42 dB
- **Ratio:** 5:1
- **Attack / release:** 5 ms / 60 ms
- **Mix / makeup:** 0.75 / +24 dB
- **Sidechain sources:** `altaction` (TTS + bgplay @ -12 dB), `drumaction` (clap+bass @ -28 dB)
- **Purpose:** Ducks `#play` when bg/TTS/drums hit (not bg/TTS/drum buses themselves)
- **Tone:** `SidechainCompressor` AudioWorklet — input 0 = play, input 1 = summed key bus
- **Daisy:** `sidechainkey()` sums trimmed bg/TTS/drum tap; `sidechaingain()` on play bus only (`zss_daisy_synth.cpp`)

### Main Compressor

- **Threshold:** -28 dB
- **Ratio:** 4:1
- **Attack / release:** 3 ms / 150 ms (peak envelope)
- **Knee:** 30 dB (Tone `Compressor`; Daisy `compressorskneedb` in `mastercompressor()`)
- **Purpose:** Dynamics on full post-sidechain mix (ducked play + bg + TTS + drums)
- **Tone:** `Tone.Compressor` after `razzlegain`
- **Daisy:** `mastercompressor()` — single envelope path, no post-GR makeup or silence guard (Tone parity)

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, wet 0.1)
- **Chorus:** Widening effect (7 ms base delay, wet 0.5)
- **Tape hiss:** Pink noise modulated by oscillator, feeds chorus input

### Daisy volume laws (match Tone)

| Bus | Tone | Daisy |
|-----|------|-------|
| Play into sidechain | `volumetodb(20)` | `kPlayBusGain` |
| Drums | `volumetodb(100) + 10` dB | `kDrumBusGain` |
| Master fader | `volumetodb(vol × 0.25)` on `mainvolume` | `readmastervolume()` |

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
