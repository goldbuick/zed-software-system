import { useCallback, useRef, useState } from 'react'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserFocus } from 'zss/gadget/userinput'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { UserInputHandler } from 'zss/gadget/userinputtypes'
import { maptonumber } from 'zss/mapping/value'
import { useLinkEditCancelOnInactive } from 'zss/screens/linkui/linkeditcancel'
import { inputcolor } from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import {
  linkbegin,
  linkmodemaddress,
  linkpanelstripe,
  linktargetargs,
} from './surface'
import type { LinkWidgetProps } from './types'

const MAYBEDEFAULT = -111111

export function LinkNumber({ surface }: LinkWidgetProps) {
  linkbegin(surface)
  const { target, rest } = linktargetargs(surface)

  useHyperlinkSharedSync(
    'number',
    surface.layout === 'terminal'
      ? { modemprefix: surface.modemprefix }
      : { chip: surface.chip, target },
  )

  const maybemin = maptonumber(rest[0], MAYBEDEFAULT)
  const maybemax = maptonumber(rest[1], MAYBEDEFAULT)

  let min: number
  let max: number
  if (maybemin === MAYBEDEFAULT) {
    min = 0
    max = 31
  } else if (maybemax === MAYBEDEFAULT) {
    min = 0
    max = maybemin
  } else {
    min = maybemin
    max = maybemax
  }

  const address = linkmodemaddress(surface, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? min
  const clamped = Math.min(max, Math.max(min, state))

  const tlabel = surface.label.trim()
  const tcolor = inputcolor(!!surface.active)

  const [editing, setediting] = useState(false)
  const snapshot = useRef(clamped)
  const editingref = useRef(editing)
  editingref.current = editing

  const cancelediting = useCallback(() => {
    if (!editingref.current) {
      return
    }
    modemwritevaluenumber(address, snapshot.current)
    setediting(false)
  }, [address])

  const acceptediting = useCallback(() => {
    setediting(false)
  }, [])

  const enterediting = useCallback(() => {
    snapshot.current = clamped
    setediting(true)
  }, [clamped])

  useLinkEditCancelOnInactive(!!surface.active, cancelediting)

  if (surface.layout === 'terminal') {
    tokenizeandwritetextformat(
      `$red $29 ${tcolor}${tlabel} $green${clamped}`,
      surface.context,
      false,
    )
  } else {
    tokenizeandwritetextformat(
      `${linkpanelstripe(surface)} $29 ${tcolor}${tlabel} $green${clamped}`,
      surface.context,
      false,
    )
  }

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.min(max, clamped + step))
    },
    [address, clamped, max],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.max(min, clamped - step))
    },
    [address, clamped, min],
  )

  if (editing) {
    return (
      <UserFocus blockhotkeys>
        <UserInput
          MOVE_LEFT={down}
          MOVE_RIGHT={up}
          OK_BUTTON={acceptediting}
          CANCEL_BUTTON={cancelediting}
        />
      </UserFocus>
    )
  }

  return surface.active ? <UserInput OK_BUTTON={enterediting} /> : null
}
