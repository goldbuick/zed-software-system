# Synth Module Documentation

The synth is a web-based software synthesizer. **Active runtime** uses a front-end / back-end split:

- **Front-end** — firmware commands, `device/synth.ts` routing, `memory/synthstate.ts`, gadget `SYNTH_STATE`, play notation parsing. No audio engine imports.
- **Back-end** — DaisySP WASM worklet (`backend/daisy/`), SAB voice/drum/FX scheduling (`backend/wasm/`), MP3 export.

Legacy Tone.js and Maximilian documentation paths refer to **archived** stacks under `archive/tone/` and `archive/maxi/`. See [`../README.md`](../README.md) for the current layout.

## Quick Links (active)

| Topic | File |
| ----- | ---- |
| [playnotation.ts](playnotation.md) | Text notation parser |
| [record & mp3](record-and-mp3.md) | Recording to MP3 (Daisy path) |
| [voice-types-reference.md](voice-types-reference.md) | All voice types, params, Daisy vs Tone defaults |
| [fx-types-reference.md](fx-types-reference.md) | All FX types, params, Daisy vs Tone defaults |
| [implementation-matrix.md](implementation-matrix.md) | Voice/FX/drum/master map (Daisy vs archived Maxi/Tone) |

## Quick Links (archived)

| Topic | File |
| ----- | ---- |
| [archive/tone/](../archive/tone/README.md) | Tone.js stack |
| [archive/maxi/](../archive/maxi/README.md) | Maximilian WASM stack |

## Quick Links (archived Tone.js detail)

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
