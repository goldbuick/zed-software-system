# Synth Module Documentation

The synth is a web-based software synthesizer. **Active runtime** uses a front-end / back-end split:

- **Front-end** — firmware commands, `device/synth.ts` routing, `memory/synthstate.ts`, gadget `SYNTH_STATE`, play notation parsing. No audio engine imports.
- **Back-end v1** — WASM only: Maximilian worklet, SAB voice/drum/FX scheduling, MP3 export.

Legacy Tone.js documentation below describes the **archived** stack under `archive/tone/`. See [`../README.md`](../README.md) for the current layout.

## Quick Links (active)

| Topic | File |
| ----- | ---- |
| [playnotation.ts](playnotation.md) | Text notation parser |
| [record & mp3](record-and-mp3.md) | Recording to MP3 (WASM path) |
| [voice-types-reference.md](voice-types-reference.md) | All voice types, params, WASM vs Tone defaults |
| [fx-types-reference.md](fx-types-reference.md) | All FX types, params, WASM vs Tone defaults |
| [implementation-matrix.md](implementation-matrix.md) | Voice/FX/drum/master map (Maxi vs Daisy vs Tone vs DaisySP) |

## Quick Links (archived Tone.js)

| Topic | File |
| ----- | ---- |
| [index.ts](index.md) | Main entry, synth factory |
| [audiochain.ts](audiochain.md) | Global audio routing |
| [source.ts](source.md) | Sound source factory |
| [fx & fxchannels](fx-and-fxchannels.md) | Effects chain |
| [drums](drums.md) | Drum kit |
| [voiceconfig](voiceconfig.md) | Voice/source config API |
| [voicefx](voicefx.md) | FX config API |
| [worklets](worklets.md) | AudioWorklet processors |

---

## Archived Tone.js reference

The sections below document the former Tone.js implementation. Paths refer to `archive/tone/` unless noted.
