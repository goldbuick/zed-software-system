---
title: Main chain
description: Play, drums, TTS, sidechain, compressor, and razzle into the output.
---

Builds the global audio routing and processing chain for the synth.

## Signal Flow

```
playvolume ─────┐
               │
bgplayvolume ──┼──► sidechaincompressor ──► mix ──► maincompressor ──► razzle ──► destination
ttsvolume ─────┤         ▲                  │
               │         │                  │
drumvolume ────┴─────────┼──────────────────┘
                         │
drumaction ──────────────┘
altaction (SC key) ──────┘
hiss (in razzle) ─────────────────────────────────────────┘
```

Stem faders (`readplayvolume` / `readbgplayvolume` / `readttsvolume` / `readdrumvolume`) scale each bus into the mix. `#vol` scales play/bg/tts via effective SAB trims and drums via SAB VOL. Razzle is post-compressor bed only (not a master fader).

## Components

### Main Compressor

- **Threshold:** -28 dB (Tone product)
- **Ratio:** 4:1
- **Attack / release:** 3 ms / 150 ms (RMS envelope detector; Tone product release)
- **Applied gain slew:** 8 ms attack / 150 ms release (`comp_gain_smooth`, separate from detector)
- **Parallel mix:** 100% wet (`kMainCompMix = 1`)
- **Knee:** 30 dB soft knee (Tone product `Compressor`; full width around threshold via `compressorskneedb`)
- **Silence guard:** When `|dry|` is below ~-80 dBFS, `comp_env` fast-decays so gain returns to unity before the next note
- **Purpose:** Dynamics on full post-sidechain mix (ducked play + bg + TTS + drums)
- **Tone reference:** `Tone.Compressor` -28 / 4 / 3 ms / 150 ms / knee 30
- **Daisy:** `maincompressor()` — detector (`comp_env`) + smoothed multiplier (`comp_gain_smooth`); SAB slot 3 bypasses for A/B renders (`yarn notepop:render:ab`)

### Sidechain Compressor

- **Threshold:** -42 dB
- **Ratio:** 5:1
- **Attack / release:** 5 ms / 60 ms (`kScAttackSec` / `kScReleaseSec`; Tone product)
- **Mix / makeup:** 0.75 / **+24 dB** (`kScMix` / `kScMakeupDb`; Tone product)
- **Sidechain sources:** `altaction` (TTS + bgplay @ -12 dB), `drumaction` (clap+bass @ -28 dB via `kScDrumKeyDb`)
- **Purpose:** Ducks `#play` when bg/TTS/drums hit (not bg/TTS/drum buses themselves)
- **Tone:** `SidechainCompressor` AudioWorklet — input 0 = play, input 1 = summed key bus; clap/bass feed `drumaction` before kit bus gain; bass MembraneSynth volume +8 on that path
- **Daisy:** `drumsout()` taps clap ungained and bass with `kScDrumBassKeyDb` (+8) into `drumsidechain`; `sidechainkey()` then applies `kScDrumKeyDb` (−28 dB). Audible kit still uses `kDrumGains` / `kDrumBassVolumeDb`. SAB slot 4 bypasses duck (`yarn sidechain:render:ab`, `?no_sc=1`). SAB slot 5 mutes the key only (`?no_sc_key=1`) — duck stays at idle makeup, no triggers. After razzle, master **Daisy Limiter** still GR the full mix (drum peaks can pull play down), then `kMainLimiterMakeup` (~+4.3 dB) restores SoftLimit(0.7) peaks toward full scale before `clamp +/-1`; SAB slot 7 / `?no_lim=1` bypasses limiter+makeup for A/B.

### Razzle Chain

- **Vibrato:** Subtle pitch modulation (0.125 Hz, wet 0.02)
- **Chorus:** Widening effect (7 ms base delay, wet **0.25**)
- **Tape hiss:** Pink noise modulated by oscillator, feeds chorus input (very quiet bed)

Full gain chart: [gain-levels.mdx](gain-levels.mdx).

### Daisy volume laws (match Tone)

| Bus | Tone | Daisy |
|-----|------|-------|
| Play stem | playvolume fader | `readplayvolume()` (`60*log10-105`, `#playvol` × `#vol`) |
| Drums | drum bus gain | `kDrumBusGain * readdrumvolume(#vol)` |
| bgplay / TTS | `10^((60*log10(vol)-105)/20)` | `readbgplayvolume()` / `readttsvolume()` (same law) |

Boot SAB defaults: `#vol` **50**, bus trims **90** (effective **45**), TTS trim path same.

### Broadcast Destination

When not in offline mode, `broadcastdestination` is a `MediaStreamAudioDestinationNode` for screen sharing or recording the synth output.

## Exports

- `createaudiochain()` — Factory function
- `AUDIO_CHAIN` — Return type
