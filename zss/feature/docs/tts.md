# tts.ts

**Purpose**: Text-to-speech orchestration. Supports multiple engines (Edge, Piper, Kitten). Dispatches to device for Edge TTS; uses `heavy/tts` for Piper/Kitten. Queues playback and integrates with synth.

## Dependencies

- `@henrygd/queue` — newQueue
- `tone` — getContext (decodeAudioData)
- `zss/device` — createdevice
- `zss/device/api` — heavyttsinfo, heavyttsrequest, synthaudiobuffer
- `zss/device/session` — SOFTWARE
- `zss/mapping/guid` — createsid
- `zss/mapping/tick` — waitfor
- `zss/mapping/types` — MAYBE, ispresent

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `selectttsengine` | `engine`, `config` | Set engine (`'piper'` \| `'kitten'`) and config |
| `requestaudiobuffer` | `player`, `voice`, `input` | Request audio buffer (Edge TTS via device) |
| `requestaudiobytes` | `player`, `engine`, `config`, `voice`, `input` | Request raw bytes (Piper/Kitten via heavy) |
| `ttsinfo` | `player`, `info` | Request engine info (e.g. voices list) |
| `ttsplay` | `player`, `voice`, `input` | Play text as speech |
| `ttsqueue` | `player`, `voice`, `input` | Queue text for playback |
| `ttsclearqueue` | — | Clear TTS queue |

## Engine Flow

- **Edge**: Device sends request; responds with `heavy:ttsrequest` data
- **Piper/Kitten**: `heavy/tts.ts` loads model, generates audio, returns bytes; decoded and played via synth
