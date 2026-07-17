import { useCallback, useMemo } from 'react'
import { RUNTIME } from 'zss/config'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { Rect } from 'zss/gadget/rect'
import { UserHotkey } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

const SHORTCUT = 'z'

export function LinkZSSEdit({ surface }: LinkWidgetProps) {
  linkbegin(surface)

  const target = maptovalue(surface.words[0], '')

  useHyperlinkSharedSync(
    'zssedit',
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const parsed = useMemo(
    () => parseterminalmodemprefix(surface.modemprefix),
    [surface.modemprefix],
  )

  const tcolor = inputcolor(!!surface.active)
  const text = ` ${SHORTCUT.toUpperCase()} `

  tokenizeandwritetextformat(
    `${
      surface.context.iseven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}${tcolor}$onclear ${surface.label}${surface.layout === 'panel' && ispresent(surface.row) ? `\n` : ''}`,
    surface.context,
    true,
  )

  const invoke = useCallback(() => {
    if (surface.layout === 'terminal') {
      if (!ispresent(parsed)) {
        return
      }
      setTimeout(() => {
        surface.sendmessage(parsed.chip, parsed.target, [])
      }, 100)
    } else {
      surface.sendmessage(surface.chip, target, [])
    }
  }, [surface, parsed, target])

  if (surface.layout === 'panel') {
    const cx = surface.context.x - 0.25
    const cy = surface.context.y - 0.25
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
        {surface.active && <UserInput OK_BUTTON={invoke} />}
        <UserHotkey hotkey={SHORTCUT}>{invoke}</UserHotkey>
      </group>
    )
  }

  return (
    <>
      {surface.active && <UserInput OK_BUTTON={invoke} />}
      {surface.active && <UserHotkey hotkey={SHORTCUT}>{invoke}</UserHotkey>}
    </>
  )
}
