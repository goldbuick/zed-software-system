import { isstring } from 'zss/mapping/types'

import { EVAL_DIR, isstrdir } from './dir'
import { ARG_TYPE, readargs } from './reader'
import { NAME, WORD } from './types'

export type SEND_META = {
  targetdir?: EVAL_DIR
  targetname?: string
  label: string
  data?: any
}

function maplabel(maybelabel: any) {
  return isstring(maybelabel) && maybelabel.startsWith(':')
    ? NAME(maybelabel.slice(1).trim())
    : ''
}

export function parsesend(words: WORD[]): SEND_META {
  const [first, second] = readargs(words, 0, [ARG_TYPE.ANY, ARG_TYPE.ANY])
  if (first === 'send' && isstrdir(second)) {
    const [, targetdir, maybelabel, data] = readargs(words, 0, [
      ARG_TYPE.NAME, // #send
      ARG_TYPE.DIR,
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
    ])
    const label = maplabel(maybelabel)
    return {
      targetdir,
      label,
      data,
    }
  } else {
    const [targetname, maybelabel, data] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
      ARG_TYPE.ANY,
    ])
    const label = maplabel(maybelabel)
    if (label) {
      return {
        targetname,
        label,
        data,
      }
    }
    return {
      targetname: 'self',
      label: targetname,
      data,
    }
  }
}
