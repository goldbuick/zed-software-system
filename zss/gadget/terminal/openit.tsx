import { useCallback } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../hooks'
import { inputcolor } from '../panel/common'
import { setuplogitem, TapeTerminalItemInputProps } from '../tape/common'
import { UserInput } from '../userinput'

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
    window.open(content, '_blank')
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
