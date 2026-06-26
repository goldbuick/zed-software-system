import { useCallback } from 'react'
import {
  wanixattach,
  wanixstop,
  wanixvmstart,
  wanixvmstop,
} from 'zss/device/api'
import { registerreadplayer } from 'zss/device/register'
import { SOFTWARE } from 'zss/device/session'
import { UserInput } from 'zss/gadget/userinput.bridge'
import { useWriteText } from 'zss/gadget/writetext'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

function readoptionalid(words: string[]) {
  return words.length > 1 ? words[1] : undefined
}

export function TerminalWanixAttach({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    wanixattach(SOFTWARE, registerreadplayer(), readoptionalid(words))
  }, [words])

  const tcolor = inputcolor(!!active)
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $CYAN${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}

export function TerminalWanixStop({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    wanixstop(SOFTWARE, registerreadplayer(), readoptionalid(words))
  }, [words])

  const tcolor = inputcolor(!!active)
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $CYAN${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}

export function TerminalWanixVmStop({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    wanixvmstop(SOFTWARE, registerreadplayer(), readoptionalid(words))
  }, [words])

  const tcolor = inputcolor(!!active)
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $CYAN${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}

export function TerminalWanixVm({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

  const invoke = useCallback(() => {
    wanixvmstart(SOFTWARE, registerreadplayer(), readoptionalid(words))
  }, [words])

  const tcolor = inputcolor(!!active)
  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `${prefix} $purple$16 $CYAN${tcolor}${label}`,
    context,
    true,
  )

  return active && <UserInput OK_BUTTON={invoke} />
}
