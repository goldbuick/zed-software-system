import { useCallback, useContext } from 'react'
import { RUNTIME } from 'zss/config'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { Rect } from '../rect'
import { UserHotkey, UserInput } from '../userinput'

import {
  PanelItemProps,
  ScrollContext,
  mapTo,
  chiptarget,
  inputcolor,
} from './common'

export function PanelItemCharEdit({
  chip,
  inline,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, shortcut] = [mapTo(args[0], ''), mapTo(args[1], '')]

  const text = ` ${shortcut.toUpperCase()} `
  const tcolor = inputcolor(active)

  const cx = context.x - 0.25
  const cy = context.y - 0.25

  tokenizeandwritetextformat(
    `${
      context.iseven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}${tcolor}$onclear ${label}${inline ? `` : `\n`}`,
    context,
    true,
  )

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target), undefined)
    scroll.sendclose()
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
