import { WASM_MASTER_PLAY_CODE } from '../wasmmasterplaycode'
import { wirewasmmasterchain } from '../wasmmasterchain'
import { WASM_SYNTH_VOICE_PLAY_CODE } from '../voiceplaycode'

describe('wasmmasterplaycode', () => {
  it('includes duck, compressor, razzle, and masterout', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxreverbfeedback')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function updateplayvibratodepth')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function addfxparallelwet')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxautofilter0')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function addfxparallelwetplay')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('playin + wetplay')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautowahbus')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxdistortwet')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('playbuswahenv')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('addfxparallelwetplay(playin, 6, fxautowahbus)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxechodelay0')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('Math.tanh(x * k) / Math.tanh(k)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxrevcomb3')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxecho')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var PLAY_VOICE_COUNT = 4')
    expect(WASM_MASTER_PLAY_CODE).toContain('function readbgplayvolume')
    expect(WASM_MASTER_PLAY_CODE).toContain('function readbgplayvolraw')
    expect(WASM_MASTER_PLAY_CODE).toContain('function masterout')
    expect(WASM_MASTER_PLAY_CODE).toContain('function startduck')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applycompressor')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applyrazzle')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_WET_MIX')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_HISS_GAIN')
    expect(WASM_MASTER_PLAY_CODE).toContain('function ismastermuted')
    expect(WASM_MASTER_PLAY_CODE).toContain('if (volgain <= 0)')
    expect(WASM_MASTER_PLAY_CODE).toContain('i === 3')
    expect(WASM_MASTER_PLAY_CODE).toContain('i === 9')
  })
})

describe('wasmmasterchain', () => {
  it('connects worklet directly to destination as mono', () => {
    const connects: Array<[unknown, number?, number?]> = []
    const destination = {
      channelInterpretation: '',
      channelCountMode: '',
    }
    const ctx = { destination }
    const worklet = {
      channelCount: 0,
      channelCountMode: '',
      channelInterpretation: '',
      disconnect: () => {},
      connect: (...args: [unknown, number?, number?]) => {
        connects.push(args)
      },
    }
    const chain = wirewasmmasterchain(ctx as any, worklet as any)
    expect(chain.wired).toBe(true)
    expect(worklet.channelCount).toBe(1)
    expect(connects).toEqual([[destination]])
  })
})
