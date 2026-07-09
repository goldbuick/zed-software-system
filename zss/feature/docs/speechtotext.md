# stt/speechtotext.ts

**Purpose**: Local speech recognition via `@huggingface/transformers` (Moonshine ONNX) in an on-demand **sttspace** worker. Mic capture runs on the main thread; model load and transcribe run in the worker (WebGPU).

## Exports

| Export | Description |
|--------|-------------|
| `SpeechToText` | Class for speech recognition |

## Constructor

`SpeechToText(onfinalised, onendevent, onworking?)`

- `onfinalised` — Called with final transcript text after a speech pause
- `onendevent` — Called when recognition ends or is stopped
- `onworking` — Optional; status toasts (model load, listening, transcribing)

## Methods

| Method | Description |
|--------|-------------|
| `startlistening` | Async. Ensures sttspace worker + model (Hub cache), opens mic, begins pause-based capture |
| `stoplistening` | Stops mic, disconnects audio, fires end event |

## Model

Default: `onnx-community/moonshine-base-ONNX` (`q4`, WebGPU). Downloaded from Hugging Face Hub on first use and cached by the browser.

Configured in `zss/feature/stt/sttpreset.ts`.

## UX

Pause-based (not live partials): terminal shows listening status while you speak; transcript is sent after ~750ms silence.

## Requirements

- HTTPS (secure context) for mic + WebGPU
- Microphone permission
- First run needs network for Hub model download; later runs work offline from cache

## Worker wiring

- Lazy spawn: `ensuresttworker()` in `zss/platform.ts` on first `stt:*` message
- Client RPC: `zss/feature/stt/sttclient.ts` (`sttensure`, `stttranscribe`)
- Worker device: `zss/device/sttworker.ts`

## Consumed By

- `zss/screens/terminal/input.tsx`
