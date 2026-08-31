---
title: tts/
---

**Purpose**: Engine-agnostic text-to-speech. Main thread holds opaque state and playback queue; inference runs in **ttsspace**.

## Layout

| File | Role |
|------|------|
| [`client.ts`](../tts/client.ts) | Main-thread playback, queue, worker RPC (`ttsqueue`, `restorettsenginefromstorage`, …) |
| [`inference.ts`](../tts/inference.ts) | Worker: `requestinfo`, `requestaudiobytes` |
| [`engine.ts`](../tts/engine.ts) | `TTS_ENGINE`, `normalizettsengine` |
| [`pipertts.ts`](../tts/pipertts.ts), [`supertonictts.ts`](../tts/supertonictts.ts), [`ttsfish.ts`](../tts/ttsfish.ts) | Engine implementations (Supertonic = v3 / `Supertone/supertonic-3` via onnxruntime-web) |
| [`fishaudio.ts`](../tts/fishaudio.ts) | Fish API (worker-only via `ttsfish`) |
| [`modelcache.ts`](../tts/modelcache.ts), [`utils.ts`](../tts/utils.ts), [`textcleaner.ts`](../tts/textcleaner.ts), [`phonemizerparser.ts`](../tts/phonemizerparser.ts) | Shared helpers |

`cleantextfortts` (in `textcleaner.ts`) strips http(s)/ftp URLs, emoji, and non-Latin noise before synthesis. All engines apply it in `requestaudiobytes` (Fish included); Piper/Supertonic also re-clean via `TextSplitterStream`.

## Dependencies (client)

- `@henrygd/queue` — newQueue
- `zss/device` — createdevice
- `zss/device/api` — ttsinfo, ttsrequest, synthaudiobytes
- `zss/device/session` — SOFTWARE
- `zss/feature/tts/engine` — normalizettsengine, TTS_ENGINE
- `zss/mapping/guid` — createsid
- `zss/mapping/tick` — waitfor
- `zss/mapping/types` — MAYBE, ispresent

Main thread does **not** import `fishaudio.ts`. Engine-specific behavior lives in ttsspace (`inference.ts`, `ttsfish.ts`).

## Main-thread state (opaque)

| Variable | IDB key | Meaning (interpreted by worker) |
|----------|---------|----------------------------------|
| `ttsengine` | `config_ttsengine` | Active engine id |
| `ttsconfig` | `config_ttsengineconfig` | Engine config (HF path, API key, etc.) |
| `ttsmodel` | `config_ttsenginemodel` | Secondary slot (Fish model, etc.) |

## Exports (client)

| Function | Args | Description |
|----------|------|-------------|
| `selectttsengine` | `engine`, `config`, `model?` | Update in-memory engine slots |
| `applyttsengineconfig` | `player`, `engine`, `config`, `model?` | Unified setup: persist engine, validate+store config, or show config |
| `ttsinfo` | `player`, `info` | Worker info request |
| `ttsplay` / `ttsqueue` | … | Worker fetch encoded bytes → `synth:audiobytes` (synth decodes + plays) |

## Unified `#ttsengine` flow

1. **No config arg** — persist `config_ttsengine`, worker `tts:info` `config` with current slots, return display lines.
2. **With config arg** — worker `tts:info` `validate`, store slots on success, `apilog ready`.

All engines persist engine choice across refresh.

## Wire format

- `tts:request` — `[engine, config, voice, phrase, model]` (always passes both config slots)
- `tts:info` — `[engine, info, config, model]`

Info kinds (worker): `voices`, `config`, `status`, `validate`.

## Worker wiring

- Lazy spawn: `ensurettsworker()` in `zss/platform.ts`
- Entry: `zss/ttsspace.ts` → `zss/device/ttsworker.ts` → `zss/feature/tts/inference.ts`

## Consumed by

- `zss/device/synth.ts` — `#tts`, `#ttsqueue`, `#ttsinfo`, `#ttsengine`
- `zss/firmware/audio.ts` — firmware TTS commands
