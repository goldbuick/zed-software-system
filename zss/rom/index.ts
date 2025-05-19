import { parsetarget } from 'zss/device'
import { SOFTWARE } from 'zss/device/session'
import {
  write,
  writeheader,
  writehyperlink,
  writeoption,
  writesection,
} from 'zss/feature/writeui'
import { MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { helpread } from './help'

export function romread(address: string) {
  const { target, path } = parsetarget(address)
  switch (target) {
    case 'help':
      return helpread(path)
  }
}

export function romparse(
  content: MAYBE<string>,
  handler: (line: string[]) => void,
) {
  const lines = (content ?? '').split('\n')
  for (let i = 0; i < lines.length; ++i) {
    handler(lines[i].split(';'))
  }
}

export function romprint(player: string, line: string[]) {
  const [op, ...values] = line
  const arg1 = values[0] ?? ''
  const arg2 = values[1] ?? ''
  switch (NAME(op.trim())) {
    case 'header':
      writeheader(SOFTWARE, player, arg1)
      break
    case 'section':
      writesection(SOFTWARE, player, arg1)
      break
    case 'option':
      writeoption(SOFTWARE, player, arg1, arg2)
      break
    default:
      if (op.trimStart().startsWith('!')) {
        writehyperlink(SOFTWARE, player, op.trimStart().slice(1), arg1)
      } else {
        write(SOFTWARE, player, op)
      }
      break
  }
}

/*
Need a function that returns instructions, and describes args
*/

export function romintolookup(content: MAYBE<string>) {
  const lookup: Record<string, string> = {}
  romparse(content, (line: string[]) => {
    const [key, ...values] = line
    const value = values[0] ?? ''
    lookup[key] = value
  })
  return lookup
}
