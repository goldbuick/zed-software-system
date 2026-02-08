# index.ts

Main entry point and synth factory.

## Exports

### setupsynth()

```typescript
await setupsynth()
```

One-time async initialization. Registers AudioWorklet modules:
- Frequency Crusher
- Sidechain Compressor

Call before creating synths, especially for offline rendering.

### createsynth()

```typescript
const synth = createsynth()
```

Creates and returns a full synth instance (`AUDIO_SYNTH`).

## Returned API

| Method | Description |
|--------|-------------|
| `addplay(buffer)` | Parse notation and schedule playback |
| `addbgplay(buffer, quantize)` | Schedule background SFX |
| `stopplay()` | Clear scheduled notes |
| `setbpm(bpm)` | Set tempo (clears playback) |
| `setplayvolume(v)` | Main playback volume (0-100) |
| `setbgplayvolume(v)` | Background SFX volume |
| `setttsvolume(v)` | TTS volume |
| `addaudiobuffer(buffer)` | Play external audio (e.g. TTS) |
| `applyreset()` | Reset all sources and FX to defaults |
| `applyreplay(source, fxchain, fx)` | Restore state for replay |
| `synthreplay(pattern, maxtime)` | Schedule pattern for replay |
| `synthrecord(filename)` | Render to MP3 and download |
| `synthflush()` | Clear recording buffer |
| `destroy()` | Dispose all nodes |

## Properties

- `SOURCE` — Array of 8 source wrappers
- `FX` — Array of 4 FX channel groups
- `FXCHAIN` — Shared effect chain
- `changesource` — Function to change source type
- `broadcastdestination` — MediaStream for capture (if not offline)

## Internal Flow

1. Creates audio chain (audiochain.ts)
2. Creates source+FX setup (sourcefxsetup.ts)
3. Creates tick handler (tickhandler.ts)
4. Wraps tick handler in Tone.js Part (pacer)
5. Creates record handler (recordhandler.ts)
6. Starts pacer, applies defaults
