import { isarray, isnumber, isstring } from 'zss/mapping/types'

import {
  DEFAULT_WASM_OSC_CONFIG,
  type WASM_OSC_CONFIG,
} from './wasmoscconfigsab'
import { parsemodtype } from './wasmosctype'

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
        cfg.phase = value
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

  if (isarray(value)) {
    cfg.partials = value.filter((item) => isnumber(item)).slice(0, 8)
    while (cfg.partials.length < 8) {
      cfg.partials.push(0)
    }
    cfg.partialcount = cfg.partials.length
    return true
  }

  if (isnumber(value)) {
    cfg.partials = [value, 0, 0, 0, 0, 0, 0, 0]
    cfg.partialcount = 1
    return true
  }

  if (isstring(value)) {
    return false
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
