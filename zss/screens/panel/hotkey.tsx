/* eslint-disable react/no-unknown-property */
import { useCallback, useContext } from 'react'
import { RUNTIME } from 'zss/config'
import { Rect } from 'zss/gadget/rect'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import {
  PanelItemProps,
  ScrollContext,
  chiptarget,
  inputcolor,
  setuppanelitem,
} from 'zss/screens/panel/common'
import { HotkeyInput } from 'zss/screens/shared/hotkeyinput'

export function PanelHotkey({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, shortcut, maybetext, maybenoclose, ...data] = args.map((v) =>
    maptovalue(v, ''),
  )

  const text = maybetext || ` ${shortcut.toUpperCase()} `
  const tcolor = inputcolor(active)

  const cx = context.x - 0.25
  const cy = context.y - 0.25

  const content = `${
    context.iseven ? '$black$onltgray' : '$black$ondkcyan'
  }${text}${tcolor}$onclear ${label}${ispresent(row) ? `\n` : ``}`

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target), data)
    if (!maybenoclose) {
      scroll.sendclose()
    }
  }, [chip, scroll, target, maybenoclose, data])

  return (
    <group
      position={[
        cx * RUNTIME.DRAW_CHAR_WIDTH(),
        cy * RUNTIME.DRAW_CHAR_HEIGHT(),
        1,
      ]}
    >
      <HotkeyInput
        active={active}
        shortcut={shortcut}
        content={content}
        adapter={{
          context,
          setup: () => setuppanelitem(sidebar, row, context),
          invoke,
        }}
      >
        <Rect
          visible={false}
          width={text.length + 0.5}
          height={1.5}
          blocking
          onClick={invoke}
        />
      </HotkeyInput>
    </group>
  )
}
