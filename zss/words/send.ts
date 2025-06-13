import { isstring } from 'zss/mapping/types'

import { EVAL_DIR, isstrdir } from './dir'
import { ARG_TYPE, readargs } from './reader'
import { NAME, WORD } from './types'

type SEND_META = {
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
  const [value] = readargs(words, 0, [ARG_TYPE.ANY])
  if (isstrdir(value) && NAME(value[0] as string) !== 'player') {
    const [targetdir, maybelabel, data] = readargs(words, 0, [
      ARG_TYPE.DIR,
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
    ])
    const islabel = maplabel(maybelabel)
    return {
      targetdir,
      label: islabel ? islabel : 'bump',
      data: islabel ? data : maybelabel,
    }
  } else {
    const [targetname, maybelabel, data] = readargs(words, 0, [
      ARG_TYPE.NAME,
      ARG_TYPE.ANY,
      ARG_TYPE.ANY,
    ])
    const islabel = maplabel(maybelabel)
    return {
      targetname: islabel ? targetname : 'self',
      label: islabel ? islabel : targetname,
      data: islabel ? data : maybelabel,
    }
  }
}
