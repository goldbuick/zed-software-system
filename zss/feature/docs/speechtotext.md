# speechtotext.ts

**Purpose**: Local, offline speech recognition using vosk-browser (Kaldi via WebAssembly). Runs entirely in the browser with no server calls.

## Exports

| Export | Description |
|--------|-------------|
| `SpeechToText` | Class for speech recognition |

## Constructor

`SpeechToText(onfinalised, onendevent, onanythingsaid?)`

- `onfinalised` — Called with final transcript text
- `onendevent` — Called when recognition ends or is stopped
- `onanythingsaid` — Optional; called with partial/interim results

## Methods

| Method | Description |
|--------|-------------|
| `startlistening` | Async. Loads model (cached singleton), opens mic, begins recognition |
| `stoplistening` | Stops mic, disconnects audio, fires end event |

## Model

Uses `vosk-model-small-en-us-0.15` (~39 MB), served from `/models/` (Vite public directory). The model is loaded once and shared across all `SpeechToText` instances.

## Requirements

- HTTPS (secure context)
- `Cross-Origin-Embedder-Policy: require-corp` and `Cross-Origin-Opener-Policy: same-origin` headers for SharedArrayBuffer
- Microphone permission

## Consumed By

- `zss/screens/terminal/input.tsx`
