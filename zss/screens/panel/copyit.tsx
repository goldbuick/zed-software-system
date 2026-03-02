import { useCallback, useContext } from 'react'
import { registercopy } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  PanelItemProps,
  ScrollContext,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelCopyIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    registercopy(SOFTWARE, registerreadplayer(), extractcontentfromargs(args))
    scroll.sendclose()
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
