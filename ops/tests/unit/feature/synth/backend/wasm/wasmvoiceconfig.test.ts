import { wasmsabsnapshot } from 'zss/feature/synth/backend/wasm/sabpush'
import { createmocksabengine } from 'ops/lib/test/synth/mocksab'
import { defaultwasmalgoconfig } from 'zss/feature/synth/backend/wasm/wasmalgoconfigsab'
import { initwasmvoicesab } from 'zss/feature/synth/backend/wasm/wasminitsab'
import {
  DEFAULT_WASM_OSC_CONFIG,
  defaultwasmoscconfig,
} from 'zss/feature/synth/backend/wasm/wasmoscconfigsab'
import {
  WASM_OSC_TYPE,
  familyosctobasic,
  familywavetobasic,
  parsemodtype,
  parsewasmosc,
} from 'zss/feature/synth/backend/wasm/wasmosctype'
import { wasmvoicecfgtosab } from 'zss/feature/synth/backend/wasm/wasmvoicecfgsab'
import {
  applywasmvoiceconfig,
  defaultwasmvoicestate,
  wasmvoicestatetosab,
} from 'zss/feature/synth/backend/wasm/wasmvoiceconfig'
import { SOURCE_TYPE } from 'zss/feature/synth/shared/sourcetype'

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

  it('maps family wave index to basic (fmsquare must not become sine)', () => {
    // Family order: sine=0 square=1. Basic order: square=0 sine=1.
    expect(familywavetobasic(0)).toBe(WASM_OSC_TYPE.SINE)
    expect(familywavetobasic(1)).toBe(WASM_OSC_TYPE.SQUARE)
    expect(familywavetobasic(2)).toBe(WASM_OSC_TYPE.TRIANGLE)
    expect(familywavetobasic(3)).toBe(WASM_OSC_TYPE.SAWTOOTH)
    // Bare (osctype - 20) would yield sine for fmsquare — this is the regression.
    expect(familyosctobasic(WASM_OSC_TYPE.FM_SQUARE)).toBe(
      WASM_OSC_TYPE.SQUARE,
    )
    expect(familyosctobasic(WASM_OSC_TYPE.FM_SINE)).toBe(WASM_OSC_TYPE.SINE)
    expect(familyosctobasic(WASM_OSC_TYPE.AM_SQUARE)).toBe(
      WASM_OSC_TYPE.SQUARE,
    )
    expect(familyosctobasic(WASM_OSC_TYPE.FAT_SQUARE)).toBe(
      WASM_OSC_TYPE.SQUARE,
    )
    expect(familyosctobasic(WASM_OSC_TYPE.SQUARE)).toBeUndefined()
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

  it('maps string and pluck voice types', () => {
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
      brightness: 0.38,
      damping: 0.72,
      accent: 0.12,
    })
    expect(applyvoiceconfig(voices, 2, 'drip', '')).toBe(false)
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

  it('maps SOS synth voice types and algos', () => {
    const voices = defaultwasmvoicestate()
    expect(applyvoiceconfig(voices, 0, 'flute', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.WIND_VOICE)
    expect(voices[0].algo).toBe(0)
    expect(voices[0].wind).toEqual({
      breath: 0.35,
      pressure: 0.4,
      brightness: 0.45,
      resonance: 0.1,
    })

    expect(applyvoiceconfig(voices, 1, 'clarinet', '')).toBe(true)
    expect(voices[1].algo).toBe(1)
    expect(applyvoiceconfig(voices, 2, 'brass', '')).toBe(true)
    expect(voices[2].algo).toBe(2)
    expect(applyvoiceconfig(voices, 3, 'panpipe', '')).toBe(false)
    expect(applyvoiceconfig(voices, 3, 'epiano', '')).toBe(false)
    expect(applyvoiceconfig(voices, 3, 'timpani', '')).toBe(false)
    expect(applyvoiceconfig(voices, 3, 'viola', '')).toBe(false)
    expect(applyvoiceconfig(voices, 3, 'nylon', '')).toBe(false)
    expect(applyvoiceconfig(voices, 3, 'drawbar', '')).toBe(false)

    expect(applyvoiceconfig(voices, 0, 'piano', '')).toBe(true)
    expect(voices[0].type).toBe(SOURCE_TYPE.PIANO_VOICE)
    expect(voices[0].piano).toEqual({
      spread: 0.18,
      hammer: 0.55,
      brightness: 0.5,
      damping: 0.45,
    })

    expect(applyvoiceconfig(voices, 3, 'violin', '')).toBe(true)
    expect(voices[3].type).toBe(SOURCE_TYPE.BOWED_VOICE)

    expect(applyvoiceconfig(voices, 2, 'steel', '')).toBe(true)
    expect(voices[2].type).toBe(SOURCE_TYPE.GUITAR_VOICE)
    expect(voices[2].algo).toBe(1)
    expect(voices[2].guitar).toEqual({
      pick: 0.5,
      body: 0.35,
      damping: 0.7,
      position: 0.6,
    })

    expect(applyvoiceconfig(voices, 3, 'tonewheel', '')).toBe(true)
    expect(voices[3].type).toBe(SOURCE_TYPE.ORGAN_VOICE)
    expect(voices[3].algo).toBe(0)
    // drawbar remains an organ param (not a named voice).
    expect(applyvoiceconfig(voices, 3, 'drawbar', 0.4)).toBe(true)
    expect(voices[3].organ.drawbar).toBe(0.4)
  })

  it('maps SOS timbre params into voice cfg sab slots 6-9', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'flute', '')
    applyvoiceconfig(voices, 0, 'breath', 0.4)
    applyvoiceconfig(voices, 0, 'pressure', 0.5)
    const sab = wasmvoicecfgtosab(voices)
    expect(sab[6]).toBe(0.4)
    expect(sab[7]).toBe(0.5)

    applyvoiceconfig(voices, 1, 'piano', '')
    applyvoiceconfig(voices, 1, 'hammer', 0.6)
    const sab2 = wasmvoicecfgtosab(voices)
    expect(sab2[17]).toBe(0.6)
  })

  it('portamento applies to synth, algo, and bowed voices', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'retro', '')
    expect(applyvoiceconfig(voices, 0, 'portamento', 0.5)).toBe(false)
    applyvoiceconfig(voices, 1, 'algo2', '')
    expect(applyvoiceconfig(voices, 1, 'port', 0.3)).toBe(true)
    expect(voices[1].portamento).toBe(0.3)
    applyvoiceconfig(voices, 2, 'violin', '')
    expect(applyvoiceconfig(voices, 2, 'portamento', 0.15)).toBe(true)
    expect(voices[2].portamento).toBe(0.15)
  })

  it('named type switch installs destination envelope and clears portamento', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'envelope', [0.5, 0.5, 0.5, 0.5])
    applyvoiceconfig(voices, 0, 'portamento', 0.1)
    applyvoiceconfig(voices, 0, 'bells', '')
    expect(voices[0].type).toBe(SOURCE_TYPE.BELLS)
    expect(voices[0].envelope).toEqual({
      attack: 0.01,
      decay: 3,
      sustain: 0.3,
      release: 6,
    })
    expect(voices[0].portamento).toBe(0)
  })

  it('flute then square restores default synth envelope', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'flute', '')
    expect(voices[0].envelope.attack).toBe(0.12)
    applyvoiceconfig(voices, 0, 'square', '')
    expect(voices[0].type).toBe(SOURCE_TYPE.SYNTH)
    expect(voices[0].envelope).toEqual({
      attack: 0.01,
      decay: 0.01,
      sustain: 0.5,
      release: 0.01,
    })
    expect(voices[0].portamento).toBe(0)
  })

  it('same-synth wave change keeps user envelope', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'square', '')
    applyvoiceconfig(voices, 0, 'envelope', [0.2, 0.3, 0.7, 0.4])
    applyvoiceconfig(voices, 0, 'sawtooth', '')
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.SAWTOOTH)
    expect(voices[0].envelope).toEqual({
      attack: 0.2,
      decay: 0.3,
      sustain: 0.7,
      release: 0.4,
    })
  })

  it('flute then bells does not keep wind envelope', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'flute', '')
    applyvoiceconfig(voices, 0, 'bells', '')
    expect(voices[0].type).toBe(SOURCE_TYPE.BELLS)
    expect(voices[0].envelope).toEqual({
      attack: 0.01,
      decay: 3,
      sustain: 0.3,
      release: 6,
    })
  })

  it('maps string ensemble params with dormant writes', () => {
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

    // Exclusive string keys write dormantly while on other types.
    applyvoiceconfig(voices, 1, 'pluck', '')
    expect(applyvoiceconfig(voices, 1, 'detune', 0.3)).toBe(true)
    expect(voices[1].stringensemble.detune).toBe(0.3)
    applyvoiceconfig(voices, 2, 'square', '')
    expect(applyvoiceconfig(voices, 2, 'pwm', 0.4)).toBe(true)
    expect(voices[2].stringensemble.pwm).toBe(0.4)
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

  it('maps pluck timbre params with dormant exclusive writes', () => {
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
    expect(applyvoiceconfig(voices, 1, 'structure', 0.2)).toBe(true)
    expect(voices[1].pluck.structure).toBe(0.2)
    applyvoiceconfig(voices, 2, 'string', '')
    expect(applyvoiceconfig(voices, 2, 'structure', 0.2)).toBe(true)
    expect(voices[2].pluck.structure).toBe(0.2)
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

  it('maps harmonicity on fmsquare osc sab', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'fmsquare', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'harmonicity', 10, osc, algo)).toBe(
      true,
    )
    expect(osc[0].harmonicity).toBe(10)
  })

  it('maps fat spread and phase on synth (not blocked by piano spread)', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'fatsawtooth', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'spread', 40, osc, algo)).toBe(true)
    expect(osc[0].spread).toBe(40)
    expect(applyvoiceconfig(voices, 0, 'phase', 0.25, osc, algo)).toBe(true)
    expect(osc[0].phase).toBe(0.25)
    expect(applyvoiceconfig(voices, 0, 'count', 5, osc, algo)).toBe(true)
    expect(osc[0].count).toBe(5)
  })

  it('maps pwm modfreq on synth voices', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'pwm', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'modfreq', 3, osc, algo)).toBe(true)
    expect(osc[0].modfreq).toBe(3)
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

  it('maps algo4 osc and modindex params', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'algo4', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'osc2', 'sawtooth', osc, algo)).toBe(
      true,
    )
    expect(algo[0].osc2).toBe(WASM_OSC_TYPE.SAWTOOTH)
    expect(applyvoiceconfig(voices, 0, 'modindex1', 4, osc, algo)).toBe(true)
    expect(algo[0].modindex1).toBe(4)
    expect(applyvoiceconfig(voices, 0, 'modindex3', 6, osc, algo)).toBe(true)
    expect(algo[0].modindex3).toBe(6)
  })

  it('rejects am/fm/fat names on algo oscN (basic waves only)', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'algo0', '', osc, algo)
    const before = algo[0].osc1
    expect(applyvoiceconfig(voices, 0, 'osc1', 'amsine', osc, algo)).toBe(
      false,
    )
    expect(applyvoiceconfig(voices, 0, 'osc1', 'fatsquare', osc, algo)).toBe(
      false,
    )
    expect(algo[0].osc1).toBe(before)
    expect(applyvoiceconfig(voices, 0, 'osc1', 'square', osc, algo)).toBe(true)
    expect(algo[0].osc1).toBe(WASM_OSC_TYPE.SQUARE)
  })

  it('installs Tone-parity envelope on bells; env applies on flute', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'bells', '')
    expect(voices[0].envelope).toEqual({
      attack: 0.01,
      decay: 3,
      sustain: 0.3,
      release: 6,
    })
    applyvoiceconfig(voices, 0, 'flute', '')
    expect(
      applyvoiceconfig(voices, 0, 'env', [0.001, 0.05, 0, 0.4]),
    ).toBe(true)
    expect(voices[0].envelope).toEqual({
      attack: 0.001,
      decay: 0.05,
      sustain: 0,
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
    expect(cfg[6]).toBe(0)
    expect(cfg[7]).toBe(0)
    expect(cfg[8]).toBe(0)
    expect(cfg[9]).toBe(0)
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

  it('pushes fmsquare osctype 21 onto zss_voices sab (not sine)', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'fmsquare', '', osc, algo)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.FM_SQUARE)
    const sab = wasmvoicestatetosab(voices, new Array(48).fill(0), 6)
    expect(sab[5]).toBe(21)
    expect(sab[5]).not.toBe(WASM_OSC_TYPE.SINE)
    expect(sab[5]).not.toBe(WASM_OSC_TYPE.FM_SINE)
  })

  it('applies piano brightness after pluck key name (shared-key fallthrough)', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'piano', '')
    expect(applyvoiceconfig(voices, 0, 'brightness', 0.8)).toBe(true)
    expect(voices[0].piano.brightness).toBe(0.8)
    expect(applyvoiceconfig(voices, 0, 'damping', 0.2)).toBe(true)
    expect(voices[0].piano.damping).toBe(0.2)
  })

  it('applies bowed pressure and vib after wind/string key names', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'violin', '')
    expect(applyvoiceconfig(voices, 0, 'pressure', 0.7)).toBe(true)
    expect(voices[0].bowed.pressure).toBe(0.7)
    expect(applyvoiceconfig(voices, 0, 'vib', 0.1)).toBe(true)
    expect(voices[0].bowed.vib).toBe(0.1)
  })

  it('applies guitar body after bowed key name', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'steel', '')
    expect(applyvoiceconfig(voices, 0, 'body', 0.9)).toBe(true)
    expect(voices[0].guitar.body).toBe(0.9)
  })

  it('writes exclusive pluck structure dormantly on piano', () => {
    const voices = defaultwasmvoicestate()
    applyvoiceconfig(voices, 0, 'piano', '')
    expect(applyvoiceconfig(voices, 0, 'structure', 0.5)).toBe(true)
    expect(voices[0].pluck.structure).toBe(0.5)
  })

  it('preserves string detune and env across type switches', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'string', '', osc, algo)
    applyvoiceconfig(voices, 0, 'detune', 0.77, osc, algo)
    applyvoiceconfig(voices, 0, 'env', [0.1, 0.2, 0.3, 0.4], osc, algo)
    applyvoiceconfig(voices, 0, 'piano', '', osc, algo)
    applyvoiceconfig(voices, 0, 'string', '', osc, algo)
    expect(voices[0].stringensemble.detune).toBe(0.77)
    expect(voices[0].envelope).toEqual({
      attack: 0.1,
      decay: 0.2,
      sustain: 0.3,
      release: 0.4,
    })
  })

  it('preserves fmsquare harmonicity across type switches', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'fmsquare', '', osc, algo)
    applyvoiceconfig(voices, 0, 'harmonicity', 11, osc, algo)
    applyvoiceconfig(voices, 0, 'string', '', osc, algo)
    applyvoiceconfig(voices, 0, 'fmsquare', '', osc, algo)
    expect(osc[0].harmonicity).toBe(11)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.FM_SQUARE)
  })

  it('restart clears envmemory and osc dormancy', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'string', '', osc, algo)
    applyvoiceconfig(voices, 0, 'detune', 0.9, osc, algo)
    applyvoiceconfig(voices, 0, 'harmonicity', 9, osc, algo)
    applyvoiceconfig(voices, 0, 'restart', '', osc, algo)
    expect(voices[0].stringensemble.detune).toBe(0.25)
    expect(osc[0].harmonicity).toBe(DEFAULT_WASM_OSC_CONFIG.harmonicity)
    expect(voices[0].envmemory).toEqual({})
  })

  it('maps amsquare and fatsquare to family carriers that are square', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'amsquare', '', osc, algo)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.AM_SQUARE)
    expect(familyosctobasic(voices[0].osc)).toBe(WASM_OSC_TYPE.SQUARE)
    applyvoiceconfig(voices, 0, 'fatsquare', '', osc, algo)
    expect(voices[0].osc).toBe(WASM_OSC_TYPE.FAT_SQUARE)
    expect(familyosctobasic(voices[0].osc)).toBe(WASM_OSC_TYPE.SQUARE)
  })

  it('pwm modfreq does not write harmonicity (FM sibling trap)', () => {
    const voices = defaultwasmvoicestate()
    const osc = defaultwasmoscconfig()
    const algo = defaultwasmalgoconfig()
    applyvoiceconfig(voices, 0, 'pwm', '', osc, algo)
    expect(applyvoiceconfig(voices, 0, 'modfreq', 7, osc, algo)).toBe(true)
    expect(osc[0].modfreq).toBe(7)
    expect(osc[0].harmonicity).toBe(DEFAULT_WASM_OSC_CONFIG.harmonicity)
  })
})
