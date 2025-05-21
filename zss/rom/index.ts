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
import { ispresent, MAYBE } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

const romfiles = import.meta.glob('./**/*.txt', { eager: true, query: 'raw' })
const romcontent: Record<string, string> = {}
objectKeys(romfiles).forEach((name) => {
  const path = name.replace('.txt', '').replace('./', '').replaceAll('/', ':')
  // @ts-expect-error yes
  romcontent[path] = romfiles[name].default
})

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

/*
Need a function that returns instructions, and describes args
*/

export type ROM_LOOKUP = Record<string, string>

export function romintolookup(content: MAYBE<string>): ROM_LOOKUP {
  const lookup: ROM_LOOKUP = {}
  romparse(content, (line: string[]) => {
    const [key, ...values] = line
    const value = values[0] ?? ''
    lookup[key] = value
  })
  return lookup
}
