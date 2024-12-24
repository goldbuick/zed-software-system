import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useBlink } from '../hooks'
import { UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, inputcolor, mapTo, strsplice } from './common'

export function PanelItemRange({
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, maybelabelmin, maybelabelmax] = [
    mapTo(args[0], ''),
    mapTo(args[1], ''),
    mapTo(args[2], ''),
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
  const modem = useWaitForValueNumber(address)
  const state = modem?.value ?? 0

  const blink = useBlink()
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  tokenizeandwritetextformat(` $red $29 ${tcolor}${tlabel} `, context, false)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '$4'
  const bar = strsplice('----:----', state, 1, `$green${knob}${tcolor}`)
    .replaceAll('-', '$7')
    .replaceAll(':', '$9')

  tokenizeandwritetextformat(
    `${tcolor}${labelmin}${bar}${labelmax} $green${state + 1}\n`,
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
