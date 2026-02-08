# recordhandler.ts & mp3.ts

## recordhandler.ts

Handles recording of synth playback to MP3.

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

**Progress:** Writes to register during: "create synth", "synth waiting for setup", "rendering audio", "rendering complete, exporting mp3", "saving file X.mp3"

**Filename:** Uses `createnameid()` if not provided.

---

## mp3.ts

### converttomp3(buffer: ToneAudioBuffer)

Converts Tone.js AudioBuffer to MP3 using lamejs.

**Process:**
1. Get mono PCM from channel 0
2. Create Mp3Encoder(1, sampleRate, 128) — mono, 128 kbps
3. Process in 1152-sample blocks (lamejs requirement)
4. Convert float32 → int16 (scale to ±32767)
5. Encode each block
6. Flush encoder
7. Concatenate all chunks to Uint8Array

**Dependency:** `@breezystack/lamejs`
