import { useCallback } from 'react'
import { registercopy } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  linkactionprefix,
  linkafterinvoke,
  linkbegin,
} from './surface'
import type { LinkWidgetProps } from './types'

export function LinkCopyIt({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const words = surface.words

  const invoke = useCallback(() => {
    registercopy(SOFTWARE, registerreadplayer(), extractcontentfromargs(words))
    linkafterinvoke(surface)
  }, [words, surface])

  const tcolor = inputcolor(!!surface.active)
  tokenizeandwritetextformat(
    `${linkactionprefix(surface)}$purple$16 $yellowCOPYIT ${tcolor}${surface.label}`,
    surface.context,
    true,
  )

  return surface.active ? <UserInput OK_BUTTON={invoke} /> : null
}
