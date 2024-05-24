import { useCallback, useContext } from 'react'

import { tokenizeandwritetextformat } from '../../data/textformat'
import { UserInput } from '../userinput'

import {
  PanelItemProps,
  ScrollContext,
  mapTo,
  chiptarget,
  inputcolor,
} from './common'

export function PanelItemHyperText({
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, data] = [mapTo(args[0], ''), args[1]]

  const tcolor = inputcolor(active)
  tokenizeandwritetextformat(`  $purple$16 $${tcolor}${label}`, context, true)

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target), data)
    scroll.sendclose()
  }, [scroll, chip, target, data])

  return active && <UserInput OK_BUTTON={invoke} />
}
