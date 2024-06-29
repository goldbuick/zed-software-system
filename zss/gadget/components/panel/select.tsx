import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'

import {
  useCacheWriteTextContext,
  tokenizeandwritetextformat,
} from '../../data/textformat'
import { useBlink } from '../useblink'
import { UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, inputcolor, mapTo } from './common'

export function PanelItemSelect({
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, ...values] = [mapTo(args[0], ''), ...args.slice(1)]

  const min = 0
  const max = values.length - 1

  // state
  const address = paneladdress(chip, target)
  const modem = useWaitForValueNumber(address)
  const state = modem?.value ?? 0

  const blink = useBlink()

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  const tvalue = `${values[state]}`
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  useCacheWriteTextContext(context)

  tokenizeandwritetextformat(` $dkred ? ${tcolor}${tlabel} `, context, false)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '/'
  tokenizeandwritetextformat(
    `${state + 1}$green${knob}${tcolor}${max + 1}`,
    context,
    false,
  )

  // write value
  tokenizeandwritetextformat(` $green${tvalue}\n`, context, false)

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
