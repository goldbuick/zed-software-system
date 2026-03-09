import { useCallback, useContext } from 'react'
import { useWriteText } from 'zss/gadget/writetext'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalContext,
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

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

  const invoke = useCallback(() => {
    cc.sendmessage(prefix, [shortcut, maybetext, maybenoclose, ...data])
  }, [cc, prefix, shortcut, maybetext, maybenoclose, data])

  setuplogitem(!!active, 0, y, context)
  const content = `${
    context.iseven ? '$black$onltgray' : '$black$ondkcyan'
  }${text}${tcolor}$onclear ${label}\n`
  tokenizeandwritetextformat(content, context, true)

  return (
    <>
      {active && <UserInput OK_BUTTON={invoke} />}
      {shortcut && <UserHotkey hotkey={shortcut}>{invoke}</UserHotkey>}
    </>
  )
}
