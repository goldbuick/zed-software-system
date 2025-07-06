import { useCallback } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../gadget/hooks'
import { inputcolor } from '../gadget/panel/common'
import { UserInput } from '../gadget/userinput'
import { setuplogitem, TapeTerminalItemInputProps } from '../tape/common'

export function TapeTerminalOpenIt({
  blink,
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    const [, ...values] = words
    const content = values.join(' ')
    setTimeout(() => {
      window.open(content, '_blank')
    }, 100)
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowOPENIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
