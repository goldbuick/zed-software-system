import { useCallback } from 'react'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { UserInputHandler } from 'zss/gadget/userinputtypes'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor, strsplice } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  linkbegin,
  linkmodemaddress,
  linkpanelstripe,
  linktargetargs,
} from './surface'
import type { LinkWidgetProps } from './types'

export function LinkRange({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const { target, rest } = linktargetargs(surface)

  useHyperlinkSharedSync(
    'range',
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const maybelabelmin = maptovalue(rest[0], '')
  const maybelabelmax = maptovalue(rest[1], '')

  let labelmin: string
  let labelmax: string
  if (maybelabelmin === '') {
    labelmin = 'L '
    labelmax = ' H'
  } else if (maybelabelmax === '') {
    labelmin = 'L '
    labelmax = ` ${String(maybelabelmin)}`
  } else {
    labelmin = `${String(maybelabelmin)} `
    labelmax = ` ${String(maybelabelmax)}`
  }

  const min = 0
  const max = 8
  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0

  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$red $29 ${tcolor}${tlabel} `,
      surface.context,
      false,
    )
  } else {
    tokenizeandwritetextformat(
      `${linkpanelstripe(surface)} $29 ${tcolor}${tlabel} `,
      surface.context,
      false,
    )
  }

  const knob = surface.active ? '$BLWHITE$26$WHITE' : '$4'
  const bar = strsplice('----:----', state, 1, `$green${knob}${tcolor}`)
    .replaceAll('-', '$7')
    .replaceAll(':', '$9')

  tokenizeandwritetextformat(
    `${tcolor}${labelmin}${bar}${labelmax} $green${state + 1}`,
    surface.context,
    false,
  )

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.min(max, state + step))
    },
    [max, state, address],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.max(min, state - step))
    },
    [min, state, address],
  )

  return surface.active ? (
    <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />
  ) : null
}
