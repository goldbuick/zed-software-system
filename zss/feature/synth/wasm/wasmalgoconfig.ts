import { isarray, isnumber, isstring } from 'zss/mapping/types'

import {
  DEFAULT_WASM_ALGO_CONFIG,
  parsealgowaveconfig,
  type WASM_ALGO_CONFIG,
} from './wasmalgoconfigsab'

function applyalgoenv(
  cfg: WASM_ALGO_CONFIG,
  slot: 1 | 2 | 3 | 4,
  value: number[],
): boolean {
  const [attack, decay, sustain, release] = value
  if (
    !isnumber(attack) ||
    !isnumber(decay) ||
    !isnumber(sustain) ||
    !isnumber(release)
  ) {
    return false
  }
  const env = { attack, decay, sustain, release }
  if (slot === 1) {
    cfg.env1 = env
  } else if (slot === 2) {
    cfg.env2 = env
  } else if (slot === 3) {
    cfg.env3 = env
  } else {
    cfg.env4 = env
  }
  return true
}

export function applywasmalgoconfig(
  config: WASM_ALGO_CONFIG[],
  index: number,
  key: string,
  value: number | string | number[],
): boolean {
  if (index < 0 || index >= config.length) {
    return false
  }
  const cfg = config[index]

  switch (key) {
    case 'harmonicity':
      if (isnumber(value)) {
        cfg.harmonicity1 = value
        cfg.harmonicity2 = value
        cfg.harmonicity3 = value
        return true
      }
      break
    case 'harmonicity1':
      if (isnumber(value)) {
        cfg.harmonicity1 = value
        return true
      }
      break
    case 'harmonicity2':
      if (isnumber(value)) {
        cfg.harmonicity2 = value
        return true
      }
      break
    case 'harmonicity3':
      if (isnumber(value)) {
        cfg.harmonicity3 = value
        return true
      }
      break
    case 'modindex':
      if (isnumber(value)) {
        cfg.modindex1 = value
        cfg.modindex2 = value
        cfg.modindex3 = value
        return true
      }
      break
    case 'modindex1':
      if (isnumber(value)) {
        cfg.modindex1 = value
        return true
      }
      break
    case 'modindex2':
      if (isnumber(value)) {
        cfg.modindex2 = value
        return true
      }
      break
    case 'modindex3':
      if (isnumber(value)) {
        cfg.modindex3 = value
        return true
      }
      break
    case 'osc1':
      if (isstring(value)) {
        const osc = parsealgowaveconfig(value)
        if (osc !== undefined) {
          cfg.osc1 = osc
          return true
        }
      }
      break
    case 'osc2':
      if (isstring(value)) {
        const osc = parsealgowaveconfig(value)
        if (osc !== undefined) {
          cfg.osc2 = osc
          return true
        }
      }
      break
    case 'osc3':
      if (isstring(value)) {
        const osc = parsealgowaveconfig(value)
        if (osc !== undefined) {
          cfg.osc3 = osc
          return true
        }
      }
      break
    case 'osc4':
      if (isstring(value)) {
        const osc = parsealgowaveconfig(value)
        if (osc !== undefined) {
          cfg.osc4 = osc
          return true
        }
      }
      break
    case 'env1':
    case 'envelope1':
      if (isarray(value) && value.length >= 4) {
        return applyalgoenv(cfg, 1, value)
      }
      break
    case 'env2':
    case 'envelope2':
      if (isarray(value) && value.length >= 4) {
        return applyalgoenv(cfg, 2, value)
      }
      break
    case 'env3':
    case 'envelope3':
      if (isarray(value) && value.length >= 4) {
        return applyalgoenv(cfg, 3, value)
      }
      break
    case 'env4':
    case 'envelope4':
      if (isarray(value) && value.length >= 4) {
        return applyalgoenv(cfg, 4, value)
      }
      break
  }

  return false
}

export function resetwasmalgoconfig(config: WASM_ALGO_CONFIG[]) {
  for (let i = 0; i < config.length; i++) {
    config[i] = {
      ...DEFAULT_WASM_ALGO_CONFIG,
      env1: { ...DEFAULT_WASM_ALGO_CONFIG.env1 },
      env2: { ...DEFAULT_WASM_ALGO_CONFIG.env2 },
      env3: { ...DEFAULT_WASM_ALGO_CONFIG.env3 },
      env4: { ...DEFAULT_WASM_ALGO_CONFIG.env4 },
    }
  }
}
