import { useCallback, useContext } from 'react'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { UserInput } from '../userinput'

import {
  PanelItemProps,
  ScrollContext,
  chiptarget,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelItemHyperlink({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const [target, data] = [maptovalue(args[0], ''), args[1]]

  const tcolor = inputcolor(active)
  tokenizeandwritetextformat(`  $purple$16 ${tcolor}${label}\n`, context, true)

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target), data)
    scroll.sendclose()
  }, [scroll, chip, target, data])

  return active && <UserInput OK_BUTTON={invoke} />
}
