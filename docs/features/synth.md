---
title: Synth
description: Play voices, effects, and recording in Zed Cafe.
---

Voices, effects, and the Daisy WASM path: [Synth](/synth).

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| #play / #bgplay | Creator | Play note sequences foreground or background. | `#play` |
| #vol / #playvol / #bgvol | Creator | Main volume and play/bg bus trims. | `#vol` |
| #synth / #synth1-5 | Creator | Configure Daisy multi-voice synth for #play/bgplay. | `zss/feature/synth/docs/(play)/voices.md` |
| #synthrecord / #synthflush | Creator | Record synth output to file or clear saved notes. | `#synthrecord` |
| FX: echo/reverb/distort | Creator | Multi-voice effects on play channels. | `zss/feature/synth/docs/(play)/effects.md` |
| Per-voice FX 1-3 | Creator | Individual echo/fcrush/autofilter/reverb/distort/vibrato/autowah. | `#echo1` |
| Drums & AlgoSynth | Creator | Percussion voices and FM algorithm synthesis. | `zss/feature/synth/docs/(path)/drums.md` |
| MP3 recording | Creator | Record audio output to MP3 file. | `zss/feature/synth/docs/(path)/record-and-mp3.md` |
