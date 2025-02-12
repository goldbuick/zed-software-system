import { useCallback, useContext } from 'react'
import { RUNTIME } from 'zss/config'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { ispresent } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { Rect } from '../rect'

import {
  PanelItemProps,
  ScrollContext,
  mapTo,
  chiptarget,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelItemHotkey({
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(row, context)

  const [target, shortcut, maybetext] = [
    mapTo(args[0], ''),
    mapTo(args[1], args[1]?.toString() ?? ''),
    mapTo(args[2], ''),
  ]

  const text = maybetext || ` ${shortcut.toUpperCase()} `
  const tcolor = inputcolor(active)

  const cx = context.x - 0.25
  const cy = context.y - 0.25

  tokenizeandwritetextformat(
    `${
      context.iseven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}${tcolor}$onclear ${label}${ispresent(row) ? `\n` : ``}`,
    context,
    true,
  )

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target))
    scroll.sendclose()
  }, [chip, scroll, target])

  return (
    <group
      position={[
        cx * RUNTIME.DRAW_CHAR_WIDTH(),
        cy * RUNTIME.DRAW_CHAR_HEIGHT(),
        1,
      ]}
    >
      <Rect
        visible={false}
        width={text.length + 0.5}
        height={1.5}
        blocking
        onClick={invoke}
      />
      {active && <UserInput OK_BUTTON={invoke} />}
      {shortcut && <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey>}
    </group>
  )
}
