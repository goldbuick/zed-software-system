import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'
import { useBlink } from 'zss/gadget/hooks'
import { UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { PanelItemProps, inputcolor, setuppanelitem, strsplice } from './common'

export function PanelRange({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const [target, maybelabelmin, maybelabelmax] = [
    maptovalue(args[0], ''),
    maptovalue(args[1], ''),
    maptovalue(args[2], ''),
  ]

  let labelmin: string
  let labelmax: string
  if (maybelabelmin === '') {
    labelmin = 'L '
    labelmax = ' H'
  } else if (maybelabelmax === '') {
    labelmin = 'L '
    labelmax = ` ${maybelabelmin}`
  } else {
    labelmin = `${maybelabelmin} `
    labelmax = ` ${maybelabelmax}`
  }

  const min = 0
  const max = 8

  // state
  const address = paneladdress(chip, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0

  const blink = useBlink()
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  tokenizeandwritetextformat(`$red $29 ${tcolor}${tlabel} `, context, false)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '$4'
  const bar = strsplice('----:----', state, 1, `$green${knob}${tcolor}`)
    .replaceAll('-', '$7')
    .replaceAll(':', '$9')

  tokenizeandwritetextformat(
    `${tcolor}${labelmin}${bar}${labelmax} $green${state + 1}`,
    context,
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

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
