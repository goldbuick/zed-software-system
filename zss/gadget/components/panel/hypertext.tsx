import { useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

import { PanelItemProps, ScrollContext, addSelfId } from './common'

export function PanelItemHyperText({
  player,
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, maybeChar, maybeColor] = args
  const char = maybeChar ?? 16
  const color = maybeColor ?? 'purple'

  tokenizeAndWriteTextFormat(`  $${color}$${char}  $white${label}`, context)

  const scroll = useContext(ScrollContext)
  useHotkeys(
    'enter',
    () => {
      scroll.sendmessage(addSelfId(chip, target))
      scroll.sendclose()
    },
    { enabled: !!active },
    [scroll, target, player],
  )

  return null
}
