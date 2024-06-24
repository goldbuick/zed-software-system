import { useCallback, useContext } from 'react'
import {
  tokenizeandwritetextformat,
  useWriteText,
} from 'zss/gadget/data/textformat'

import { inputcolor } from '../../panel/common'
import { UserInput } from '../../userinput'

import { ConsoleContext, ConsoleItemInputProps, setuplogitem } from './common'

export function TapeConsoleHyperlink({
  blink,
  active,
  prefix,
  label,
  words,
  offset,
}: ConsoleItemInputProps) {
  const context = useWriteText()

  const cc = useContext(ConsoleContext)
  const invoke = useCallback(() => {
    const [target, data] = words
    cc.sendmessage(target, data)
  }, [words, cc])

  const tcolor = inputcolor(!!active)

  // render output
  setuplogitem(!!blink, !!active, offset, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
