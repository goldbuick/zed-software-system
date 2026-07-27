import { NAME } from 'zss/words/types'

/** Matches Tone oscillator config strings validated by `validatesynthtype`. */
const OSC_WAVE_MATCH =
  /^(am|fm|fat)*(sine|square|triangle|sawtooth|custom)[0-9]*$/

export enum WASM_OSC_TYPE {
  SQUARE = 0,
  SINE = 1,
  TRIANGLE = 2,
  SAWTOOTH = 3,
  PULSE = 4,
  PWM = 5,
  AM_SINE = 10,
  AM_SQUARE = 11,
  AM_TRIANGLE = 12,
  AM_SAWTOOTH = 13,
  FM_SINE = 20,
  FM_SQUARE = 21,
  FM_TRIANGLE = 22,
  FM_SAWTOOTH = 23,
  FAT_SINE = 30,
  FAT_SQUARE = 31,
  FAT_TRIANGLE = 32,
  FAT_SAWTOOTH = 33,
}

function wavefromname(wave: string): WASM_OSC_TYPE {
  switch (wave) {
    case 'sine':
      return WASM_OSC_TYPE.SINE
    case 'triangle':
      return WASM_OSC_TYPE.TRIANGLE
    case 'sawtooth':
      return WASM_OSC_TYPE.SAWTOOTH
    case 'custom':
      return WASM_OSC_TYPE.SQUARE
    default:
      return WASM_OSC_TYPE.SQUARE
  }
}

function prefixosc(prefix: string, wave: WASM_OSC_TYPE): WASM_OSC_TYPE {
  if (prefix === 'am') {
    switch (wave) {
      case WASM_OSC_TYPE.SINE:
        return WASM_OSC_TYPE.AM_SINE
      case WASM_OSC_TYPE.SQUARE:
        return WASM_OSC_TYPE.AM_SQUARE
      case WASM_OSC_TYPE.TRIANGLE:
        return WASM_OSC_TYPE.AM_TRIANGLE
      default:
        return WASM_OSC_TYPE.AM_SAWTOOTH
    }
  }
  if (prefix === 'fm') {
    switch (wave) {
      case WASM_OSC_TYPE.SINE:
        return WASM_OSC_TYPE.FM_SINE
      case WASM_OSC_TYPE.SQUARE:
        return WASM_OSC_TYPE.FM_SQUARE
      case WASM_OSC_TYPE.TRIANGLE:
        return WASM_OSC_TYPE.FM_TRIANGLE
      default:
        return WASM_OSC_TYPE.FM_SAWTOOTH
    }
  }
  if (prefix === 'fat') {
    switch (wave) {
      case WASM_OSC_TYPE.SINE:
        return WASM_OSC_TYPE.FAT_SINE
      case WASM_OSC_TYPE.SQUARE:
        return WASM_OSC_TYPE.FAT_SQUARE
      case WASM_OSC_TYPE.TRIANGLE:
        return WASM_OSC_TYPE.FAT_TRIANGLE
      default:
        return WASM_OSC_TYPE.FAT_SAWTOOTH
    }
  }
  return wave
}

export function parsewasmosc(config: string): WASM_OSC_TYPE | undefined {
  const name = NAME(config)
  if (name === 'pwm') {
    return WASM_OSC_TYPE.PWM
  }
  if (name === 'pulse') {
    return WASM_OSC_TYPE.PULSE
  }
  if (!OSC_WAVE_MATCH.test(name)) {
    return undefined
  }
  const match = /^(am|fm|fat)*(sine|square|triangle|sawtooth|custom)/.exec(name)
  if (!match) {
    return undefined
  }
  const prefix = match[1] ?? ''
  const wave = wavefromname(match[2])
  return prefixosc(prefix, wave)
}

export function iswasmosctypeconfig(config: string): boolean {
  return parsewasmosc(config) !== undefined
}

/** Modulator wave for AM/FM — matches carrier wave ids (0 square, 1 sine, 2 triangle, 3 saw). */
export function parsemodtype(value: string): number | undefined {
  switch (NAME(value)) {
    case 'square':
      return WASM_OSC_TYPE.SQUARE
    case 'sine':
      return WASM_OSC_TYPE.SINE
    case 'triangle':
      return WASM_OSC_TYPE.TRIANGLE
    case 'sawtooth':
      return WASM_OSC_TYPE.SAWTOOTH
    default:
      return undefined
  }
}

/**
 * Map am/fm/fat family index (sine=0, square=1, tri=2, saw=3) to basic
 * WASM_OSC_TYPE (square=0, sine=1, tri=2, saw=3).
 * Must stay identical to familywavetobasic in zss_osc.cpp -- bare
 * osctype - 10/20/30 makes fmsquare sound like sine.
 */
export function familywavetobasic(familywave: number): WASM_OSC_TYPE {
  switch (familywave) {
    case 0:
      return WASM_OSC_TYPE.SINE
    case 1:
      return WASM_OSC_TYPE.SQUARE
    case 2:
      return WASM_OSC_TYPE.TRIANGLE
    case 3:
      return WASM_OSC_TYPE.SAWTOOTH
    default:
      return WASM_OSC_TYPE.SQUARE
  }
}

/** Carrier basic wave for an am/fm/fat osctype, or undefined if not a family wave. */
export function familyosctobasic(osctype: number): WASM_OSC_TYPE | undefined {
  if (osctype >= WASM_OSC_TYPE.AM_SINE && osctype <= WASM_OSC_TYPE.AM_SAWTOOTH) {
    return familywavetobasic(osctype - 10)
  }
  if (osctype >= WASM_OSC_TYPE.FM_SINE && osctype <= WASM_OSC_TYPE.FM_SAWTOOTH) {
    return familywavetobasic(osctype - 20)
  }
  if (
    osctype >= WASM_OSC_TYPE.FAT_SINE &&
    osctype <= WASM_OSC_TYPE.FAT_SAWTOOTH
  ) {
    return familywavetobasic(osctype - 30)
  }
  return undefined
}
