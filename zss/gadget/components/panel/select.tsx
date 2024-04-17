import React, { useCallback } from 'react'
import { MAYBE_NUMBER } from 'zss/mapping/types'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from '../../data/textformat'
import { UserInput, UserInputHandler } from '../userinput'
import { useSharedValue } from '../useshared'

import { PanelItemProps, inputcolor, mapTo, useBlink } from './common'

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
  const [value, setValue] = useSharedValue<MAYBE_NUMBER>(chip, target)
  const state = value ?? 0

  const blink = useBlink()

  const tvalue = `${values[state]}`
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  cacheWriteTextContext(context)

  tokenizeAndWriteTextFormat(` $dkred ? $${tcolor}${tlabel} \\`, context)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '/'
  tokenizeAndWriteTextFormat(
    `${state + 1}$green${knob}$${tcolor}${max + 1} \\`,
    context,
  )

  // write value
  tokenizeAndWriteTextFormat(`$green${tvalue} \\`, context)

  writeCharToEnd(' ', context)

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setValue(Math.min(max, state + step))
    },
    [max, value],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setValue(Math.max(min, state - step))
    },
    [min, value],
  )

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
