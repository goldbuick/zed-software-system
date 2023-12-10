import React, { useCallback, useState } from 'react'

import {
  tokenizeAndWriteTextFormat,
  writeTextColorReset,
} from '../../data/textFormat'
import { UserInput } from '../userinput'

import { PanelItemProps, mapTo } from './common'

export function PanelItemNumber({
  player,
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, maybemin, maybemax] = [
    mapTo(args[0], ''),
    mapTo(args[1], -1),
    mapTo(args[2], -1),
  ]

  let min: number
  let max: number
  if (maybemin === -1) {
    min = 0
    max = 31
  } else if (maybemax === -1) {
    min = 0
    max = maybemin
  } else {
    min = maybemin
    max = maybemax
  }

  // where does the current value live here ??
  const [value, setValue] = useState(0)

  const tcolor = active ? 'grey' : 'white'
  if (
    tokenizeAndWriteTextFormat(
      `$${tcolor}${label.trim()} $green${value}`,
      context,
    )
  ) {
    writeTextColorReset(context)
  }
  const invoke = useCallback(() => {
    console.info({ min, max, value })
  }, [min, max, value])

  return active && <UserInput OK_BUTTON={invoke} />
}
