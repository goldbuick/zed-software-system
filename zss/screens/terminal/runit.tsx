import { useCallback } from 'react'
import { registerterminalopen } from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function TerminalRunIt({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    const content = extractcontentfromargs(words)
    registerterminalopen(SOFTWARE, registerreadplayer(), content)
  }, [words])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $CYANRUNIT ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
