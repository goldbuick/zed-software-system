# speechtotext.ts

**Purpose**: Browser speech recognition for voice input. `SpeechToText` class wraps Web Speech API with callbacks for final and interim results.

## Exports

| Export | Description |
|--------|-------------|
| `SpeechToText` | Class for speech recognition |

## Constructor

`SpeechToText(onFinalised, onEndEvent, onAnythingSaid?, language?)`

- `onFinalised` — Called with final transcript
- `onEndEvent` — Called when recognition ends
- `onAnythingSaid` — Optional; interim results (enables `interimResults`)
- `language` — Optional; defaults to `navigator.language`

## Methods

| Method | Description |
|--------|-------------|
| `startListening` | Start speech recognition |
| `stopListening` | Stop speech recognition |

## Browser Support

Requires `webkitSpeechRecognition` (Chrome). Throws if unsupported.

## Consumed By

- `zss/screens/terminal/input.tsx`
