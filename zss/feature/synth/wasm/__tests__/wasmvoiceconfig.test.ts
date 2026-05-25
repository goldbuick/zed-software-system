import { SOURCE_TYPE } from 'zss/feature/synth/source'

import { WASM_OSC_TYPE, parsewasmosc } from '../wasmosctype'
import { initwasmvoicesab } from '../maxisynth'
import {
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  wasmvoicestatetosab,
} from '../wasmvoiceconfig'
import { wasmvoicecfgtosab } from '../wasmvoicecfgsab'

describe('wasmosctype', () => {
  it('parses basic waves', () => {
    expect(parsewasmosc('sine')).toBe(WASM_OSC_TYPE.SINE)
    expect(parsewasmosc('square')).toBe(WASM_OSC_TYPE.SQUARE)
    expect(parsewasmosc('fmsquare')).toBe(WASM_OSC_TYPE.FM_SQUARE)
  })
})

describe('wasmvoiceconfig', () => {
  it('maps retro to RETRO_NOISE', () => {
    const voices = defaultwasmvoicestate()
    expect(applywasmvoiceconfig(voices, 0, 'retro', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.RETRO_NOISE)
  })

  it('maps sine to SYNTH with sine oscillator', () => {
    const voices = defaultwasmvoicestate()
    expect(applywasmvoiceconfig(voices, 0, 'sine', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.SINE)
  })

  it('maps fmsquare to SYNTH with fm square oscillator', () => {
    const voices = defaultwasmvoicestate()
    applywasmvoiceconfig(voices, 0, 'bells', '')
    expect(applywasmvoiceconfig(voices, 0, 'fmsquare', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.FM_SQUARE)
  })

  it('maps algo3 to ALGO_SYNTH algorithm 3', () => {
    const voices = defaultwasmvoicestate()
    expect(applywasmvoiceconfig(voices, 2, 'algo3', '')).toBe(true)
    expect(voices[2].type).toBe(SOURCE_TYPE.ALGO_SYNTH)
    expect(voices[2].algo).toBe(3)
  })

  it('maps noise and hollow chip types', () => {
    const voices = defaultwasmvoicestate()
    expect(applywasmvoiceconfig(voices, 0, 'noise', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.WHITE_NOISE)
    expect(applywasmvoiceconfig(voices, 1, 'hollow', '')).toBe(true)
    expect(voices[1].type).toBe(SOURCE_TYPE.HOLLOW_NOISE)
  })

  it('restart resets all voices to SYNTH square', () => {
    const voices = defaultwasmvoicestate()
    applywasmvoiceconfig(voices, 0, 'bells', '')
    applywasmvoiceconfig(voices, 1, 'sine', '')
    applywasmvoiceconfig(voices, 0, 'restart', '')
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.SQUARE)
    expect(voices[1].type).toBe(SOURCE_TYPE.SYNTH)
  })

  it('merges voice type and osc into play sab stride', () => {
    const voices = defaultwasmvoicestate()
    applywasmvoiceconfig(voices, 1, 'sine', '')
    const playstate = new Array(24).fill(0)
    playstate[6] = 523.25
    playstate[7] = 1
    const merged = wasmvoicestatetosab(voices, playstate, 6)
    expect(merged[6]).toBe(523.25)
    expect(merged[7]).toBe(1)
    expect(merged[8]).toBe(SOURCE_TYPE.SYNTH)
    expect(merged[11]).toBe(WASM_OSC_TYPE.SINE)
  })

  it('maps envelope and portamento into voice cfg sab', () => {
    const voices = defaultwasmvoicestate()
    expect(
      applywasmvoiceconfig(voices, 0, 'envelope', [0.02, 0.1, 0.4, 0.2]),
    ).toBe(true)
    expect(voices[0].envelope).toEqual({
      attack: 0.02,
      decay: 0.1,
      sustain: 0.4,
      release: 0.2,
    })
    expect(applywasmvoiceconfig(voices, 0, 'portamento', 0.25)).toBe(true)
    expect(voices[0].portamento).toBe(0.25)

    const sab = wasmvoicecfgtosab(voices)
    expect(sab[0]).toBe(0.02)
    expect(sab[1]).toBe(0.1)
    expect(sab[2]).toBe(0.4)
    expect(sab[3]).toBe(0.2)
    expect(sab[4]).toBe(0.25)
  })

  it('portamento applies only to synth and algo voices', () => {
    const voices = defaultwasmvoicestate()
    applywasmvoiceconfig(voices, 0, 'retro', '')
    expect(applywasmvoiceconfig(voices, 0, 'portamento', 0.5)).toBe(false)
    applywasmvoiceconfig(voices, 1, 'algo2', '')
    expect(applywasmvoiceconfig(voices, 1, 'port', 0.3)).toBe(true)
    expect(voices[1].portamento).toBe(0.3)
  })

  it('type changes preserve envelope and portamento', () => {
    const voices = defaultwasmvoicestate()
    applywasmvoiceconfig(voices, 0, 'envelope', [0.5, 0.5, 0.5, 0.5])
    applywasmvoiceconfig(voices, 0, 'portamento', 0.1)
    applywasmvoiceconfig(voices, 0, 'bells', '')
    expect(voices[0].envelope.sustain).toBe(0.5)
    expect(voices[0].portamento).toBe(0.1)
    expect(voices[0].type).toBe(SOURCE_TYPE.BELLS)
  })

  it('initwasmvoicesab seeds voice cfg sab defaults', () => {
    const sends: Record<string, number[]> = {}
    const maxi = {
      send: () => {},
      audioWorkletNode: {
        port: {
          postMessage: (msg: {
            channelID?: string
            data?: number[]
          }) => {
            if (msg.channelID && msg.data) {
              sends[msg.channelID] = msg.data.slice()
            }
          },
        },
      },
    }
    initwasmvoicesab(maxi as any)
    expect(sends.zss_voicecfg).toHaveLength(40)
    expect(sends.zss_voicecfg?.[0]).toBe(0.01)
    expect(sends.zss_voicecfg?.[2]).toBe(0.6)
    expect(sends.zss_voicecfg?.[4]).toBe(0)
  })

  it('initwasmvoicesab seeds SYNTH square defaults on sab', () => {
    const sends: Record<string, number[]> = {}
    const maxi = {
      send: () => {},
      audioWorkletNode: {
        port: {
          postMessage: (msg: {
            channelID?: string
            data?: number[]
          }) => {
            if (msg.channelID && msg.data) {
              sends[msg.channelID] = msg.data.slice()
            }
          },
        },
      },
    }
    initwasmvoicesab(maxi as any)
    for (let i = 0; i < 8; i++) {
      const base = i * 6
      expect(sends.zss_voices?.[base + 2]).toBe(SOURCE_TYPE.SYNTH)
      expect(sends.zss_voices?.[base + 5]).toBe(WASM_OSC_TYPE.SQUARE)
    }
    expect(sends.zss_voices).toHaveLength(48)
  })
})
