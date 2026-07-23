---
title: Audio & synth
description: Audio & synth features in Zed Cafe / ZSS.
---

| Feature | Audience | Description | Pointer |
|---------|----------|-------------|---------|
| #play / #bgplay | Creator | Play note sequences foreground or background. | `#play` |
| #vol / #bgvol | Creator | Set play and background volume levels. | `#vol` |
| #synth / #synth1–5 | Creator | Configure Daisy multi-voice synth for #play/bgplay. | `#synth` |
| Daisy WASM backend | Dev | Production synth: AudioWorklet + shared-array-buffer path. | `zss/feature/synth/backend/daisy/` |
| #synthrecord / #synthflush | Creator | Record synth output to file or clear saved notes. | `#synthrecord` |
| FX: echo/reverb/distort | Creator | Multi-voice effects on play channels. | `#echo` |
| Per-voice FX 1–3 | Creator | Individual echo/fcrush/autofilter/reverb/distort/vibrato/autowah. | `#echo1` |
| #tts / #ttsengine | Creator | Text-to-speech speak, queue, engine config. | `#tts` |
| Drums & AlgoSynth | Creator | Percussion voices and FM algorithm synthesis. | `zss/feature/synth/docs/drums.md` |
| MP3 recording | Creator | Record audio output to MP3 file. | `zss/feature/synth/docs/record-and-mp3.md` |
