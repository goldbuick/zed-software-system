import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { writetext } from 'zss/feature/writeui'
import { withclipboard } from 'zss/mapping/keyboard'
import { ispresent } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

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
    setTimeout(() => {
      if (ispresent(withclipboard())) {
        const [, ...values] = words
        const content = values.join(' ')
        withclipboard()
          .writeText(content)
          .then(() => writetext(SOFTWARE, registerreadplayer(), `copied!`))
          .catch((err) => console.error(err))
      }
    }, 100)
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
