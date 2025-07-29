import { useCallback } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useMedia, useWriteText } from '../gadget/hooks'
import { inputcolor } from '../gadget/panel/common'
import { UserInput } from '../gadget/userinput'
import { TapeTerminalItemInputProps, setuplogitem } from '../tape/common'

export function TapeTerminalViewIt({
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
