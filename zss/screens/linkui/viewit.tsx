import { useCallback } from 'react'
import { useMedia } from 'zss/gadget/media'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { LinkTapTarget } from './linktap'
import { readlinktaparea } from './linktaparea'
import { linkactionprefix, linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

export function LinkViewIt({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const { setviewimage } = useMedia()
  const words = surface.words

  const invoke = useCallback(() => {
    const content = extractcontentfromargs(words)
    if (surface.layout === 'terminal') {
      setTimeout(() => setviewimage(content), 100)
    } else {
      setviewimage(content)
    }
  }, [setviewimage, words, surface.layout])

  const tcolor = inputcolor(!!surface.active)
  tokenizeandwritetextformat(
    `${linkactionprefix(surface)}$purple$16 ${tcolor}${surface.label}${surface.layout === 'panel' ? '\n' : ''}`,
    surface.context,
    true,
  )

  return (
    <>
      <LinkTapTarget
        surface={surface}
        area={readlinktaparea(surface)}
        ontap={invoke}
      />
      {surface.active && <UserInput OK_BUTTON={invoke} />}
    </>
  )
}
