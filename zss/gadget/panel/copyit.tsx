import { useCallback, useContext } from 'react'
import { api_toast } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { UserInput } from '../userinput'

import {
  PanelItemProps,
  ScrollContext,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelItemCopyIt({
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    setTimeout(() => {
      if (ispresent(withclipboard())) {
        const words = [maptovalue(args[0], ''), args[1]]
        const [, ...values] = words
        const content = values.join(' ')
        withclipboard()
          .writeText(content)
          .then(() => {
            api_toast(SOFTWARE, registerreadplayer(), `copied! ${content}`)
            scroll.sendclose()
          })
          .catch((err) => console.error(err))
      }
    }, 100)
  }, [args, scroll])

  const tcolor = inputcolor(!!active)

  // render output
  setuppanelitem(row, context)
  tokenizeandwritetextformat(
    `  $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
