import { isstring } from 'zss/mapping/types'

import { EVAL_DIR, isstrdir } from './dir'
import { ARG_TYPE, readargs } from './reader'
import { WORD } from './types'

export type SEND_META = {
  targetdir?: EVAL_DIR
  targetname?: string
  label: string
}

export function parsesend(words: WORD[], candirsend = false): SEND_META {
  const [first] = readargs(words, 0, [ARG_TYPE.ANY])
  if (candirsend && isstrdir(first)) {
    const [targetdir, maybelabel, ii] = readargs(words, 0, [
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
      // target:label
      const labelparts = [maybelabel.substring(1).trim(), ...words.slice(ii)]
      return {
        targetname,
        label: labelparts.join(' '),
      }
    }
    // only label
    const labelparts = [targetname, ...words.slice(ii - 1)]
    return {
      targetname: 'self',
      label: labelparts.join(' '),
    }
  }
  return {
    targetname: '',
    label: '',
  }
}
