import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { fetchwiki, parsemarkdown } from 'zss/feature/parse/markdown'
import { doasync } from 'zss/mapping/func'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { UserInput } from '../userinput'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelItemOpenIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const invoke = useCallback(() => {
    const [, openmethod, ...values] = args
    const content = values.join(' ')
    const player = registerreadplayer()
    switch (openmethod) {
      case 'wiki':
        doasync(SOFTWARE, player, async () => {
          const markdowntext = await fetchwiki(content)
          parsemarkdown(player, markdowntext)
        })
        break
      case 'inline':
        window.location.href = content
        break
      default:
        window.open(`${openmethod as string} ${content}`.trim(), '_blank')
        break
    }
  }, [args])

  const tcolor = inputcolor(!!active)

  // render output
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $yellowOPENIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
