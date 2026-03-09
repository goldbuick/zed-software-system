import { useCallback, useContext } from 'react'
import { useWriteText } from 'zss/gadget/writetext'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import { HotkeyInput } from 'zss/screens/shared/hotkeyinput'
import {
  TapeTerminalContext,
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'

export function TerminalHotkey({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  const cc = useContext(TapeTerminalContext)

  const [, , shortcut, maybetext, maybenoclose, ...data] = words.map((v) =>
    maptovalue(v, ''),
  )

  const text = maybetext || ` ${(shortcut ?? '').toUpperCase()} `
  const tcolor = inputcolor(!!active)

  const content = `${
    context.iseven ? '$black$onltgray' : '$black$ondkcyan'
  }${text}${tcolor}$onclear ${label}\n`

  const invoke = useCallback(() => {
    cc.sendmessage(prefix, [shortcut, maybetext, maybenoclose, ...data])
  }, [cc, prefix, shortcut, maybetext, maybenoclose, data])

  return (
    <HotkeyInput
      active={!!active}
      shortcut={shortcut ?? ''}
      content={content}
      adapter={{
        context,
        setup: () => setuplogitem(!!active, 0, y, context),
        invoke,
      }}
    />
  )
}
