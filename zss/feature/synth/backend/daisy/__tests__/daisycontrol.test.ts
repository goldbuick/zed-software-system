import {
  DAISY_CONTROL_LEN,
  DAISY_SAB_CHANNEL_LEN,
  DAISY_SAB_CHANNEL_OFFSET,
  formatdaisyworkletsablayout,
} from '../daisycontrol'
import {
  WASM_ALGO_CFG_SAB_LEN,
  WASM_OSC_CFG_SAB_LEN,
  WASM_SAB_CHANNELS,
  WASM_VIBRATO_SAB_LEN,
  WASM_VOICE_CFG_SAB_LEN,
  WASM_VOICE_SAB_LEN,
} from '../../wasm/wasmsabchannels'

describe('daisycontrol layout', () => {
  it('matches wasm sab channel lengths', () => {
    expect(DAISY_SAB_CHANNEL_LEN.zss_voices).toBe(WASM_VOICE_SAB_LEN)
    expect(DAISY_SAB_CHANNEL_LEN.zss_voicecfg).toBe(WASM_VOICE_CFG_SAB_LEN)
    expect(DAISY_SAB_CHANNEL_LEN.zss_osccfg).toBe(WASM_OSC_CFG_SAB_LEN)
    expect(DAISY_SAB_CHANNEL_LEN.zss_algocfg).toBe(WASM_ALGO_CFG_SAB_LEN)
    expect(DAISY_SAB_CHANNEL_LEN.zss_vibrato).toBe(WASM_VIBRATO_SAB_LEN)
  })

  it('packs sab channels contiguously to control len', () => {
    let end = 0
    for (let i = 0; i < WASM_SAB_CHANNELS.length; i++) {
      const ch = WASM_SAB_CHANNELS[i]
      expect(DAISY_SAB_CHANNEL_OFFSET[ch.id]).toBe(end)
      expect(DAISY_SAB_CHANNEL_LEN[ch.id]).toBe(ch.len)
      end += ch.len
    }
    expect(DAISY_CONTROL_LEN).toBe(end)
  })

  it('worklet sab layout uses expected voicecfg and osccfg offsets', () => {
    expect(DAISY_SAB_CHANNEL_LEN.zss_voicecfg).toBe(80)
    expect(DAISY_SAB_CHANNEL_OFFSET.zss_osccfg).toBe(259)
    expect(formatdaisyworkletsablayout()).toContain('"zss_voicecfg": 80')
  })
})
