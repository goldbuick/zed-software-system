import { useCallback } from 'react'
import {
  registerterminalopen,
  registerterminalquickopen,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkactionprefix, linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

export function LinkRunIt({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const words = surface.words

  const invoke = useCallback(() => {
    const content = extractcontentfromargs(words)
    if (surface.layout === 'terminal') {
      registerterminalopen(SOFTWARE, registerreadplayer(), content)
    } else {
      surface.sendclose()
      setTimeout(() => {
        registerterminalquickopen(SOFTWARE, registerreadplayer(), content)
      }, 1000)
    }
  }, [words, surface])

  const tcolor = inputcolor(!!surface.active)
  tokenizeandwritetextformat(
    `${linkactionprefix(surface)}$purple$16 $cyanRUNIT ${tcolor}${surface.label}`,
    surface.context,
    true,
  )

  return surface.active ? <UserInput OK_BUTTON={invoke} /> : null
}
