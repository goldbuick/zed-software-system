import { useHotkeys } from 'react-hotkeys-hook'
import { hub } from 'zss/network/hub'

import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemHyperTextProps {
  playerId: string
  active: boolean
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemHyperText({
  playerId,
  active,
  target,
  label,
  args,
  context,
}: PanelItemHyperTextProps) {
  const [maybeChar, maybeColor] = args
  const char = maybeChar ?? 16
  const color = maybeColor ?? 'purple'

  tokenizeAndWriteTextFormat(`  $${color}$${char}  $white${label}`, context)

  useHotkeys(
    'enter',
    () => {
      hub.emit(target, 'gadget', undefined, playerId)
    },
    { enabled: !!active },
    [target, playerId],
  )

  return null
}
