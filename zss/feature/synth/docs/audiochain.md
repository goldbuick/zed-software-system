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
- **Daisy:** `sidechainkey()` sums trimmed bg/TTS/drum tap; `sidechaingain()` on play bus only (`zss_daisy_synth.cpp`); SAB slot 4 bypasses duck for offline A/B (`yarn render:sidechain:ab`) or live dev (`ZSS_DAISY_NO_SIDECHAIN=1`, `?no_sc=1`)

### Main Compressor

- **Threshold:** -28 dB
- **Ratio:** 4:1
- **Attack / release:** 3 ms / 150 ms (peak envelope detector)
- **Applied gain slew:** 8 ms attack / 100 ms release (`comp_gain_smooth`, separate from detector)
- **Parallel mix:** 55% wet compressed / 45% dry (`kMasterCompMix`) — limits level loss vs full wet GR
- **Knee:** 30 dB (Tone `Compressor`; Daisy `compressorskneedb` in `maincomptargetgain()`)
- **Silence guard:** When `|dry|` is below ~-80 dBFS, `comp_env` fast-decays so gain returns to unity before the next note
- **Purpose:** Dynamics on full post-sidechain mix (ducked play + bg + TTS + drums)
- **Tone:** `Tone.Compressor` after `razzlegain` — internal gain smoothing on applied GR
- **Daisy:** `maincompressor()` — detector (`comp_env`) + smoothed multiplier (`comp_gain_smooth`); SAB slot 3 bypasses for A/B renders (`yarn render:notepop:ab`)

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, wet 0.1)
- **Chorus:** Widening effect (7 ms base delay, wet 0.5)
- **Tape hiss:** Pink noise modulated by oscillator, feeds chorus input

### Daisy volume laws (match Tone)

| Bus | Tone | Daisy |
|-----|------|-------|
| Play into sidechain | `volumetodb(20)` | `kPlayBusGain` |
| Drums | `volumetodb(100) + 10` dB | `kDrumBusGain` |
| Main fader | `volumetodb(vol × 0.25)` on `mainvolume` | `readmainvolume()` |

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
