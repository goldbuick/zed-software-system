import { isarray, isnumber, isstring } from 'zss/mapping/types'

import {
  DEFAULT_WASM_OSC_CONFIG,
  type WASM_OSC_CONFIG,
} from './wasmoscconfigsab'
import { WASM_OSC_TYPE, parsemodtype, parsewasmosc } from './wasmosctype'

/** Tone OmniOscillator phase is degrees; native SAB stores cycles 0-1. */
export function phasedegreestocycles(degrees: number): number {
  return degrees / 360
}

function clearoscpartials(cfg: WASM_OSC_CONFIG) {
  cfg.partialcount = 0
  cfg.partials = [0, 0, 0, 0, 0, 0, 0, 0]
}

/**
 * Reseed osc row like Tone OmniOscillator constructing a new subclass.
 * Always clears partials; caller may re-apply partials via wave+array.
 */
export function seedomnioscdefaults(
  config: WASM_OSC_CONFIG[],
  index: number,
  osctype: WASM_OSC_TYPE,
): void {
  if (index < 0 || index >= config.length) {
    return
  }
  const cfg = config[index]
  clearoscpartials(cfg)
  const t = osctype as number
  if (t >= 0 && t <= 3) {
    cfg.phase = 0
    return
  }
  if (t === (WASM_OSC_TYPE.PULSE as number)) {
    cfg.width = DEFAULT_WASM_OSC_CONFIG.width
    return
  }
  if (t === (WASM_OSC_TYPE.PWM as number)) {
    cfg.width = DEFAULT_WASM_OSC_CONFIG.width
    cfg.modfreq = DEFAULT_WASM_OSC_CONFIG.modfreq
    return
  }
  if (t >= 10 && t <= 13) {
    cfg.harmonicity = DEFAULT_WASM_OSC_CONFIG.harmonicity
    cfg.modtype = DEFAULT_WASM_OSC_CONFIG.modtype
    cfg.modenv = { ...DEFAULT_WASM_OSC_CONFIG.modenv }
    return
  }
  if (t >= 20 && t <= 23) {
    cfg.harmonicity = DEFAULT_WASM_OSC_CONFIG.harmonicity
    cfg.modindex = DEFAULT_WASM_OSC_CONFIG.modindex
    cfg.modtype = DEFAULT_WASM_OSC_CONFIG.modtype
    cfg.modenv = { ...DEFAULT_WASM_OSC_CONFIG.modenv }
    return
  }
  if (t >= 30 && t <= 33) {
    cfg.count = DEFAULT_WASM_OSC_CONFIG.count
    cfg.spread = DEFAULT_WASM_OSC_CONFIG.spread
    cfg.phase = 0
  }
}

export function applywasmoscconfig(
  config: WASM_OSC_CONFIG[],
  index: number,
  key: string,
  value: number | string | number[],
): boolean {
  if (index < 0 || index >= config.length) {
    return false
  }
  const cfg = config[index]

  switch (key) {
    case 'phase':
      if (isnumber(value)) {
        cfg.phase = phasedegreestocycles(value)
        return true
      }
      break
    case 'width':
      if (isnumber(value)) {
        cfg.width = value
        return true
      }
      break
    case 'modfreq':
    case 'modulationfrequency':
      if (isnumber(value)) {
        cfg.modfreq = value
        return true
      }
      break
    case 'harmonicity':
      if (isnumber(value)) {
        cfg.harmonicity = value
        return true
      }
      break
    case 'modindex':
      if (isnumber(value)) {
        cfg.modindex = value
        return true
      }
      break
    case 'count':
      if (isnumber(value)) {
        cfg.count = value
        return true
      }
      break
    case 'spread':
      if (isnumber(value)) {
        cfg.spread = value
        return true
      }
      break
    case 'modenv':
    case 'modulationenvelope':
      if (isarray(value) && value.length >= 4) {
        const [attack, decay, sustain, release] = value
        if (
          isnumber(attack) &&
          isnumber(decay) &&
          isnumber(sustain) &&
          isnumber(release)
        ) {
          cfg.modenv = { attack, decay, sustain, release }
          return true
        }
      }
      break
    case 'modtype':
    case 'modulationtype':
      if (isstring(value)) {
        const modtype = parsemodtype(value)
        if (modtype !== undefined) {
          cfg.modtype = modtype
          return true
        }
      }
      break
  }

  // Partials only when the key is a wave name (e.g. #synth fmsquare 1 0 0 …).
  if (parsewasmosc(key) === undefined) {
    return false
  }

  if (isarray(value)) {
    const partials = value.filter((item) => isnumber(item)).slice(0, 8)
    const n = partials.length
    while (partials.length < 8) {
      partials.push(0)
    }
    cfg.partials = partials
    cfg.partialcount = n
    return true
  }

  if (isnumber(value)) {
    cfg.partials = [value, 0, 0, 0, 0, 0, 0, 0]
    cfg.partialcount = 1
    return true
  }

  return false
}

export function resetwasmoscconfig(config: WASM_OSC_CONFIG[]) {
  for (let i = 0; i < config.length; i++) {
    config[i] = {
      ...DEFAULT_WASM_OSC_CONFIG,
      partials: [...DEFAULT_WASM_OSC_CONFIG.partials],
      modenv: { ...DEFAULT_WASM_OSC_CONFIG.modenv },
      modtype: DEFAULT_WASM_OSC_CONFIG.modtype,
    }
  }
}
