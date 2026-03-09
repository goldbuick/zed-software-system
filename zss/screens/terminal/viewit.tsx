import { useCallback } from 'react'
import { useMedia } from 'zss/gadget/media'
import { UserInput } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { extractcontentfromargs } from 'zss/screens/inputcommon'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function TerminalViewIt({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  const { setviewimage } = useMedia()

  const invoke = useCallback(() => {
    const content = extractcontentfromargs(words)
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
