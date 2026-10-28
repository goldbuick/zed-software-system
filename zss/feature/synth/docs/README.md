---
title: Synth Module Documentation
---

The synth is a web-based software synthesizer. **Active runtime** uses a front-end / back-end split:

- **Front-end** — firmware commands, `device/synth.ts` routing, `memory/synthstate.ts`, gadget `SYNTH_STATE`, play notation parsing. No audio engine imports.
- **Back-end** — DaisySP WASM worklet (`backend/daisy/`), SAB voice/drum/FX scheduling (`backend/wasm/`), MP3 export.

See [`../README.md`](../README.md) for the runtime layout.

## Quick Links (active)

| Topic | File |
| ----- | ---- |
| [Synth](voices.md) | Player reference for `#synth` voices and config keys |
| [Effects](effects.md) | Player reference for echo, reverb, and the other voice FX |
| [Scales](scales.md) | `#play` lines for each scale and key |
| [playnotation.ts](playnotation.md) | Text notation parser |
| [record & mp3](record-and-mp3.md) | Recording to MP3 (Daisy path) |
| [voice-types-reference.md](voice-types-reference.md) | Voice types, params, and defaults |
| [fx-types-reference.md](fx-types-reference.md) | FX types, params, and defaults |
| [gain-levels.md](gain-levels.md) | Every volume/gain constant and tweak guide |
| [implementation-matrix.mdx](implementation-matrix.mdx) | Voice, FX, drum, and master map |
| [audiochain.md](audiochain.md) | Master routing |
| [drums.md](drums.md) | Drum kit |
| [index.md](index.md) | Synth factory |
