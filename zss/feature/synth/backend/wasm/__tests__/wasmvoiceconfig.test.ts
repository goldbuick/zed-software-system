import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'

import { initwasmvoicesab } from '../wasminitsab'
import { wasmsabsnapshot } from '../sabpush'
import { createmocksabengine } from '../testhelpers/mocksab'
import { defaultwasmalgoconfig } from '../wasmalgoconfigsab'
import {
  DEFAULT_WASM_OSC_CONFIG,
  defaultwasmoscconfig,
} from '../wasmoscconfigsab'
import { WASM_OSC_TYPE, parsemodtype, parsewasmosc } from '../wasmosctype'
import { wasmvoicecfgtosab } from '../wasmvoicecfgsab'
import {
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  wasmvoicestatetosab,
} from '../wasmvoiceconfig'

function applyvoiceconfig(
  voices: ReturnType<typeof defaultwasmvoicestate>,
  index: number,
  config: number | string,
  value: number | string | number[] = '',
  osc = defaultwasmoscconfig(),
  algo = defaultwasmalgoconfig(),
) {
  return applywasmvoiceconfig(voices, osc, algo, index, config, value)
}

describe('wasmosctype', () => {
  it('parses basic waves', () => {
    expect(parsewasmosc('sine')).toBe(WASM_OSC_TYPE.SINE)
    expect(parsewasmosc('square')).toBe(WASM_OSC_TYPE.SQUARE)
    expect(parsewasmosc('fmsquare')).toBe(WASM_OSC_TYPE.FM_SQUARE)
    expect(parsemodtype('triangle')).toBe(WASM_OSC_TYPE.TRIANGLE)
  })

  it('defaults modtype to square for Tone AM/FM parity', () => {
    expect(DEFAULT_WASM_OSC_CONFIG.modtype).toBe(WASM_OSC_TYPE.SQUARE)
    expect(DEFAULT_WASM_OSC_CONFIG.width).toBe(0.2)
  })
})

