import { useHotkeys } from 'react-hotkeys-hook'
import { hub } from 'zss/network/hub'

import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

import { clearscroll } from './common'

interface PanelItemHotkeyProps {
  player: string
  active: boolean
  target: string
  label: string
  args: string[]
  context: WRITE_TEXT_CONTEXT
}

export function PanelItemHotkey({
  player,
  active,
  target,
  label,
  args,
  context,
}: PanelItemHotkeyProps) {
  const [maybeShortcut, maybeText] = args
  const shortcut = maybeShortcut || ''
  const text = maybeText || ` ${shortcut.toUpperCase()} `

  tokenizeAndWriteTextFormat(
    `${
      context.isEven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}$white$onempty ${label}`,
    context,
  )

  function emit() {
    hub.emit(target, 'gadget', undefined, player)
    clearscroll(player)
  }

  useHotkeys(shortcut, emit, [target, player])
  useHotkeys('enter', emit, { enabled: !!active }, [target, player])

  return null
}
