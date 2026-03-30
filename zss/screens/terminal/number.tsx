import { useCallback } from 'react'
import { modemwritevaluenumber } from 'zss/device/modem'
import { useWaitForValueNumber } from 'zss/device/modemhooks'
import { useHyperlinkSharedSync } from 'zss/gadget/data/usehyperlinksharedsync'
import { UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { maptonumber } from 'zss/mapping/value'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

const maybedefault = -111111

export function TerminalNumber({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  useHyperlinkSharedSync(prefix, 'number')

  const maybemin = maptonumber(words[2], maybedefault)
  const maybemax = maptonumber(words[3], maybedefault)

  let min: number
  let max: number
  if (maybemin === maybedefault) {
    min = 0
    max = 31
  } else if (maybemax === maybedefault) {
    min = 0
    max = maybemin
  } else {
    min = maybemin
    max = maybemax
  }

  const address = prefix
  const value = useWaitForValueNumber(address)
  const state = value ?? min
  const clamped = Math.min(max, Math.max(min, state))

  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(
    `$red $29 ${tcolor}${tlabel} $green${clamped}`,
    context,
    false,
  )

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      const next = Math.min(max, clamped + step)
      modemwritevaluenumber(address, next)
    },
    [address, clamped, max],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      const next = Math.max(min, clamped - step)
      modemwritevaluenumber(address, next)
    },
    [address, clamped, min],
  )

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
