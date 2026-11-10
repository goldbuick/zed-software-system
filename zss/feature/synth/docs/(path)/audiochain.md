---
title: Main chain
---

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

### Main Compressor

- **Threshold:** -28 dB
- **Ratio:** 4:1
- **Attack / release:** 3 ms / 150 ms (RMS envelope detector; Tone product release)
- **Applied gain slew:** 8 ms attack / 150 ms release (`comp_gain_smooth`, separate from detector)
- **Parallel mix:** 100% wet (`kMainCompMix = 1`)
- **Knee:** 30 dB soft knee (Tone product `Compressor`; full width around threshold via `compressorskneedb`)
- **Silence guard:** When `|dry|` is below ~-80 dBFS, `comp_env` fast-decays so gain returns to unity before the next note
- **Purpose:** Dynamics on full post-sidechain mix (ducked play + bg + TTS + drums)
- **Tone:** `Tone.Compressor` after `razzlegain` — threshold -28, ratio 4, attack 3 ms, release 150 ms, knee 30
- **Daisy:** `maincompressor()` — detector (`comp_env`) + smoothed multiplier (`comp_gain_smooth`); SAB slot 3 bypasses for A/B renders (`yarn notepop:render:ab`)

### Sidechain Compressor

- **Threshold:** -42 dB
- **Ratio:** 5:1
- **Attack / release:** 1 ms / 60 ms (`kScAttackSec` / `kScReleaseSec`; attack faster than Tone's 5 ms so drum duck punches)
- **Mix / makeup:** 0.75 / **+5 dB** (`kScMix` / `kScMakeupDb`; Tone used +24 dB)
- **Sidechain sources:** `altaction` (TTS + bgplay @ -12 dB), `drumaction` (clap+bass @ -20 dB via `kScDrumKeyDb`)
- **Purpose:** Ducks `#play` when bg/TTS/drums hit (not bg/TTS/drum buses themselves)
- **Tone:** `SidechainCompressor` AudioWorklet — input 0 = play, input 1 = summed key bus; clap/bass feed `drumaction` before kit bus gain; bass MembraneSynth volume +8 on that path
- **Daisy:** `drumsout()` taps clap ungained and bass with `kScDrumBassKeyDb` (+8) into `drumsidechain`; `sidechainkey()` then applies `kScDrumKeyDb` (−20 dB). Audible kit still uses `kDrumGains` / `kDrumBassVolumeDb`. SAB slot 4 bypasses duck (`yarn sidechain:render:ab`, `?no_sc=1`). SAB slot 5 mutes the key only (`?no_sc_key=1`) — duck stays at idle makeup, no triggers

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, wet 0.02)
- **Chorus:** Widening effect (7 ms base delay, wet **0.25**)
- **Tape hiss:** Pink noise modulated by oscillator, feeds chorus input (very quiet bed)

Full gain chart: [gain-levels.mdx](gain-levels.mdx).

### Daisy volume laws (match Tone)

| Bus | Tone | Daisy |
|-----|------|-------|
| Play into sidechain | `volumetodb(20)` | `kPlayBusGain` |
| Drums | `volumetodb(100) + 10` dB | `kDrumBusGain` (calibrate: `yarn play-drum-balance:calibrate`) |
| bgplay / TTS | `10^((20*log10(vol)-35)/20)` | `readbgplayvolume()` / `readttsvolume()` (same law) |
| Main fader | `40*log10(vol × 0.25)` on `mainvolume` (offset **-36 dB**, +12 dB per doubling) | `readmainvolume()` (`kMainFaderOffsetDb`) |

Boot SAB defaults: master/play fader **50**, bgplay **50**, TTS **100**.

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
