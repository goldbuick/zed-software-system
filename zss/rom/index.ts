import { parsetarget } from 'zss/device'
import { SOFTWARE } from 'zss/device/session'
import { write, writehyperlink } from 'zss/feature/writeui'
import {
  zssheaderlines,
  zssoptionline,
  zsssectionlines,
} from 'zss/feature/zsstextui'
import { gadgethyperlink, gadgettext } from 'zss/gadget/data/api'
import { scrolllinksplittokens } from 'zss/gadget/data/scrollwritelines'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { romcontent } from './contentmap'

export function romread(address: string): MAYBE<string> {
  const withaddress = NAME(
    address.trim().replaceAll('\n', '').replace(/:+$/, ''),
  )
  // console.info(withaddress)
  const maybecontent = romcontent[withaddress]
  if (ispresent(maybecontent)) {
    return maybecontent
  }
  // dynamic context help
  const { target, path } = parsetarget(withaddress)
  switch (target) {
    case 'editor': {
      const miss = parsetarget(path)
      switch (miss.target) {
        case 'command':
          if (miss.path.length) {
            return `desc;$DKGRAYsends the message ${miss.path}`
          }
      }
      break
    }
  }
  return undefined
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
      for (const line of zssheaderlines(arg1)) {
        write(SOFTWARE, player, line)
      }
      break
    case 'section':
      for (const line of zsssectionlines(arg1)) {
        write(SOFTWARE, player, line)
      }
      break
    case 'option':
      write(SOFTWARE, player, zssoptionline(arg1, arg2))
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

export function romscroll(player: string, line: string[]) {
  const [op, ...values] = line
  const arg1 = values[0] ?? ''
  const arg2 = values[1] ?? ''
  switch (NAME(op.trim())) {
    case 'header':
      for (const line of zssheaderlines(arg1)) {
        gadgettext(player, line)
      }
      break
    case 'section':
      for (const line of zsssectionlines(arg1)) {
        gadgettext(player, line)
      }
      break
    case 'option':
      gadgettext(player, zssoptionline(arg1, arg2))
      break
    default:
      if (op.trimStart().startsWith('!')) {
        const parts = scrolllinksplittokens(op.trimStart().slice(1))
        const second = NAME(parts[1] ?? '')
        switch (second) {
          case 'hk':
          case 'hotkey':
            gadgethyperlink(player, 'refscroll', arg1, [
              parts[0] ?? '',
              parts[1] ?? '',
              parts[2] ?? '',
              ` ${parts[3] ?? ''} `,
              parts[4] ?? '',
            ])
            break
          default:
            gadgethyperlink(player, 'refscroll', arg1, parts)
            break
        }
      } else if (op.trimStart().startsWith('"')) {
        gadgettext(player, op.trimStart().slice(1))
      } else {
        gadgettext(player, op)
      }
      break
  }
}

/*
Need a function that returns instructions, and describes args
*/

export type ROM_LOOKUP = Record<string, string>

/** Strip leading $COLOR token from ROM value for plain display (e.g. args hint). */
export function stripromvalue(value: string): string {
  return value.replace(/^\$\w+/i, '').trim()
}

export function romintolookup(content: MAYBE<string>): ROM_LOOKUP {
  const lookup: ROM_LOOKUP = {}
  romparse(content, (line: string[]) => {
    const [key, ...values] = line
    const value = values[0] ?? ''
    lookup[key] = value
  })
  return lookup
}

export { romhintfrommarkdown } from './romhint'
