import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'
import { UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { maptonumber, maptovalue } from 'zss/mapping/value'
import {
  PanelItemProps,
  inputcolor,
  setuppanelitem,
} from 'zss/screens/panel/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

const maybedefault = -111111

export function PanelNumber({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const [target, maybemin, maybemax] = [
    maptovalue(args[0], ''),
    maptonumber(args[1], maybedefault),
    maptonumber(args[2], maybedefault),
  ]

  let min: number
  let max: number
  if (maybemin === maybedefault) {
    min = 0
    max = 31
  } else if (maybemax === maybedefault) {
    min = 0
    max = maybemin
  } else {
    min = maybemin
    max = maybemax
  }

  const address = paneladdress(chip, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? min
  const clamped = Math.min(max, Math.max(min, state))

  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  const prefix = context.iseven ? '$dkgreen$onblack' : '$green$ondkgrey'
  tokenizeandwritetextformat(
    `${prefix} $29 $ondkblue ${tcolor}${tlabel} $green${clamped}`,
    context,
    false,
  )

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      const next = Math.min(max, clamped + step)
      modemwritevaluenumber(address, next)
    },
    [address, clamped, max],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      const next = Math.max(min, clamped - step)
      modemwritevaluenumber(address, next)
    },
    [address, clamped, min],
  )

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
