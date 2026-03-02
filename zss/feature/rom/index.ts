import { objectKeys } from 'ts-extras'
import { parsetarget } from 'zss/device'
import { SOFTWARE } from 'zss/device/session'
import {
  write,
  writeheader,
  writehyperlink,
  writeoption,
  writesection,
} from 'zss/feature/writeui'
import {
  gadgetheader,
  gadgethyperlink,
  gadgetoption,
  gadgetsection,
  gadgettext,
} from 'zss/gadget/data/api'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

// ROM content. In browser: populated sync via import.meta.glob. In Node: populated async via loader-node.
let romcontent: Record<string, string> = {}

const isViteGlob = typeof (import.meta as any).glob === 'function'

if (isViteGlob) {
  // Browser/Vite: import.meta.glob available – load synchronously (no Node builtins)
  const romfiles = (import.meta as any).glob('./**/*.txt', {
    eager: true,
    query: 'raw',
  })
  objectKeys(romfiles).forEach((name: string) => {
    const p = name.replace('.txt', '').replace('./', '').replaceAll('/', ':')
    romcontent[p] = romfiles[name].default
  })
}

let romReadyPromise: Promise<void> | null = null

/** Resolve when ROM is ready. In browser this is immediate; in Node it awaits fs-based load. */
export function ensureRomReady(): Promise<void> {
  if (romcontent && Object.keys(romcontent).length > 0) {
    return Promise.resolve()
  }
  if (romReadyPromise) {
    return romReadyPromise
  }
  if (isViteGlob) {
    return Promise.resolve()
  }
  romReadyPromise = import('./loader-node').then(({ loadRomFiles }) => {
    romcontent = loadRomFiles()
  })
  return romReadyPromise
}

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

export function romscroll(player: string, line: string[]) {
  const [op, ...values] = line
  const arg1 = values[0] ?? ''
  const arg2 = values[1] ?? ''
  switch (NAME(op.trim())) {
    case 'header':
      gadgetheader(player, arg1)
      break
    case 'section':
      gadgetsection(player, arg1)
      break
    case 'option':
      gadgetoption(player, arg1, arg2)
      break
    default:
      if (op.trimStart().startsWith('!')) {
        const parts = op.trimStart().slice(1).split(' ')
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
export function stripRomValue(value: string): string {
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
