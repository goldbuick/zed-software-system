import { useCallback, useContext } from 'react'
import { RUNTIME } from 'zss/config'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { Rect } from '../rect'

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
    mapTo(args[1], args[1]?.toString() ?? ''),
    mapTo(args[2], ''),
  ]

  const text = maybetext || ` ${shortcut.toUpperCase()} `
  const tcolor = inputcolor(active)

  const cx = context.x
  const cy = context.y

  tokenizeandwritetextformat(
    `${
      context.iseven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}${tcolor}$onclear ${label}\n`,
    context,
    true,
  )

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target))
    scroll.sendclose()
  }, [chip, scroll, target])

  return (
    <group>
      <Rect
        position={[
          cx * RUNTIME.DRAW_CHAR_WIDTH(),
          cy * RUNTIME.DRAW_CHAR_HEIGHT(),
          0,
        ]}
        width={1}
        height={1}
        visible
      />
      {active && <UserInput OK_BUTTON={invoke} />}
      <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey>
    </group>
  )
}
