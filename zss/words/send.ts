import { isstring } from 'zss/mapping/types'

import { EVAL_DIR, isstrdir } from './dir'
import { ARG_TYPE, readargs } from './reader'
import { WORD } from './types'

export type SEND_META = {
  targetdir?: EVAL_DIR
  targetname?: string
  label: string
  args: WORD[]
}

export function parsesend(words: WORD[], candirsend = false): SEND_META {
  const [first, aa] = readargs(words, 0, [ARG_TYPE.ANY])
  if (candirsend && isstrdir(first)) {
    const [targetdir, label, bb] = readargs(words, 0, [
      ARG_TYPE.DIR, // target
      ARG_TYPE.NAME, // label
    ])
    // <dir> :label [args]
    if (label.startsWith(':')) {
      return {
        targetdir,
        label: label.substring(1).trim(),
        args: words.slice(bb),
      }
    }
    // <dir> label [args]
    return {
      targetdir,
      label,
      args: words.slice(bb),
    }
  } else if (isstring(first)) {
    const [targetname, maybelabel, cc] = readargs(words, 0, [
      ARG_TYPE.NAME, // maybe target name
      ARG_TYPE.ANY, // maybe label name
    ])
    // target:label [args]
    if (isstring(maybelabel) && maybelabel.startsWith(':')) {
      console.info(maybelabel, '??')
      return {
        targetname,
        label: maybelabel.substring(1).trim(),
        args: words.slice(cc),
      }
    }
    // label [args]
    return {
      targetname: 'self',
      label: targetname,
      args: words.slice(aa),
    }
  }
  return {
    targetname: '',
    label: '',
    args: [],
  }
}
