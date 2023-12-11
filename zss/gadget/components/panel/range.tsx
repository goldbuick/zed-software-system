import React, { useCallback, useState } from 'react'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from '../../data/textFormat'
import { UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, mapTo, strsplice, useBlink } from './common'

export function PanelItemRange({
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

  // where does the current value live here ??
  const blink = useBlink()
  const [value, setValue] = useState(Math.round((min + max) * 0.5))
  const tvalue = `${value}`
  const tlabel = label.trim()
  const tcolor = active ? 'grey' : 'white'

  // keep stable re-renders
  cacheWriteTextContext(context)

  tokenizeAndWriteTextFormat(
    `$green${tvalue.padStart(3).padEnd(4)}$${tcolor}${tlabel} \\`,
    context,
  )

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '$4'
  const bar = strsplice('----:----', value, 1, `$green${knob}$${tcolor}`)
    .replaceAll('-', '$7')
    .replaceAll(':', '$9')
  tokenizeAndWriteTextFormat(`${labelmin}${bar}${labelmax} \\`, context)
  writeCharToEnd(' ', context)

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setValue((state) => Math.min(max, state + step))
    },
    [max, value],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setValue((state) => Math.max(min, state - step))
    },
    [min, value],
  )

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
