import { useCallback, useMemo } from 'react'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserHotkey } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { ispresent } from 'zss/mapping/types'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { LinkTapTarget } from './linktap'
import { readlinktaparea } from './linktaparea'
import { linkafterinvoke, linkallowhotkeys, linkbegin } from './surface'
import type { LinkWidgetProps } from './types'

const SHORTCUT = 'z'

export function LinkZSSEdit({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const allowhotkeys = linkallowhotkeys(surface)

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
      linkafterinvoke(surface)
    }
  }, [surface, parsed, target])

  const hotkeyon =
    allowhotkeys && (surface.layout === 'panel' || surface.active)

  return (
    <>
      <LinkTapTarget
        surface={surface}
        area={readlinktaparea(surface)}
        ontap={invoke}
      />
      {surface.active && <UserInput OK_BUTTON={invoke} />}
      {hotkeyon ? <UserHotkey hotkey={SHORTCUT}>{invoke}</UserHotkey> : null}
    </>
  )
}
