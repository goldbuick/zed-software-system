# tts.ts

**Purpose**: Text-to-speech orchestration. Supports multiple engines (Edge, Piper, Supertonic). Dispatches to device for Edge TTS; uses on-demand **ttsspace** worker for Piper/Supertonic. Queues playback and integrates with synth.

## Dependencies

- `@henrygd/queue` — newQueue
- `tone` — getContext (decodeAudioData)
- `zss/device` — createdevice
- `zss/device/api` — ttsinfo, ttsrequest, synthaudiobuffer
- `zss/device/session` — SOFTWARE
- `zss/mapping/guid` — createsid
- `zss/mapping/tick` — waitfor
- `zss/mapping/types` — MAYBE, ispresent

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `selectttsengine` | `engine`, `config` | Set engine (`'piper'` \| `'supertonic'`) and config |
| `requestaudiobuffer` | `player`, `voice`, `input` | Request audio buffer (Piper/Supertonic via ttsspace) |
| `ttsinfo` | `player`, `info` | Request engine info (e.g. voices list) |
| `ttsplay` | `player`, `voice`, `input` | Play text as speech |
| `ttsqueue` | `player`, `voice`, `input` | Queue text for playback |
| `ttsclearqueue` | — | Clear TTS queue |

## Engine Flow

- **Edge**: Device sends request; responds with `tts:request` data
- **Piper/Supertonic**: [`heavy/tts.ts`](../heavy/tts.ts) loads model in **ttsspace**, generates audio, returns bytes; decoded and played via synth

## Worker wiring

- Lazy spawn: `ensurettsworker()` in `zss/platform.ts` on first `tts:info` / `tts:request`
- Worker device: `zss/device/ttsworker.ts`
- Inference library: `zss/feature/heavy/tts.ts` (shared with heavy feature modules)
- Session lifetime: worker stays alive until `haltplatform` / `sessionreset`

## GPU

TTS shares WebGPU with STT and the Gemma agent (heavy worker). VRAM contention is possible on low-end GPUs.

## Consumed By

- `zss/device/synth.ts` — `#tts`, `#ttsqueue`, `#ttsinfo`
- `zss/firmware/audio.ts` — firmware TTS commands
