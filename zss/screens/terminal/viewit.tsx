import { useCallback } from 'react'
import { useMedia, useWriteText } from 'zss/gadget/hooks'
import { UserInput } from 'zss/gadget/userinput'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function TerminalViewIt({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  const { setviewimage } = useMedia()

  const invoke = useCallback(() => {
    const [, ...values] = words
    const content = values.join(' ')
    setTimeout(() => setviewimage(content), 100)
  }, [setviewimage, words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $CYANVIEWIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
