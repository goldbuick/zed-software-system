import { useCallback, useMemo } from 'react'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  linkactionprefix,
  linkafterinvoke,
  linkbegin,
} from './surface'
import type { LinkWidgetProps } from './types'

export function LinkHyperlink({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const words = surface.words.map((v) => maptovalue(v, ''))
  const [target, ...data] = words
  const tcolor = inputcolor(!!surface.active)
  const modem = useMemo(
    () => parseterminalmodemprefix(surface.modemprefix),
    [surface.modemprefix],
  )

  tokenizeandwritetextformat(
    `${linkactionprefix(surface)}$purple$16 ${tcolor}${surface.label}${surface.layout === 'panel' ? '\n' : ''}`,
    surface.context,
    true,
  )

  const invoke = useCallback(() => {
    const run = () => {
      if (surface.layout === 'terminal') {
        surface.sendmessage(modem?.chip ?? '', target, data)
      } else {
        surface.sendmessage(surface.chip, target, data)
        linkafterinvoke(surface)
      }
    }
    if (surface.layout === 'terminal') {
      setTimeout(run, 100)
    } else {
      run()
    }
  }, [surface, modem?.chip, target, data])

  return surface.active ? <UserInput OK_BUTTON={invoke} /> : null
}
