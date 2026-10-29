---
title: "Recording & MP3 export"
---

## Active path — Daisy (`backend/daisy/daisyrecordhandler.ts` + `daisyofflinerender.ts`)

`#synthrecord` on the Daisy backend:

1. Captures tick events during live playback (`RECORDING_STATE` in `shared/recording.ts`)
2. Snapshots voice/FX state via `wasmreplaystate.ts`
3. Boots an isolated Daisy engine on `OfflineAudioContext`
4. Replays ticks with offline render hooks for sample-accurate SAB updates
5. Renders via `startRendering()` (faster than real time). Offline and live engines each own SAB channel buffers (`sabpush` / `sabseq` are scoped per `SabEngine`), so render pushes do not drive the live worklet. Tape logs `rendering audio N%` every 5% via the offline tick hook
6. Applies **-3 dB** export headroom (`RECORD_EXPORT_TRIM_DB` / `trimaudiobufferdb`) before lamejs
7. Converts rendered `AudioBuffer` to MP3 via `converttomp3()`
8. Triggers download

If `OfflineAudioContext` or offline worklet boot fails, `#synthrecord` surfaces an error (no real-time fallback).

---

## mp3.ts

### converttomp3(buffer: AudioBuffer)

Converts a Web Audio `AudioBuffer` to MP3 using lamejs.

**Process:**
1. Read stereo PCM from channels 0/1 (mono duplicates channel 0)
2. Create Mp3Encoder(2, sampleRate, 128) — stereo, 128 kbps
3. Process in 1152-sample blocks (lamejs requirement)
4. Convert float32 → int16 (scale to ±32767)
5. Encode each block
6. Flush encoder
7. Concatenate all chunks to Uint8Array

**Dependency:** `@breezystack/lamejs`
