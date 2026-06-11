import { useCallback, useContext, useMemo } from 'react'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { UserHotkey, UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
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
  const parsed = useMemo(() => parseterminalmodemprefix(prefix), [prefix])

  const rawwords = words.map((v) => maptovalue(v, ''))
  const routetarget =
    prefix.trim().length > 0 ? prefix : (rawwords[1] ?? '').trim()
  const [, , shortcut, maybetext, ...data] = rawwords

  const text = maybetext || ` ${(shortcut ?? '').toUpperCase()} `
  const tcolor = inputcolor(!!active)

  const invoke = useCallback(() => {
    if (!routetarget) {
      return
    }
    cc.sendmessage(parsed?.chip ?? '', routetarget, [
      shortcut,
      maybetext,
      ...data,
    ])
  }, [cc, parsed?.chip, routetarget, shortcut, maybetext, data])

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
