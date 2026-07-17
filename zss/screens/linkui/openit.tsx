import { useCallback } from 'react'
import { doasync } from 'zss/device/doasync'
import { registerreadplayer } from 'zss/device/registerplayer'
import { SOFTWARE } from 'zss/device/session'
import { fetchrefscrolltext } from 'zss/feature/fetchrefscrolltext'
import { terminalwritemarkdownlines } from 'zss/feature/parse/markdownterminal'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkactionprefix, linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

export function LinkOpenIt({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const words = surface.words

  const invoke = useCallback(() => {
    const [, openmethod] = words
    const content = extractcontentfromargs(words, 2)
    const player = registerreadplayer()
    setTimeout(() => {
      switch (openmethod) {
        case 'zns':
          doasync(SOFTWARE, player, async () => {
            const markdowntext = await fetchrefscrolltext(content)
            if (markdowntext.trim()) {
              terminalwritemarkdownlines(player, markdowntext)
            }
          })
          break
        case 'inline':
          window.location.href = content
          break
        default:
          window.open(`${openmethod} ${content}`.trim(), '_blank')
          break
      }
    }, 100)
  }, [words])

  const tcolor = inputcolor(!!surface.active)
  tokenizeandwritetextformat(
    `${linkactionprefix(surface)}$purple$16 $yellowOPENIT ${tcolor}${surface.label}`,
    surface.context,
    true,
  )

  return surface.active ? <UserInput OK_BUTTON={invoke} /> : null
}
