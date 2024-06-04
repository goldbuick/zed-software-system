import { useCallback, useContext } from 'react'
import { tape_info } from 'zss/device/api'
import { tokenizeandwritetextformat } from 'zss/gadget/data/textformat'

import { inputcolor } from '../panel/common'
import { UserInput } from '../userinput'

import {
  ConsoleContext,
  ConsoleItemInputProps,
  setupitemcontext,
} from './common'

export function TapeConsoleHyperlink({
  blink,
  active,
  prefix,
  label,
  words,
  offset,
  context,
}: ConsoleItemInputProps) {
  const cc = useContext(ConsoleContext)
  const invoke = useCallback(() => {
    const [target, data] = words
    cc.sendmessage(target, data)
  }, [words, cc])

  const tcolor = inputcolor(!!active)

  // render output
  setupitemcontext(!!blink, !!active, offset, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 ${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
