import { useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

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

  tokenizeAndWriteTextFormat(`  $${color}$${char}  $white${label}`, context)

  const scroll = useContext(ScrollContext)

  useHotkeys(
    'enter',
    () => {
      scroll.sendmessage(chiptarget(chip, target))
      scroll.sendclose()
    },
    { enabled: !!active },
    [scroll, target, player],
  )

  return null
}
