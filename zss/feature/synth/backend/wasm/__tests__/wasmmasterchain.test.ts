import { WASM_SYNTH_VOICE_PLAY_CODE } from '../voiceplaycode'
import { wirewasmmasterchain } from '../wasmmasterchain'
import { WASM_MASTER_PLAY_CODE } from '../wasmmasterplaycode'

describe('wasmmasterplaycode', () => {
  it('includes duck, compressor, razzle, and masterout', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxreverbfeedback')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain(
      'function updateplayvibratodepth',
    )
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var WASM_PERF_MODE =')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function applyfxgroup')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(play0, 0)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(play1, 1)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(bgvoices, 2)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('applyfxgroup(ttsraw, 3)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function oscmodwave')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('modenvs[i].adsr')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautofilterbus')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var fxautofilterphase = [')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautowahbus')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxautowahfollower[group]')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function autowahsweephz')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain("drumbiquadcoef('peaking'")
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('DRUM_CLAP_HP')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('DRUM_TICK_HP')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('DRUM_TWEET_HP')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).not.toContain('WASM_DRUM_CLAP_DRY')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function tonedistort')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxdistortwet')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxechodelay[group].dl')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain(
      'Math.tanh(x * k) / Math.tanh(k)',
    )
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('fxrevcomb3')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxecho')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var PLAY_VOICE_COUNT = 4')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function readvoicecfgsab')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function glidefreq')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('Math.round(port * sr)')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('Math.pow(end / start, progress)')
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
    expect(WASM_MASTER_PLAY_CODE).toContain(
      'sidechaintriggersample(bg, ttssidechain, drumsidechainout())',
    )
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function drumsidechainout')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('drumsidechainsample = sc')
    expect(WASM_MASTER_PLAY_CODE).toContain('function masterout')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applycompressor')
    expect(WASM_MASTER_PLAY_CODE).toContain('function applyrazzle')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_WET_MIX')
    expect(WASM_MASTER_PLAY_CODE).toContain('RAZZLE_HISS_GAIN')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toMatch(
      /if \(WASM_PERF_MODE\) \{\s*return out;/,
    )
    expect(WASM_MASTER_PLAY_CODE).toContain('function ismastermuted')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain(
      'function readsynthcontrolsifdue',
    )
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function readsynthcontrolblock')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function sabseqchanged')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function refreshfxsends')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function refreshfxparams')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function refreshfxsnapshot')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function voiceissilent')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fatosccount')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var voicegains = []')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('var detunemuls = []')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('refreshinc')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('this.atkinc')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautofiltercoefat')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function fxautowahcoefsat')
    expect(WASM_MASTER_PLAY_CODE).toContain('function refreshmastergains')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).not.toContain('filtlow.push')
  })
})

describe('wasmmasterchain', () => {
  it('connects worklet directly to destination as mono', () => {
    const connects: [unknown, number?, number?][] = []
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
