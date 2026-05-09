import { useCallback, useContext, useMemo } from 'react'
import { parseterminalmodemprefix } from 'zss/gadget/data/api'
import { UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalContext,
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function TerminalHyperlink({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  const cc = useContext(TapeTerminalContext)
  const parsed = useMemo(() => parseterminalmodemprefix(prefix), [prefix])

  const invoke = useCallback(() => {
    const [target, ...data] = words
    setTimeout(() => {
      cc.sendmessage(parsed?.chip ?? '', target, data)
    }, 100)
  }, [words, parsed?.chip, cc])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
