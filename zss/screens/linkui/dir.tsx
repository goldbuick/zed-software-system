import { useCallback } from 'react'
import { modemwritevaluestring } from 'zss/device/modem'
import { useWaitForValueString } from 'zss/device/modemhooks'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { UserInputHandler } from 'zss/gadget/userinputtypes'
import {
  DIR_EDIT_CARDINALS,
  memoryclampdireditcardinal,
} from 'zss/memory/deltadirstat'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  linkbegin,
  linkmodemaddress,
  linkpanelstripe,
  linktargetargs,
} from './surface'
import type { LinkWidgetProps } from './types'

const DIR_CHOICES = DIR_EDIT_CARDINALS

export function LinkDir({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const { target } = linktargetargs(surface)

  useHyperlinkSharedSync(
    'dir',
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueString(address)
  const raw = value?.toJSON() ?? 'north'
  const state = memoryclampdireditcardinal(raw)
  let stateindex = DIR_CHOICES.indexOf(state)
  if (stateindex < 0) {
    stateindex = 0
  }

  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)
  const stripe = surface.layout === 'panel' ? linkpanelstripe(surface) : ''

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$dkred ? ${tcolor}$onclear ${tlabel} `,
      surface.context,
      false,
    )
  } else {
    tokenizeandwritetextformat(
      `${stripe} ? ${tcolor}$onclear ${tlabel} `,
      surface.context,
      false,
    )
  }

  const knob = surface.active ? '$BLWHITE$26$WHITE' : '/'
  tokenizeandwritetextformat(
    `${stateindex + 1}$green${knob}${tcolor}${DIR_CHOICES.length}`,
    surface.context,
    false,
  )

  surface.context.writefullwidth = 32
  tokenizeandwritetextformat(
    ` ${stripe}$green${DIR_CHOICES[stateindex]}`,
    surface.context,
    false,
  )
  surface.context.writefullwidth = undefined

  const up = useCallback<UserInputHandler>(() => {
    const next = Math.max(0, stateindex - 1)
    modemwritevaluestring(address, DIR_CHOICES[next])
  }, [stateindex, address])

  const down = useCallback<UserInputHandler>(() => {
    const next = Math.min(DIR_CHOICES.length - 1, stateindex + 1)
    modemwritevaluestring(address, DIR_CHOICES[next])
  }, [stateindex, address])

  return surface.active ? <UserInput MOVE_LEFT={up} MOVE_RIGHT={down} /> : null
}
