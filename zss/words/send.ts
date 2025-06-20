import { isstring } from 'zss/mapping/types'

import { EVAL_DIR, isstrdir } from './dir'
import { ARG_TYPE, readargs } from './reader'
import { NAME, WORD } from './types'

export type SEND_META = {
  targetdir?: EVAL_DIR
  targetname?: string
  label: string
}

export function parsesend(words: WORD[]): SEND_META {
  const [first, second] = readargs(words, 0, [ARG_TYPE.NAME, ARG_TYPE.ANY])
  if (NAME(first) === 'send' && isstrdir(second)) {
    const [, targetdir, maybelabel, ii] = readargs(words, 0, [
      ARG_TYPE.NAME, // #send
      ARG_TYPE.DIR, // target
      ARG_TYPE.MAYBE_NAME, // label
    ])
    if (isstring(maybelabel) && maybelabel.startsWith(':')) {
      return {
        targetdir,
        label: [maybelabel.substring(1).trim(), ...words.slice(ii)].join(' '),
      }
    }
    return {
      targetdir,
      label: words.slice(ii - 1).join(' '),
    }
  } else if (isstring(first)) {
    const [targetname, maybelabel, ii] = readargs(words, 0, [
      ARG_TYPE.NAME, // maybe target name
      ARG_TYPE.MAYBE_NAME, // maybe label name
    ])
    if (isstring(maybelabel) && maybelabel.startsWith(':')) {
      return {
        targetname,
        label: [maybelabel.substring(1).trim(), ...words.slice(ii)].join(' '),
      }
    }
    return {
      targetname: 'self',
      label: [targetname, ...words.slice(ii - 1)].join(' '),
    }
  }
  return {
    targetname: '',
    label: '',
  }
}
