import { useCallback } from 'react'
import { ispresent } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../hooks'
import { inputcolor } from '../panel/common'
import { setuplogitem, ConsoleItemInputProps } from '../tape/common'
import { UserInput } from '../userinput'

export function ConsoleOpenIt({
  blink,
  active,
  prefix,
  label,
  words,
  y,
}: ConsoleItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    if (ispresent(navigator.clipboard)) {
      const [, ...values] = words
      const content = values.join(' ')
      window.open(content, '_blank')
    }
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowOPENIT ${tcolor}${label}`,
    context,
    true,
  )

  context.changed()
  return active && <UserInput OK_BUTTON={invoke} />
}
