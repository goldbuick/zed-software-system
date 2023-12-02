import { useCallback, useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { hub } from 'zss/network/hub'

import {
  WRITE_TEXT_CONTEXT,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'

import { ScrollContext } from './common'

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

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(target)
    scroll.sendclose()
  }, [scroll, target])

  useHotkeys(shortcut, () => invoke(), [target, player])
  useHotkeys('enter', () => invoke(), { enabled: !!active }, [target, player])

  return null
}
