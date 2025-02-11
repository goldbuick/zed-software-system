import { useCallback } from 'react'
import { SOFTWARE } from 'zss/device/session'
import { ispresent } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { writetext } from 'zss/words/writeui'

import { useWriteText } from '../hooks'
import { inputcolor } from '../panel/common'
import { setuplogitem, TapeTerminalItemInputProps } from '../tape/common'
import { UserInput } from '../userinput'

export function TapeTerminalCopyIt({
  blink,
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    if (ispresent(navigator.clipboard)) {
      const [, ...values] = words
      const content = values.join(' ')
      navigator.clipboard
        .writeText(content)
        .then(() => writetext(SOFTWARE, `copied!`))
        .catch((err) => console.error(err))
    }
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  context.changed()
  return active && <UserInput OK_BUTTON={invoke} />
}
