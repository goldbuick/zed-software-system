import { useHotkeys } from 'react-hotkeys-hook'
import { hub } from 'zss/network/hub'

import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemHyperTextProps {
  player: string
  active: boolean
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemHyperText({
  player,
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
      // send link message
      hub.emit(target, 'gadget', undefined, player)
      // send a message to trigger the close
      hub.emit('platform:clearscroll', 'gadget', undefined, player)
    },
    { enabled: !!active },
    [target, player],
  )

  return null
}
