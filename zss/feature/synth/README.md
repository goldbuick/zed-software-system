# Synth Module

Web-based software synthesizer built with Tone.js.

## Documentation

Detailed documentation for each file is in **[docs/](docs/README.md)**.

## Quick Start

```typescript
import { setupsynth, createsynth } from 'zss/feature/synth'

// One-time setup (registers AudioWorklets)
await setupsynth()

// Create synth instance
const synth = createsynth()

// Play notation (e.g. "qC4qD4qE4" = quarter notes C, D, E)
synth.addplay('qC4qD4qE4')
```

## Structure

| Area | Description |
|------|-------------|
| **Sources** | 8 voices: Synth, noise types, Bells, Doot, AlgoSynth |
| **FX** | Reverb, echo, autofilter, distortion, vibrato, fcrush, autowah |
| **Drums** | Tick, tweet, cowbell, clap, snares, toms, woodblocks, bass |
| **Recording** | Records to MP3 via offline render |

## Subfolders

- `drums/` — Drum kit implementations
- `voiceconfig/` — Voice/source configuration API
- `voicefx/` — Effect configuration API
