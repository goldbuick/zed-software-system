# Recording & MP3 export

## Active path — WASM (`backend/wasm/wasmrecordhandler.ts` + `wasmofflinerender.ts`)

`#synthrecord` on the WASM backend:

1. Captures tick events during live playback (`RECORDING_STATE` in `shared/recording.ts`)
2. Snapshots voice/FX state via `wasmreplaystate.ts`
3. Boots an isolated Maximilian engine on `OfflineAudioContext`
4. Replays ticks with `OfflineAudioContext.suspend()` hooks for sample-accurate SAB updates
5. Renders via `startRendering()` (faster than real time; live synth unaffected)
6. Converts rendered `AudioBuffer` to MP3 via `converttomp3()`
7. Triggers download

If `OfflineAudioContext` or offline worklet boot fails, `#synthrecord` surfaces an error (no real-time fallback).

---

## Archived Tone.js path (`archive/tone/recordhandler.ts`)

### synthflush()

Clears recording state:
- `recordedticks = []`
- `recordlastpercent = 0`
- `recordisrendering = 0`

### synthrecord(filename?)

1. Collects `recordedticks` from tick handler
2. Computes duration: `max(time) - min(time) + 5` seconds
3. Shifts all times so min = 0.1 (small headroom)
4. Captures source/FX state via `getreplay()`
5. Creates offline context with `Offline()`
6. Rebuilds synth: `await setupsynth()`, `createsynth()`
7. Applies state: `applyreplay()`, `synthreplay()`
8. Renders
9. Converts buffer to MP3 via `converttomp3()`
10. Triggers download via `<a download>`
11. Destroys temporary synth

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
