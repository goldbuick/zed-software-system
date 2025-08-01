import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { writetext } from 'zss/feature/writeui'
import { ispresent } from 'zss/mapping/types'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

import { useWriteText } from '../gadget/hooks'
import { inputcolor } from '../gadget/panel/common'
import { UserInput } from '../gadget/userinput'
import { TapeTerminalItemInputProps, setuplogitem } from '../tape/common'

export function TapeTerminalCopyIt({
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
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $yellowCOPYIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
