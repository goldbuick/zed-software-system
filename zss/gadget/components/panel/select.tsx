import { useCallback } from 'react'
import { MAYBE_NUMBER } from 'zss/mapping/types'

import {
  useCacheWriteTextContext,
  tokenizeandwritetextformat,
  writechartoend,
} from '../../data/textformat'
import { useBlink } from '../useblink'
import { UserInput, UserInputHandler } from '../userinput'
import { useSharedValue } from '../useshared'

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
  const [value, setvalue] = useSharedValue<MAYBE_NUMBER>(chip, target)
  const state = value ?? 0

  const blink = useBlink()

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  const tvalue = `${values[state]}`
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  useCacheWriteTextContext(context)

  tokenizeandwritetextformat(` $dkred ? $${tcolor}${tlabel}`, context, false)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '/'
  tokenizeandwritetextformat(
    `${state + 1}$green${knob}$${tcolor}${max + 1}`,
    context,
    false,
  )

  // write value
  tokenizeandwritetextformat(`$green${tvalue}`, context, false)

  writechartoend(' ', context)

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setvalue(Math.min(max, state + step))
    },
    [max, state, setvalue],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setvalue(Math.max(min, state - step))
    },
    [min, state, setvalue],
  )

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