describe('wasmvoiceconfig', () => {
  it('maps retro to RETRO_NOISE', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'retro', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.RETRO_NOISE)
  })

  it('maps sine to SYNTH with sine oscillator', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'sine', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.SINE)
  })

  it('maps fmsquare to SYNTH with fm square oscillator', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'bells', '')
    expect(applyvoiceconfig(voices, 0, 'fmsquare', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.FM_SQUARE)
  })

  it('maps algo3 to ALGO_SYNTH algorithm 3', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 2, 'algo3', '')).toBe(true)
    expect(voices[2].type).toBe(SOURCE_TYPE.ALGO_SYNTH)
    expect(voices[2].algo).toBe(3)
  })

  it('maps string pluck and drip voice types', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'string', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.STRING_VOICE)
    expect(voices[0].algo).toBe(0)
    expect(voices[0].envelope).toEqual({
      attack: 0.6,
      decay: 0.15,
      sustain: 0.88,
      release: 1.0,
    })
    expect(voices[0].stringensemble).toEqual({
      detune: 0.25,
      pwm: 0.2,
      vib: 0.35,
      filter: 0.5,
    })
    expect(applyvoiceconfig(voices, 1, 'pluck', '')).toBe(true)
    expect(voices[1].type).toBe(SOURCE_TYPE.STRING_VOICE)
    expect(voices[1].algo).toBe(1)
    expect(voices[1].pluck).toEqual({
      structure: 0.14,
      brightness: 0.22,
      damping: 0.68,
      accent: 0.48,
    })
    expect(applyvoiceconfig(voices, 2, 'drip', '')).toBe(true)
    expect(voices[2].type).toBe(SOURCE_TYPE.DRIP_VOICE)
    expect(voices[2].algo).toBe(0)
  })

  it('maps noise and hollow chip types', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'noise', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.WHITE_NOISE)
    expect(applyvoiceconfig(voices, 1, 'hollow', '')).toBe(true)
    expect(voices[1].type).toBe(SOURCE_TYPE.HOLLOW_NOISE)
  })

  it('restart resets all voices to SYNTH square', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'bells', '')
    applyvoiceconfig(voices, 1, 'sine', '')
    applyvoiceconfig(voices, 0, 'restart', '')
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.SQUARE)
    expect(voices[1].type).toBe(SOURCE_TYPE.SYNTH)
  })

  it('merges voice type and osc into play sab stride', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 1, 'sine', '')
    const playstate = new Array(24).fill(0)
    playstate[6] = 523.25
    playstate[7] = 1
    const merged = wasmvoicestatetosab(voices, playstate, 6)
    expect(merged[6]).toBe(523.25)
    expect(merged[7]).toBe(1)
    expect(merged[8]).toBe(SOURCE_TYPE.SYNTH)
    expect(merged[11]).toBe(WASM_OSC_TYPE.SINE)
  })

  it('maps per-voice volume for all voice types', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'volume', -6)).toBe(true)
    expect(voices[0].volume).toBe(-6)
    applyvoiceconfig(voices, 1, 'noise', '')
    expect(applyvoiceconfig(voices, 1, 'vol', 3)).toBe(true)
    expect(voices[1].volume).toBe(3)
  })

  it('restart resets envelope to Tone ZSS defaults', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'envelope', [0.5, 0.5, 0.5, 0.5])
    applyvoiceconfig(voices, 0, 'restart', '')
    expect(voices[0].envelope).toEqual({
      attack: 0.01,
      decay: 0.01,
      sustain: 0.5,
      release: 0.01,
    })
  })

  it('maps envelope and portamento into voice cfg sab', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'envelope', [0.02, 0.1, 0.4, 0.2])).toBe(
      true,
    )
    expect(voices[0].envelope).toEqual({
      attack: 0.02,
      decay: 0.1,
      sustain: 0.4,
      release: 0.2,
    })
    expect(applyvoiceconfig(voices, 0, 'portamento', 0.25)).toBe(true)
    expect(voices[0].portamento).toBe(0.25)

    const sab = wasmvoicecfgtosab(voices)
    expect(sab[0]).toBe(0.02)
    expect(sab[1]).toBe(0.1)
    expect(sab[2]).toBe(0.4)
    expect(sab[3]).toBe(0.2)
    expect(sab[4]).toBe(0.25)
    expect(sab[5]).toBe(0)
  })

  it('portamento applies only to synth and algo voices', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'retro', '')
    expect(applyvoiceconfig(voices, 0, 'portamento', 0.5)).toBe(false)
    applyvoiceconfig(voices, 1, 'algo2', '')
    expect(applyvoiceconfig(voices, 1, 'port', 0.3)).toBe(true)
    expect(voices[1].portamento).toBe(0.3)
  })

  it('type changes preserve envelope and portamento', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'envelope', [0.5, 0.5, 0.5, 0.5])
    applyvoiceconfig(voices, 0, 'portamento', 0.1)
    applyvoiceconfig(voices, 0, 'bells', '')
    expect(voices[0].envelope.sustain).toBe(0.5)
    expect(voices[0].portamento).toBe(0.1)
    expect(voices[0].type).toBe(SOURCE_TYPE.BELLS)
  })

  it('maps string ensemble params on string voice only', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'string', '')
    expect(applyvoiceconfig(voices, 0, 'detune', 0.3)).toBe(true)
    expect(applyvoiceconfig(voices, 0, 'pwm', 0.4)).toBe(true)
    expect(applyvoiceconfig(voices, 0, 'vib', 0.5)).toBe(true)
    expect(applyvoiceconfig(voices, 0, 'filter', 0.6)).toBe(true)
    expect(voices[0].stringensemble).toEqual({
      detune: 0.3,
      pwm: 0.4,
      vib: 0.5,
      filter: 0.6,
    })

    applyvoiceconfig(voices, 1, 'pluck', '')
    expect(applyvoiceconfig(voices, 1, 'detune', 0.3)).toBe(false)
    applyvoiceconfig(voices, 2, 'square', '')
    expect(applyvoiceconfig(voices, 2, 'pwm', 0.4)).toBe(false)
  })

  it('maps string ensemble params into voice cfg sab slots 6-9', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'string', '')
    applyvoiceconfig(voices, 0, 'detune', 0.3)
    applyvoiceconfig(voices, 0, 'pwm', 0.4)
    applyvoiceconfig(voices, 0, 'vib', 0.5)
    applyvoiceconfig(voices, 0, 'filter', 0.6)

    const sab = wasmvoicecfgtosab(voices)
    expect(sab[6]).toBe(0.3)
    expect(sab[7]).toBe(0.4)
    expect(sab[8]).toBe(0.5)
    expect(sab[9]).toBe(0.6)
  })

  it('maps pluck timbre params on pluck voice only', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'pluck', '')
    expect(applyvoiceconfig(voices, 0, 'structure', 0.2)).toBe(true)
    expect(voices[0].pluck.structure).toBe(0.2)
    expect(applyvoiceconfig(voices, 0, 'brightness', 0.3)).toBe(true)
    expect(applyvoiceconfig(voices, 0, 'damping', 0.5)).toBe(true)
    expect(applyvoiceconfig(voices, 0, 'accent', 0.6)).toBe(true)
    expect(voices[0].pluck).toEqual({
      structure: 0.2,
      brightness: 0.3,
      damping: 0.5,
      accent: 0.6,
    })

    applyvoiceconfig(voices, 1, 'square', '')
    expect(applyvoiceconfig(voices, 1, 'structure', 0.2)).toBe(false)
    applyvoiceconfig(voices, 2, 'string', '')
    expect(applyvoiceconfig(voices, 2, 'structure', 0.2)).toBe(false)
    expect(applyvoiceconfig(voices, 2, 'detune', 0.2)).toBe(true)
  })

  it('maps pluck params into voice cfg sab slots 6-9', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'pluck', '')
    applyvoiceconfig(voices, 0, 'structure', 0.2)
    applyvoiceconfig(voices, 0, 'brightness', 0.3)
    applyvoiceconfig(voices, 0, 'damping', 0.5)
    applyvoiceconfig(voices, 0, 'accent', 0.6)

    const sab = wasmvoicecfgtosab(voices)
    expect(sab[6]).toBe(0.2)
    expect(sab[7]).toBe(0.3)
    expect(sab[8]).toBe(0.5)
    expect(sab[9]).toBe(0.6)
  })

  it('maps modindex on synth voices', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'fmsquare', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'modindex', 8, osc, algo)).toBe(true)
    expect(osc[0].modindex).toBe(8)
  })

  it('maps modtype and modenv on fm/am synth voices', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'fmsquare', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'modtype', 'square', osc, algo)).toBe(
      true,
    )
    expect(osc[0].modtype).toBe(WASM_OSC_TYPE.SQUARE)
    expect(
      applyvoiceconfig(voices, 0, 'modenv', [0.02, 0.04, 0.8, 0.1], osc, algo),
    ).toBe(true)
    expect(osc[0].modenv).toEqual({
      attack: 0.02,
      decay: 0.04,
      sustain: 0.8,
      release: 0.1,
    })
  })

  it('maps algo harmonicity and per-op env', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'algo2', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'harmonicity2', 3, osc, algo)).toBe(true)
    expect(algo[0].harmonicity2).toBe(3)
    expect(
      applyvoiceconfig(voices, 0, 'env3', [0.1, 0.2, 0.3, 0.4], osc, algo),
    ).toBe(true)
    expect(algo[0].env3).toEqual({
      attack: 0.1,
      decay: 0.2,
      sustain: 0.3,
      release: 0.4,
    })
  })

  it('initwasmvoicesab seeds voice cfg sab defaults', () => {
    const { engine } = createmocksabengine()
    initwasmvoicesab(engine)
    const cfg = wasmsabsnapshot('zss_voicecfg')
    expect(cfg).toHaveLength(80)
    expect(cfg[0]).toBe(0.01)
    expect(cfg[1]).toBe(0.01)
    expect(cfg[2]).toBe(0.5)
    expect(cfg[3]).toBe(0.01)
    expect(cfg[5]).toBe(0)
    expect(cfg[6]).toBe(0.14)
    expect(cfg[7]).toBe(0.22)
    expect(cfg[8]).toBe(0.68)
    expect(cfg[9]).toBe(0.48)
  })

  it('initwasmvoicesab seeds SYNTH square defaults on sab', () => {
    const { engine } = createmocksabengine()
    initwasmvoicesab(engine)
    const voices = wasmsabsnapshot('zss_voices')
    for (let i = 0; i < 8; i++) {
      const base = i * 6
      expect(voices[base + 2]).toBe(SOURCE_TYPE.SYNTH)
      expect(voices[base + 5]).toBe(WASM_OSC_TYPE.SQUARE)
    }
    expect(voices).toHaveLength(48)
  })
})
