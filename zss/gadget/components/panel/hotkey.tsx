import { useCallback, useContext } from 'react'

import { tokenizeandwritetextformat } from '../../data/textformat'
import { UserHotkey, UserInput } from '../userinput'

import {
  PanelItemProps,
  ScrollContext,
  mapTo,
  chiptarget,
  inputcolor,
} from './common'

export function PanelItemHotkey({
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, shortcut, maybetext] = [
    mapTo(args[0], ''),
    mapTo(args[1], ''),
    mapTo(args[2], ''),
  ]

  const text = maybetext || ` ${shortcut.toUpperCase()} `
  const tcolor = inputcolor(active)

  tokenizeandwritetextformat(
    `${
      context.iseven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}${tcolor}$clear ${label}\n`,
    context,
    true,
  )

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target))
    scroll.sendclose()
  }, [chip, scroll, target])

  return (
    <>
      {active && <UserInput OK_BUTTON={invoke} />}
      <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey>
    </>
  )
}
