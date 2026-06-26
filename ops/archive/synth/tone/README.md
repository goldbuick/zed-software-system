# Archived Tone.js synth stack

Archived May 2026. Replaced by DaisySP backend under `zss/feature/synth/backend/daisy/`.

Do not import from active code. This tree is kept for reference during the Tone.js removal migration.

## Contents

- Core synth graph: `index.ts`, `audiochain.ts`, `source.ts`, `fx.ts`, drums, worklets
- Voice routing: `voiceconfig/`, `voicefx/`
- Recording: `recordhandler.ts` (Tone `Offline()` render)

## Active replacements

| Archived | Replacement |
|----------|-------------|
| `createsynth()` / Tone Transport | `backend/daisy/daisysynth.ts` + `backend/wasm/wasmplayscheduler.ts` |
| `source.ts` voice types | `shared/sourcetype.ts` |
| `recordhandler.ts` | `backend/daisy/daisyrecordhandler.ts` |
| `voiceconfig/` / `voicefx/` | `backend/wasm/wasmvoiceconfig.ts` / `wasmfxstate.ts` |
