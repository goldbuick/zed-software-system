import { useCallback, useContext } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../hooks'
import { inputcolor } from '../panel/common'
import {
  TapeTerminalContext,
  TapeTerminalItemInputProps,
  setuplogitem,
} from '../tape/common'
import { UserInput } from '../userinput'

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
    const [target, data] = words
    cc.sendmessage(target, data)
  }, [words, cc])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 ${tcolor}${label}`,
    context,
    true,
  )

  context.changed()
  return active && <UserInput OK_BUTTON={invoke} />
}
