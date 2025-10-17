import { useCallback, useContext } from 'react'
import { register_terminal_quickopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  PanelItemProps,
  ScrollContext,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelItemRunIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    const [, ...values] = args
    scroll.sendclose()
    setTimeout(() => {
      register_terminal_quickopen(
        SOFTWARE,
        registerreadplayer(),
        values.join(' '),
      )
    }, 1000)
  }, [args, scroll])

  const tcolor = inputcolor(!!active)

  // render output
  setuppanelitem(sidebar, row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $cyanRUNIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}

//
