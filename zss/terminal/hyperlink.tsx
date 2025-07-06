import { useCallback, useContext } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../gadget/hooks'
import { inputcolor } from '../gadget/panel/common'
import { UserInput } from '../gadget/userinput'
import {
  TapeTerminalContext,
  TapeTerminalItemInputProps,
  setuplogitem,
} from '../tape/common'

export function TapeTerminalHyperlink({
  blink,
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const cc = useContext(TapeTerminalContext)
  const invoke = useCallback(() => {
    const [target, ...data] = words
    setTimeout(() => {
      cc.sendmessage(target, data)
    }, 100)
  }, [words, cc])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
