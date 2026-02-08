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
- **Ratio:** 4:1
- **Sidechain sources:** `altaction` (TTS + bgplay), `drumaction` (drums)
- **Purpose:** Ducks main playback when TTS or drums are active

### Main Compressor

- **Threshold:** -28 dB
- **Ratio:** 4:1
- **Purpose:** Overall dynamics control

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, 0.3 depth)
- **Chorus:** Widening effect (7ms delay, 0.7 depth)
- **Tape hiss:** Pink noise modulated by oscillator, adds analog character

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
