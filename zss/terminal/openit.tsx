import { useCallback } from 'react'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../gadget/hooks'
import { inputcolor } from '../gadget/panel/common'
import { UserInput } from '../gadget/userinput'
import { TapeTerminalItemInputProps, setuplogitem } from '../tape/common'

export function TapeTerminalOpenIt({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    const [, openmethod, ...values] = words
    const content = values.join(' ')
    setTimeout(() => {
      if (openmethod === 'inline') {
        window.location.href = content
      } else {
        window.open(`${openmethod} ${content}`.trim(), '_blank')
      }
    }, 100)
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowOPENIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
