import { useCallback, useContext } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'

import { tokenizeAndWriteTextFormat } from '../../data/textFormat'

import { PanelItemProps, ScrollContext, mapTo, chiptarget } from './common'

export function PanelItemHotkey({
  player,
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, maybeshortcut, maybetext] = [
    mapTo(args[0], ''),
    mapTo(args[1], ''),
    mapTo(args[2], ''),
  ]

  const shortcut = maybeshortcut || ''
  const text = maybetext || ` ${shortcut} `

  tokenizeAndWriteTextFormat(
    `${
      context.isEven ? '$black$onltgray' : '$black$ondkcyan'
    }${text}$white$onempty ${label}`,
    context,
  )

  const scroll = useContext(ScrollContext)
  const invoke = useCallback(() => {
    scroll.sendmessage(chiptarget(chip, target))
    scroll.sendclose()
  }, [scroll, target])

  useHotkeys(shortcut, () => invoke(), [target, player])
  useHotkeys('enter', () => invoke(), { enabled: !!active }, [target, player])

  return null
}
