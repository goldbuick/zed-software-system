# WIP intent capture (2025-06-25)

This document records what the in-flight working tree (36 modified + 11 untracked files) was trying to accomplish before a full reset to committed HEAD `bd5f50819`. Intent is preserved so goals can be re-landed as **separate small PRs**, not one bundled change.

## Baseline that worked

On HEAD `bd5f50819`, **Fish TTS runs on the main thread** in `zss/feature/tts.ts` via direct `requestfishaudiobytes(ttsconfig, voice, input, ttsfishmodel)`. Piper and Supertonic use ttsspace only.

## Known failure modes observed in WIP

| Symptom | Likely cause |
|---------|----------------|
| `fish tts>> Reference not found` | Fish moved to worker before dev smoke proved parity with main-thread path |
| Piper `HTTP error: 404` in worker console | Unified worker path passes `ttsconfig` (Fish API key) into Piper’s HuggingFace URL builder when engine is Piper but config still holds fish key |
| TTS queue hang after Fish error | Main-thread waiter only resolved on truthy `message.data`; worker replied `undefined` on failure |
| `window is not defined` in workers | Static import chains from Wanix/broadcast into `register.ts` / React (motivated worker import fixes) |

## Goals in the discarded WIP

### 1. Fish TTS in ttsspace worker (primary TTS goal — not working)

| Intent | Files |
|--------|-------|
| Route Fish through ttsspace like Piper/Supertonic | `zss/feature/tts.ts`, `zss/device/ttsworker.ts`, `zss/device/api.ts` |
| Worker-only Fish module | `zss/feature/heavy/ttsfish.ts` |
| Extend `tts:request` to 5-tuple `[engine, config, voice, phrase, model]` | `zss/device/api.ts` |
| Tests | `ops/tests/unit/device/ttsrequest.transit.test.ts`, `ttsworker.fish.test.ts`, `heavy/tts.fish.test.ts` |

**Why it failed:** Fish was removed from the proven main-thread path before worker parity was verified in dev. Unit tests passed tuple wiring, but runtime still broke. Too many coupled changes made bisection impossible.

**Safer redo:** Keep Fish on main thread until a dedicated PR proves worker parity with manual smoke:

```text
#ttsengine fish <api_key> s2.1-pro
#tts <reference_id> Hello
```

Do not unify the `config` slot across engines without engine-specific emit logic (Fish key vs Piper voice path).

### 2. Slim `device/api.ts` (partially done — mixed with TTS)

| Intent | Files |
|--------|-------|
| Move patch emit helpers to `zss/device/patchapi.ts` | `patchapi.ts`, sync module call sites |
| Worker-safe types in `zss/device/messagetypes.ts` | `api.ts`, `hub.ts`, `forward.ts` |
| ESLint guard on `api.ts` imports | `.eslintrc.cjs` |
| Docs | `zss/device/docs/devices-and-messaging.md`, `EXPORTED_FUNCTIONS.md` |

**Safer redo:** Land patchapi + messagetypes + ESLint **without touching `tts.ts` or `ttsworker.ts`**.

### 3. Worker React / import-chain fixes (likely valuable — bundled with TTS)

| Intent | Files |
|--------|-------|
| Break Wanix → `register.ts` → React chain in workers | `zss/feature/wanix/wanixfilematch.ts`, `wanixlaunch.ts` |
| Break broadcast → `bridge.ts` → React chain | `broadcastactive.ts`, `broadcastmenu.ts`, `registerplayer.ts` |
| Vite worker `@react-refresh` stub | `tasks/groups/app.ts`, `vite.config.ts` |

**Safer redo:** One PR per broken import chain + depcruise include for ttsspace. Verify workers boot with no `window is not defined`.

### 4. `brickurl` extraction (small refactor)

| Intent | Files |
|--------|-------|
| Move `brickproxiedurl` out of `zss/feature/url.ts` | `zss/feature/brickurl.ts`, `fishaudio.ts`, `media.ts`, `viewimage.tsx`, tests |

**Safer redo:** Mechanical import-path PR only; no TTS changes in same commit.

### 5. Other incidental edits (review after reset)

- `zss/device.ts` — session capture from any message (global behavior change)
- Wanix term iframe host tweaks
- Multiplayer CLI / firmware docs
- Gadget/boardrunner sync import path updates (patchapi migration)

## Rule going forward

**Fish stays on the main thread until the worker move is its own PR with manual smoke.** Do not bundle Fish worker migration with api slim, Wanix, or brickurl refactors.

## Recommended redo order

1. Worker React import fixes (Wanix, broadcast)
2. Slim `device/api.ts` (patchapi + messagetypes + ESLint)
3. `brickurl` extraction
4. Fish worker move — **last**, only after main-thread baseline re-verified

```text
reset → worker React fixes → api slim → brickurl → fish worker (last)
```

## Reset performed

Full reset to HEAD `bd5f50819`:

```bash
git checkout HEAD -- .
git clean -fd
```

Untracked files removed included: `messagetypes.ts`, `patchapi.ts`, `registerplayer.ts`, `brickurl.ts`, `broadcastactive.ts`, `broadcastmenu.ts`, `ttsfish.ts`, `wanixfilematch.ts`, and fish TTS unit tests added during WIP.
