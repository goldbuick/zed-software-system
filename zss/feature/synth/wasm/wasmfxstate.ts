import { tonenotationseconds } from 'zss/feature/synth/playnotation'
import { isnumber, isstring } from 'zss/mapping/types'
import type { SYNTH_STATE } from 'zss/gadget/data/types'

import type { MaxiEngine } from './maximilian'
import { pushwasmsabvalues } from './sabpush'

function volumetodb(value: number) {
  return 20 * Math.log10(value) - 35
}

export const WASM_FX_SAB = 'zss_fx'
export const WASM_FX_SEND_COUNT = 7
export const WASM_FX_PARAM_COUNT = 12
export const WASM_FX_SAB_LEN = WASM_FX_SEND_COUNT * 2 + WASM_FX_PARAM_COUNT

export const WASM_FX_SEND_IDX = {
  FC: 0,
  ECHO: 1,
  REVERB: 2,
  AUTOFILTER: 3,
  VIBRATO: 4,
  DISTORTION: 5,
  AUTOWAH: 6,
} as const

export const WASM_FX_PARAM_OFFSET = WASM_FX_SEND_COUNT * 2

export const WASM_FX_PARAM_IDX = {
  ECHO_DELAY: 0,
  ECHO_FEEDBACK: 1,
  REVERB_DECAY: 2,
  REVERB_PREDELAY: 3,
  FC_RATE: 4,
  DISTORTION: 5,
  AUTOFILTER_FREQ: 6,
  AUTOFILTER_DEPTH: 7,
  VIBRATO_MAXDELAY: 8,
  AUTOWAH_SENS: 9,
  VIBRATO_DEPTH: 10,
  VIBRATO_FREQ: 11,
} as const

export type WASM_FX_NAME =
  | 'fc'
  | 'fcrush'
  | 'echo'
  | 'reverb'
  | 'autofilter'
  | 'vibrato'
  | 'distortion'
  | 'distort'
  | 'autowah'

function sendlineargain(value: number): number {
  return Math.pow(10, volumetodb(value) / 20)
}

function defaultfxparams(): number[] {
  return [
    tonenotationseconds('8n'),
    0.666,
    2.5,
    0.01,
    32,
    0.55,
    3,
    0.5,
    0.02,
    0.5,
    0,
    5,
  ]
}

export function defaultwasmfxsab(): number[] {
  const sab = new Array(WASM_FX_SAB_LEN).fill(0)
  const params = defaultfxparams()
  for (let i = 0; i < params.length; i++) {
    sab[WASM_FX_PARAM_OFFSET + i] = params[i]
  }
  return sab
}

function normalizefxname(fxname: string): WASM_FX_NAME | undefined {
  switch (fxname) {
    case 'fc':
    case 'fcrush':
      return 'fc'
    case 'echo':
      return 'echo'
    case 'reverb':
      return 'reverb'
    case 'autofilter':
      return 'autofilter'
    case 'vibrato':
      return 'vibrato'
    case 'distortion':
    case 'distort':
      return 'distortion'
    case 'autowah':
      return 'autowah'
    default:
      return undefined
  }
}

function sendindexfor(fxname: WASM_FX_NAME): number {
  switch (fxname) {
    case 'fc':
      return WASM_FX_SEND_IDX.FC
    case 'echo':
      return WASM_FX_SEND_IDX.ECHO
    case 'reverb':
      return WASM_FX_SEND_IDX.REVERB
    case 'autofilter':
      return WASM_FX_SEND_IDX.AUTOFILTER
    case 'vibrato':
      return WASM_FX_SEND_IDX.VIBRATO
    case 'distortion':
      return WASM_FX_SEND_IDX.DISTORTION
    case 'autowah':
      return WASM_FX_SEND_IDX.AUTOWAH
  }
}

function groupsendbase(group: number): number {
  return group * WASM_FX_SEND_COUNT
}

export function initwasmfxsab(maxi: MaxiEngine) {
  pushwasmsabvalues(maxi, WASM_FX_SAB, defaultwasmfxsab())
}

