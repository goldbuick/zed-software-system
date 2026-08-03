import { parsetarget } from 'zss/device'
import { MAYBE, ispresent } from 'zss/mapping/types'
import { NAME } from 'zss/words/types'

import { romcontent } from './contentmap'

function dynamicstathint(statname: string): MAYBE<string> {
  const colormatch = /^color(\d+)$/.exec(statname)
  if (colormatch) {
    const idx = Number(colormatch[1])
    if (idx >= 0 && idx <= 15) {
      return `desc;$DKGRAYPalette RGB for color slot ${idx}`
    }
    return undefined
  }
  const charmatch = /^char(\d+)$/.exec(statname)
  if (charmatch) {
    const idx = Number(charmatch[1])
    if (idx >= 0 && idx <= 255) {
      return `desc;$DKGRAYCharset glyph pixels for character ${idx}`
    }
  }
  return undefined
}

export function romread(address: string): MAYBE<string> {
  const withaddress = NAME(
    address.trim().replaceAll('\n', '').replace(/:+$/, ''),
  )
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
          break
        case 'stats': {
          if (miss.path.length) {
            const stathint = dynamicstathint(miss.path)
            if (ispresent(stathint)) {
              return stathint
            }
          }
          break
        }
      }
      break
    }
  }
  return undefined
}
