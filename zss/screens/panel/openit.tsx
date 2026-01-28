import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { fetchwiki } from 'zss/feature/fetchwiki'
import { parsemarkdownforwriteui } from 'zss/feature/parse/markdownwriteui'
import { UserInput } from 'zss/gadget/userinput'
import { doasync } from 'zss/mapping/func'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelOpenIt({
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
    setTimeout(() => {
      switch (openmethod) {
        case 'wiki':
          doasync(SOFTWARE, player, async () => {
            const markdowntext = await fetchwiki(content)
            parsemarkdownforwriteui(player, markdowntext)
          })
          break
        case 'inline':
          window.location.href = content
          break
        default:
          window.open(`${openmethod as string} ${content}`.trim(), '_blank')
          break
      }
    }, 100)
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
