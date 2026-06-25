# tts.ts

**Purpose**: Text-to-speech orchestration. Supports Piper, Supertonic (ttsspace worker), and Fish Audio (main-thread SDK). Queues playback and integrates with synth.

## Dependencies

- `@henrygd/queue` — newQueue
- `fish-audio` — Fish Audio SDK (engine `fish` only)
- `zss/device` — createdevice
- `zss/device/api` — ttsinfo, ttsrequest, synthaudiobuffer
- `zss/device/session` — SOFTWARE
- `zss/feature/fishaudio` — Fish TTS client
- `zss/mapping/guid` — createsid
- `zss/mapping/tick` — waitfor
- `zss/mapping/types` — MAYBE, ispresent

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `selectttsengine` | `engine`, `config` | Set engine (`piper`, `supertonic`, `fish`) and config |
| `ttsinfo` | `player`, `info` | Request engine info (e.g. voices list) |
| `ttsplay` | `player`, `voice`, `input` | Play text as speech |
| `ttsqueue` | `player`, `voice`, `input` | Queue text for playback |
| `ttsclearqueue` | — | Clear TTS queue |

## Engine flow

- **Piper / Supertonic**: [`heavy/tts.ts`](../heavy/tts.ts) in **ttsspace** worker; audio bytes returned via `tts:request`
- **Fish**: [`fishaudio.ts`](../fishaudio.ts) — `fish-audio` SDK via [`brickproxiedurl`](../url.ts) → `brick.zed.cafe` → `api.fish.audio`

### Fish Audio setup

```text
#ttsengine fish <your_fish_api_key> [model]
#tts <reference_id> Hello, you're doing great.
```

- First line sets the engine, API key, and optional model (`s2.1-pro` default, or `s2.1-pro-free`, `s2-pro`, `s1`)
- Persisted in IndexedDB as `config_ttsengine`, `config_ttsengineconfig`, `config_ttsenginemodel` (restored on login)
- `#ttsengine fish` (no key) or `#tts config` — show saved config (model + masked api key)
- Fish API errors (e.g. 402 insufficient credit) appear in the terminal scrollback
- Each `#tts` call logs the Fish [POST /v1/tts](https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech) payload (model header, masked key, reference_id, text, format) before the request
- Second line: `voice` = Fish `reference_id`, not the key

## Worker wiring (piper / supertonic)

- Lazy spawn: `ensurettsworker()` in `zss/platform.ts` on first `tts:info` / `tts:request`
- Worker device: `zss/device/ttsworker.ts`
- Fish does **not** use ttsspace

## Consumed by

- `zss/device/synth.ts` — `#tts`, `#ttsqueue`, `#ttsinfo`
- `zss/firmware/audio.ts` — firmware TTS commands
