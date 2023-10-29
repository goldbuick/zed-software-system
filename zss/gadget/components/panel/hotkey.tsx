import { useHotkeys } from 'react-hotkeys-hook'
import { hub } from 'zss/network/hub'

import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

interface PanelItemHotkeyProps {
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemHotkey({
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
    (event) => {
      hub.emit(target)
    },
    [target],
  )

  return null
}
