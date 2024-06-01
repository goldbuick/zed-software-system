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
    labelmin = 'L'
    labelmax = 'H'
  } else if (maybelabelmax === '') {
    labelmin = 'L'
    labelmax = maybelabelmin
  } else {
    labelmin = maybelabelmin
    labelmax = maybelabelmax
  }

  const min = 0
  const max = 8

  // state
  const [value, setvalue] = useSharedValue<MAYBE_NUMBER>(chip, target)
  const state = value ?? 0

  const blink = useBlink()
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  useCacheWriteTextContext(context)

  tokenizeandwritetextformat(` $red $29 ${tcolor}${tlabel}`, context, false)

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
