import React, { useCallback, useContext } from 'react'

import {
  tokenizeAndWriteTextFormat,
  writeTextColorReset,
} from '../../data/textFormat'
import { UserInput } from '../userinput'

import { PanelItemProps, ScrollContext, mapTo, chiptarget } from './common'

export function PanelItemHyperText({
  player,
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, char, color] = [
    mapTo(args[0], ''),
    mapTo(args[1], 16),
    mapTo(args[2], 'purple'),
  ]

  const tcolor = active ? 'grey' : 'white'
  if (
    tokenizeAndWriteTextFormat(
      `  $${color}$${char}  $${tcolor}${label}`,
      context,
    )
  ) {
    writeTextColorReset(context)
  }

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target))
    scroll.sendclose()
  }, [scroll, target])

  return active && <UserInput OK_BUTTON={invoke} />
}
