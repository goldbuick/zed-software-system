import { WASM_MASTER_PLAY_CODE } from '../wasmmasterplaycode'
import { wirewasmmasterchain } from '../wasmmasterchain'
import { WASM_SYNTH_VOICE_PLAY_CODE } from '../voiceplaycode'

describe('wasmmasterplaycode', () => {
  it('includes duck, compressor, razzle, and masterout', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxreverbfeedback')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function updateplayvibratodepth')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function addfxserialwet')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function applyfxgroup')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(play0, 0)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(play1, 1)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(bgvoices, 2)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(ttsraw, 3)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function oscmodwave')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('modenvs[i].adsr')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautofilterbus')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxautofilterphase0')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautowahbus')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxautowahfollower0')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function autowahsweephz')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('drumbiquadcoef(\'peaking\'')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function tonedistort')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxdistortwet')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxechodelay[group].dl')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('Math.tanh(x * k) / Math.tanh(k)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxrevcomb3')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxecho')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var PLAY_VOICE_COUNT = 4')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function readvoicecfgsab')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function glidefreq')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('setparams')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function readosccfgsab')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function readalgocfgsab')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function play(inputsample)')
    expect(WASM_MASTER_PLAY_CODE).toContain('var MASTER_SR = typeof sampleRate')
    expect(WASM_MASTER_PLAY_CODE.indexOf('var MASTER_SR')).toBeLessThan(
      WASM_MASTER_PLAY_CODE.indexOf('scattackcoef'),
    )
    expect(WASM_MASTER_PLAY_CODE).toContain('function readttsvolraw')
    expect(WASM_MASTER_PLAY_CODE).toContain('function sidechaintriggersample')
    expect(WASM_MASTER_PLAY_CODE).toContain('SC_DRUM_SEND_TRIM')
    expect(WASM_MASTER_PLAY_CODE).toContain('sidechaintriggersample(bg, ttssidechain, drumsidechainout())')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function drumsidechainout')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('drumsidechainsample = sc')
    expect(WASM_MASTER_PLAY_CODE).toContain('function masterout')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applycompressor')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applyrazzle')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_WET_MIX')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_HISS_GAIN')
    expect(WASM_MASTER_PLAY_CODE).toContain('function ismastermuted')
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
