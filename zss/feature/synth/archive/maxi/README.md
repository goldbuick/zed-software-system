# Archived Maximilian WASM synth stack

Archived May 2026. Replaced by DaisySP backend under `zss/feature/synth/backend/daisy/`.

Do not import from active code. This tree is kept for reference during the Maximilian removal migration.

## Contents

- Maximilian engine loader: `maximilian.ts`, `maxisynth.ts`, `bootwasmsynth.ts`
- Generated play-code strings: `*playcode.ts`, `voiceplaycode.ts`, `drumplaycode.ts`
- Adapter: `wasmsynthadapter.ts`
- Offline render / parity / bench: `wasmofflinerender.ts`, `wasmparityrender.ts`, `wasmperfbench.ts`
- Vendored runtime assets: `cafe/public/wasm/archive/maximilian/`

## Active replacements

| Archived | Replacement |
|----------|-------------|
| `bootwasmsynth()` / `createwasmsynth()` | `bootdaisysynth()` / `createdaisysynth()` in `backend/daisy/` |
| `maximilian.ts` worklet eval | `daisyengine.ts` + `zss_daisy_synth.cpp` |
| `voiceplaycode.ts` voice DSP | C++ `VoiceType` in `native/zss_daisy_synth.cpp` |
| `drumplaycode.ts` | DaisySP drum classes in C++ |
| `wasmfxplaycode.ts` | DaisySP FX modules in C++ |
| `wasmrecordhandler.ts` | `daisyrecordhandler.ts` |
| SAB + scheduler (shared) | Still active in `backend/wasm/` — not archived |

## Dev flags (removed)

- `ZSS_MAXI_SYNTH=true` — no longer supported
- `ZSS_DAISY_SYNTH=false` — no longer supported
- `ZSS_WASM_SPIKE=true` — archived with Maxi
- `ZSS_WASM_PERF` — archived with Maxi

## Parity fixtures

Historical Maxi self-check fixtures live in `__fixtures__/parity-metrics.json`. Active parity gates use Tone reference (`parity-metrics-tone.json`) and Daisy drum fixtures (`parity-metrics-daisy.json`) under `backend/wasm/__fixtures__/`.
