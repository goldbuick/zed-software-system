import { useCallback, useContext } from 'react'
import { api_toast } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { UserInput } from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  PanelItemProps,
  ScrollContext,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelItemCopyIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    const [, ...words] = args
    const content = words.join(' ')
    withclipboard()
      .writeText(content)
      .then(() => {
        api_toast(
          SOFTWARE,
          registerreadplayer(),
          `copied! ${content.slice(0, 20)}`,
        )
        scroll.sendclose()
      })
      .catch((err) => console.error(err))
  }, [args, scroll])

  const tcolor = inputcolor(!!active)

  // render output
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
