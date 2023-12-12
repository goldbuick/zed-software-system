import React, { useCallback, useState } from 'react'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from '../../data/textFormat'
import { UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, mapTo, strsplice, useBlink } from './common'

export function PanelItemSelect({
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, ...values] = [mapTo(args[0], ''), ...args.slice(1)]

  const min = 0
  const max = values.length - 1

  // where does the current value live here ??
  const blink = useBlink()
  const [value, setValue] = useState(0)
  const tvalue = `${values[value]}`
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
  const bar = strsplice(
    '-'.repeat(values.length),
    value,
    1,
    `$green${knob}$${tcolor}`,
  ).replaceAll('-', '$7')
  tokenizeAndWriteTextFormat(`${bar} \\`, context)
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
