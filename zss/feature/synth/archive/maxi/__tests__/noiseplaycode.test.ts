import { WASM_NOISE_PLAY_CODE } from 'zss/feature/synth/archive/maxi/noiseplaycode'
import { WASM_SYNTH_VOICE_PLAY_CODE } from 'zss/feature/synth/archive/maxi/voiceplaycode'

describe('noiseplaycode', () => {
  it('ports BeepBox noiseSynth pitch-relative smoothing', () => {
    expect(WASM_NOISE_PLAY_CODE).toContain('pitchfiltermult')
    expect(WASM_NOISE_PLAY_CODE).toContain('WASM_NOISE_SOFT_GAIN')
    expect(WASM_NOISE_PLAY_CODE).toContain('METALLIC_WAVE_NORM')
    expect(WASM_NOISE_PLAY_CODE).toContain('buf[idx + 1]')
    expect(WASM_NOISE_PLAY_CODE).toContain('envout < 0.00005')
    expect(WASM_NOISE_PLAY_CODE).toContain('noisesample[i] = 0')
  })

  it('is injected into voice play bundle', () => {
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('function noisevoice')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('noiseHollow')
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('noiseWhite')
    expect(
      WASM_SYNTH_VOICE_PLAY_CODE.indexOf('var VOICE_COUNT = 8'),
    ).toBeLessThan(WASM_SYNTH_VOICE_PLAY_CODE.indexOf('function noisevoice'))
    expect(WASM_SYNTH_VOICE_PLAY_CODE).toContain('noisesample.push(0)')
  })
})