export function pushwasmfxsab(maxi: MaxiEngine, sab: number[]) {
  pushwasmsabvalues(maxi, WASM_FX_SAB, sab)
}

export function applywasmfxconfig(
  sab: number[],
  group: number,
  fxname: string,
  config: number | string,
  value: number | string,
): boolean {
  if (group < 0 || group > 1) {
    return false
  }
  const fx = normalizefxname(fxname)
  if (!fx) {
    return false
  }
  const sendbase = groupsendbase(group)
  const sendidx = sendindexfor(fx)

  if (config === 'on') {
    const level =
      fx === 'vibrato' ||
      fx === 'autofilter' ||
      fx === 'autowah' ||
      fx === 'distortion'
        ? 50
        : 18
    sab[sendbase + sendidx] = sendlineargain(level)
    return true
  }
  if (config === 'off') {
    sab[sendbase + sendidx] = 0
    return true
  }
  if (isnumber(config)) {
    sab[sendbase + sendidx] = sendlineargain(config)
    return true
  }

  const parambase = WASM_FX_PARAM_OFFSET
  if (!isstring(config)) {
    return false
  }

  switch (fx) {
    case 'echo':
      if (config === 'delaytime' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.ECHO_DELAY] = value
        return true
      }
      if (config === 'feedback' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.ECHO_FEEDBACK] = value
        return true
      }
      break
    case 'reverb':
      if (config === 'decay' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.REVERB_DECAY] = value
        return true
      }
      if (config === 'predelay' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.REVERB_PREDELAY] = value
        return true
      }
      break
    case 'fc':
      if (config === 'rate' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.FC_RATE] = value
        return true
      }
      break
    case 'distortion':
      if (config === 'distortion' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.DISTORTION] = value
        return true
      }
      break
    case 'autofilter':
      if (config === 'frequency' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.AUTOFILTER_FREQ] = value
        return true
      }
      if (config === 'depth' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.AUTOFILTER_DEPTH] = value
        return true
      }
      break
    case 'vibrato':
      if (config === 'maxdelay' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.VIBRATO_MAXDELAY] = value
        return true
      }
      if (config === 'depth' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.VIBRATO_DEPTH] = value
        return true
      }
      if (config === 'frequency' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.VIBRATO_FREQ] = value
        return true
      }
      break
    case 'autowah':
      if (config === 'sensitivity' && isnumber(value)) {
        sab[parambase + WASM_FX_PARAM_IDX.AUTOWAH_SENS] = value
        return true
      }
      break
  }

  return false
}

export function replaywasmfxfromstate(
  sab: number[],
  voicefx: SYNTH_STATE['voicefx'],
) {
  const next = defaultwasmfxsab()
  const groupkeys = Object.keys(voicefx)
  for (let g = 0; g < groupkeys.length; g++) {
    const groupkey = groupkeys[g]
    const groupidx = Number(groupkey)
    if (groupidx !== 0 && groupidx !== 1) {
      continue
    }
    const fxmap = voicefx[groupkey]
    if (!fxmap) {
      continue
    }
    const fxnames = Object.keys(fxmap)
    for (let f = 0; f < fxnames.length; f++) {
      const fxname = fxnames[f]
      const fxstate = fxmap[fxname]
      if (!fxstate) {
        continue
      }
      const configs = Object.keys(fxstate)
      for (let c = 0; c < configs.length; c++) {
        const config = configs[c]
        const fxvalue = fxstate[config]
        if (fxvalue === undefined) {
          continue
        }
        if (config === 'on') {
          if (isnumber(fxvalue)) {
            applywasmfxconfig(next, groupidx, fxname, fxvalue, '')
          } else if (isstring(fxvalue)) {
            applywasmfxconfig(next, groupidx, fxname, fxvalue, '')
          }
        } else if (isnumber(fxvalue) || isstring(fxvalue)) {
          applywasmfxconfig(next, groupidx, fxname, config, fxvalue)
        }
      }
    }
  }
  for (let i = 0; i < next.length; i++) {
    sab[i] = next[i]
  }
}
