import { WASM_SPIKE_PLAY_CODE } from '../zss/feature/synth/backend/wasm/spikeplay.ts'
import { WASM_SYNTH_VOICE_PLAY_CODE } from '../zss/feature/synth/backend/wasm/voiceplaycode.ts'
import {
  formatwasmplaycodelint,
  lintwasmplaycode,
} from '../zss/feature/synth/backend/wasm/wasmplaycodelint.ts'

const bundles = [
  ['WASM_SYNTH_VOICE_PLAY_CODE', WASM_SYNTH_VOICE_PLAY_CODE],
  ['WASM_SPIKE_PLAY_CODE', WASM_SPIKE_PLAY_CODE],
] as const

let failed = false

for (const [name, code] of bundles) {
  const result = lintwasmplaycode(code)
  console.info(formatwasmplaycodelint(name, result))
  if (!result.ok) {
    failed = true
  }
}

if (failed) {
  process.exitCode = 1
}
