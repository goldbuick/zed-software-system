import { useCallback } from 'react'
import { register_terminal_quickopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelItemRunIt({
  sidebar,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const invoke = useCallback(() => {
    const [, ...values] = args
    register_terminal_quickopen(
      SOFTWARE,
      registerreadplayer(),
      values.join(' '),
    )
  }, [args])

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
