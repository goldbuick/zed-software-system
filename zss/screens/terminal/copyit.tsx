import { useCallback } from 'react'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { withclipboard } from 'zss/feature/keyboard'
import { writetext } from 'zss/feature/writeui'
import { useWriteText } from 'zss/gadget/hooks'
import { UserInput } from 'zss/gadget/userinput'
import { ispresent } from 'zss/mapping/types'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

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
          .then(() =>
            writetext(
              SOFTWARE,
              registerreadplayer(),
              `copied! ${content.slice(0, 20)}`,
            ),
          )
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
