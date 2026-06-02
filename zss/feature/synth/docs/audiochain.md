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
- **Detector attack / release:** 3 ms / 150 ms (peak envelope for GR calculation)
- **Applied gain attack / release:** 8 ms / 100 ms (slews `comp_gain_smooth` toward target — avoids note-on pop and note-off tail spike)
- **Knee:** 30 dB (Tone default; continuous knee, no hard unity snap below threshold)
- **Silence guard:** when \|dry\| &lt; ~−80 dBFS, fast-decay detector and slew gain toward unity (FX tails not boosted after release)
- **Post-GR makeup:** +4 dB on comp output (`kMasterCompMakeupDb`) before razzle — offsets average gain reduction; separate from master fader `kMasterMakeupDb` (0 dB)
- **Purpose:** Detect + apply on full post-sidechain mix (play ducked + bg + TTS + drums)
- **Daisy:** `mastercompdetect()` → `mastercomptargetgain()` → smoothed `mastercompressorgain()` in `zss_daisy_synth.cpp` (Tone’s built-in comp smooths gain internally; Daisy splits detector vs applied gain)

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, 0.3 depth)
- **Chorus:** Widening effect (7ms delay, 0.7 depth)
- **Tape hiss:** Pink noise modulated by oscillator, adds analog character

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
