---
title: TTS voices
description: Player reference for #ttsengine, #tts, #ttsqueue, and #ttsvol.
---

Speak text with a voice. Engine setup for developers: [tts](/feature/tts).

## Text to speech

### #ttsengine

No arguments lists the engines: piper, supertonic, fish.

`#ttsengine <engine> [config] [model]` sets the engine. Fish needs an api key and an optional model.

```text
#ttsengine fish <api_key> [s2.1-pro-free|s2.1-pro|s2-pro|s1]
```

### #tts

`#tts` with no arguments clears the tts queue.

`#tts <voice>` shows info for that voice.

`#tts <voice> <phrase>` speaks the phrase with that voice.

Fish speaks with `#tts <reference_id> phrase` (via brick.zed.cafe).

### #ttsqueue

`#ttsqueue <voice> <phrase>` queues a phrase without interrupting the current speech.

### #ttsvol

`#ttsvol <volume>` sets the tts volume.
