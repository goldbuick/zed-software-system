# audiochain.ts

Builds the global audio routing and processing chain for the synth.

## Signal Flow

```
playvolume ─────┐
               │
bgplayvolume ──┼──► sidechaincompressor ──► maincompressor ──► razzledazzle ──► razzlechorus ──► mainvolume ──► destination
ttsvolume ─────┤         ▲                        │                                  │
               │         │                        │                                  │
drumvolume ────┴─────────┼────────────────────────┘                                  │
                         │                                                            │
drumaction ──────────────┘                                                            │
altaction ────────────────────────────────────────────────────────────────────────────┘
                         │
hiss (pink noise) ───────┘
```

## Components

### Sidechain Compressor

- **Threshold:** -42 dB
- **Ratio:** 5:1
- **Attack / release:** 5 ms / 60 ms
- **Mix / makeup:** 0.75 / +24 dB
- **Sidechain sources:** `altaction` (TTS + bgplay @ -12 dB), `drumaction` (clap+bass @ -28 dB)
- **Purpose:** Ducks `#play` when bg/TTS/drums hit (not bg/TTS/drum buses themselves)

### Main Compressor

- **Threshold:** -28 dB
- **Ratio:** 4:1
- **Attack / release:** 3 ms / 150 ms
- **Knee:** 30 dB (Tone default; Daisy matches in `zss_daisy_synth.cpp`)
- **Purpose:** Detect + apply on full post-sidechain mix (play ducked + bg + TTS + drums)

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, 0.3 depth)
- **Chorus:** Widening effect (7ms delay, 0.7 depth)
- **Tape hiss:** Pink noise modulated by oscillator, adds analog character

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
