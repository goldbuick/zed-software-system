import { useCallback, useMemo } from 'react'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { UserInputHandler } from 'zss/gadget/userinputtypes'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { WORD } from 'zss/words/types'

import {
  linkbegin,
  linkmodemaddress,
  linkpanelstripe,
  linktargetargs,
} from './surface'
import type { LinkWidgetProps } from './types'

export function LinkSelect({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const { target, rest } = linktargetargs(surface)

  useHyperlinkSharedSync(
    'select',
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const { valuelabels, values } = useMemo(() => {
    const valuelabels: WORD[] = []
    const values: WORD[] = []
    for (let i = 0; i < rest.length; i += 2) {
      valuelabels.push(rest[i])
      values.push(rest[i + 1])
    }
    return { valuelabels, values }
  }, [rest])

  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueNumber(address)
  const tvalue = `${value ?? 0}`
  let stateindex = values.indexOf(tvalue)
  if (stateindex < 0) {
    stateindex = 0
  }

  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)
  const stripe = surface.layout === 'panel' ? linkpanelstripe(surface) : ''

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$dkred ? ${tcolor}${tlabel} `,
      surface.context,
      false,
    )
  } else {
    tokenizeandwritetextformat(
      `${stripe} ? ${tcolor}${tlabel} `,
      surface.context,
      false,
    )
  }

  const knob = surface.active ? '$BLWHITE$26$WHITE' : '/'
  tokenizeandwritetextformat(
    `${stateindex + 1}$green${knob}${tcolor}${values.length}`,
    surface.context,
    false,
  )

  surface.context.writefullwidth = 32
  tokenizeandwritetextformat(
    `${stripe} $green${valuelabels[stateindex] as string}`,
    surface.context,
    false,
  )
  surface.context.writefullwidth = undefined

  const up = useCallback<UserInputHandler>(() => {
    const next = Math.max(0, stateindex - 1)
    const nextvalue = parseFloat(values[next] as string)
    if (Number.isInteger(nextvalue)) {
      modemwritevaluenumber(address, nextvalue)
    }
  }, [stateindex, address, values])

  const down = useCallback<UserInputHandler>(() => {
    const next = Math.min(values.length - 1, stateindex + 1)
    const nextvalue = parseFloat(values[next] as string)
    if (Number.isInteger(nextvalue)) {
      modemwritevaluenumber(address, nextvalue)
    }
  }, [stateindex, address, values])

  return surface.active ? <UserInput MOVE_LEFT={up} MOVE_RIGHT={down} /> : null
}
