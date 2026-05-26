import { WASM_ALGO_OP_GAIN, WASM_ALGO_OUT_GAIN } from '../wasmlevels'
import { WASM_SYNTH_VOICE_PLAY_CODE } from '../voiceplaycode'

describe('wasm algovoice parity', () => {
  it('sums algo4 op2 and op4 in parallel (not averaged)', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('if (algo === 4) { out = op2 + op4; }')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).not.toContain('(op2 + op4) * 0.5')
  })

  it('sums algo5 and algo7 operator buses in parallel', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('if (algo === 5) { out = op2 + op3 + op4; }')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('if (algo === 7) { out = op1 + op2 + op3 + op4; }')
  })

  it('applies per-operator gain and outer algo envelope', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain(`var opgain = ${WASM_ALGO_OP_GAIN}`)
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('algooutenvs[i].adsr(1, gate)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain(`* ${WASM_ALGO_OUT_GAIN}`)
  })
})
