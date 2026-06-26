# tts.ts

**Purpose**: Engine-agnostic text-to-speech orchestration. All engines use ttsspace; main thread holds opaque state and generic worker emit/wait.

## Dependencies

- `@henrygd/queue` — newQueue
- `zss/device` — createdevice
- `zss/device/api` — ttsinfo, ttsrequest, synthaudiobuffer
- `zss/device/messagetypes` — isttsvalidatereply
- `zss/device/session` — SOFTWARE
- `zss/feature/ttsengine` — normalizettsengine, TTS_ENGINE
- `zss/mapping/guid` — createsid
- `zss/mapping/tick` — waitfor
- `zss/mapping/types` — MAYBE, ispresent

Main thread does **not** import `fishaudio.ts`. Engine-specific behavior lives in ttsspace (`heavy/tts.ts`, `heavy/ttsfish.ts`).

## Main-thread state (opaque)

| Variable | IDB key | Meaning (interpreted by worker) |
|----------|---------|----------------------------------|
| `ttsengine` | `config_ttsengine` | Active engine id |
| `ttsconfig` | `config_ttsengineconfig` | Engine config (HF path, API key, etc.) |
| `ttsmodel` | `config_ttsenginemodel` | Secondary slot (Fish model, etc.) |

## Exports

| Function | Args | Description |
|----------|------|-------------|
| `selectttsengine` | `engine`, `config`, `model?` | Update in-memory engine slots |
| `applyttsengineconfig` | `player`, `engine`, `config`, `model?` | Unified setup: persist engine, validate+store config, or show config |
| `ttsinfo` | `player`, `info` | Worker info request |
| `ttsplay` / `ttsqueue` | … | Playback via worker fetch + decode |

## Unified `#ttsengine` flow

1. **No config arg** — persist `config_ttsengine`, worker `tts:info` `config` with current slots, return display lines.
2. **With config arg** — worker `tts:info` `validate`, store slots on success, `apilog ready`.

All engines persist engine choice across refresh.

## Wire format

- `tts:request` — `[engine, config, voice, phrase, model]` (always passes both config slots)
- `tts:info` — `[engine, info, config, model]`

Info kinds (worker): `voices`, `config`, `status`, `validate`.

## Worker modules

| Engine | Module |
|--------|--------|
| Piper | [`heavy/pipertts.ts`](../heavy/pipertts.ts) |
| Supertonic | [`heavy/supertonictts.ts`](../heavy/supertonictts.ts) |
| Fish | [`heavy/ttsfish.ts`](../heavy/ttsfish.ts) → [`fishaudio.ts`](../fishaudio.ts) |

## Worker wiring

- Lazy spawn: `ensurettsworker()` in `zss/platform.ts`
- Entry: `zss/ttsspace.ts` → `zss/device/ttsworker.ts` → `zss/feature/heavy/tts.ts`

## Consumed by

- `zss/device/synth.ts` — `#tts`, `#ttsqueue`, `#ttsinfo`, `#ttsengine`
- `zss/firmware/audio.ts` — firmware TTS commands
