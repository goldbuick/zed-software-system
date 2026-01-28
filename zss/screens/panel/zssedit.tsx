/* eslint-disable react/no-unknown-property */
import { useCallback, useContext } from 'react'
import { RUNTIME } from 'zss/config'
import { Rect } from 'zss/gadget/rect'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  PanelItemProps,
  ScrollContext,
  chiptarget,
  inputcolor,
  setuppanelitem,
} from './common'

export function PanelZSSEdit({
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(false, row, context)

  const [target] = [maptovalue(args[0], '')]

  const shortcut = 'z'
  const text = ` ${shortcut.toUpperCase()} `
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
    scroll.sendmessage(chiptarget(chip, target), [])
  }, [scroll, chip, target])

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
