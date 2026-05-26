# WASM synth — Phase 0

Dev spike using [maximilian-js-local](https://github.com/Louismac/maximilian-js-local) vendored under `cafe/public/wasm/maximilian/`.

## Enable spike (optional)

In `cafe/.env.local`:

```
ZSS_WASM_SPIKE=true
```

Restart dev server. On first user gesture (click/key), audio init loads Maximilian WASM and plays the phase 0 440 Hz saw check. Without the spike flag, the full WASM synth backend boots instead.

## Files

| Path | Role |
|------|------|
| `cafe/public/wasm/maximilian/` | Vendored maximilian-js-local bundle |
| `zss/feature/synth/backend/wasm/` | `ensuresynthwasm()`, COOP/COEP SW, spike play code |
| `zss/device/synth.ts` | Routes firmware commands to `SynthBackend` |

## COOP/COEP

SharedArrayBuffer requires cross-origin isolation.

**Local dev:** Vite sends COOP/COEP headers directly. The service worker is **not** used in dev (it caused reload loops with HMR).

**Production:** set `wasmcoep: true` on the static server, or use the `enable-threads.js` service worker (one guarded reload max).

If you previously hit a reload loop, hard-refresh or clear site data to unregister the old service worker.

Verify STT (vosk) and TTS (Piper) still work with COOP/COEP enabled.

**Phase 0 is complete.** See [wasm-phase1.md](wasm-phase1.md) for voice playback.

## Broadcast

`synthbroadcastdestination()` returns a tap on the Maximilian `AudioWorkletNode`.
