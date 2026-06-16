import { WASM_SPIKE_PLAY_CODE } from 'zss/feature/synth/archive/maxi/spikeplay'
import { WASM_SYNTH_VOICE_PLAY_CODE } from 'zss/feature/synth/archive/maxi/voiceplaycode'
import {
  formatwasmplaycodelint,
  lintwasmplaycode,
} from 'zss/feature/synth/archive/maxi/wasmplaycodelint'

describe('wasm play code lint', () => {
  it('reports undefined identifiers in broken code', () => {
    const result = lintwasmplaycode(`
function play(inputsample) {
  return missinghelper(inputsample);
}
`)
    expect(result.ok).toBe(false)
    expect(result.issues.some((issue) => issue.name === 'missinghelper')).toBe(
      true,
    )
  })

  it('allows known worklet globals', () => {
    const result = lintwasmplaycode(`
function play(inputsample) {
  var osc = new Module.maxiOsc();
  var sr = typeof sampleRate !== 'undefined' ? sampleRate : 44100;
  return osc.sinewave(440 / sr) + inputsample;
}
`)
    expect(result.ok).toBe(true)
  })

  it('lints the assembled synth voice bundle without undefined refs', () => {
    const result = lintwasmplaycode(WASM_SYNTH_VOICE_PLAY_CODE, [
      'SAB_SEQ_MASTER',
    ])
    if (!result.ok) {
      throw new Error(
        formatwasmplaycodelint('WASM_SYNTH_VOICE_PLAY_CODE', result),
      )
    }
    expect(result.ok).toBe(true)
  })

  it('lints the spike boot bundle without undefined refs', () => {
    const result = lintwasmplaycode(WASM_SPIKE_PLAY_CODE)
    if (!result.ok) {
      throw new Error(formatwasmplaycodelint('WASM_SPIKE_PLAY_CODE', result))
    }
    expect(result.ok).toBe(true)
  })
})
