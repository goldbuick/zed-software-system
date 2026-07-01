# heavy/

**Purpose**: Shared TTS inference library for on-demand **ttsspace** ([`ttsworker.ts`](../../device/ttsworker.ts)). Piper/Supertonic ONNX runs in the TTS worker; main thread calls `tts:info` / `tts:request` via [`device/tts.ts`](../tts.ts).

## Modules

| File | Purpose |
|------|---------|
| `tts.ts` | Piper/Supertonic TTS; `requestinfo`, `requestaudiobytes` |
| `pipertts.ts` | PiperTTS class — ONNX-based TTS |
| `supertonictts.ts` | SupertonicTTS class — Supertonic-TTS-2-ONNX via Transformers.js |
| `ttsfish.ts` | Fish Audio TTS backend |
| `modelcache.ts` | Piper fetch helper — Cache Storage API (`zss-heavy-models`) + per-URL singleflight |
| `utils.ts` | `RawAudio`, `TextSplitterStream`, `normalizePeak`, `trimSilence`, `detectWebGPU` |
| `textcleaner.ts` | `cleanTextForTTS`, `chunkText` |
| `formatstate.ts` | Board text formatters for `#query` / `#look` |
| `phonemizerparser.ts` | Phonemize text (JavaScript) |

## Exports (main)

| Function | Description |
|----------|-------------|
| `requestinfo` | TTS engine info (voices) |
| `requestaudiobytes` | Generate audio bytes from Piper/Supertonic/Fish |

## Consumed By

- `zss/device/ttsworker.ts` — Piper/Supertonic/Fish inference (`requestinfo`, `requestaudiobytes`)
- `zss/firmware/cli/commands/query.ts` — `#query` board snapshot text via `formatstate.ts`
