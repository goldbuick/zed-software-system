import { useHotkeys } from 'react-hotkeys-hook'
import { hub } from 'zss/network/hub'

import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemHotkeyProps {
  playerId: string
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemHotkey({
  playerId,
  target,
  label,
  args,
  context,
}: PanelItemHotkeyProps) {
  const [maybeShortcut, maybeText] = args
  const shortcut = maybeShortcut || ''
  const text = maybeText || shortcut
  const trimmedText = text.trim()
  const indent = Math.max(0, text.length - trimmedText.length)

  tokenizeAndWriteTextFormat(
    `${' '.repeat(indent)}${
      context.isEven ? '$black$onltgray' : '$black$ondkcyan'
    } ${trimmedText.toUpperCase()} $white$ondkblue ${label}`,
    context,
  )

  useHotkeys(
    shortcut,
    () => {
      hub.emit(target, 'gadget', undefined, playerId)
    },
    [target],
  )

  return null
}