import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { useBlink } from 'zss/gadget/blink'
import { UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { useWriteText } from 'zss/gadget/writetext'
import { maptovalue } from 'zss/mapping/value'
import { inputcolor, strsplice } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'

export function TerminalRange({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  const maybelabelmin = maptovalue(words[2], '')
  const maybelabelmax = maptovalue(words[3], '')

  let labelmin: string
  let labelmax: string
  if (maybelabelmin === '') {
    labelmin = 'L '
    labelmax = ' H'
  } else if (maybelabelmax === '') {
    labelmin = 'L '
    labelmax = ` ${String(maybelabelmin)}`
  } else {
    labelmin = `${String(maybelabelmin)} `
    labelmax = ` ${String(maybelabelmax)}`
  }

  const min = 0
  const max = 8
  const address = prefix
  const value = useWaitForValueNumber(address)
  const state = value ?? 0

  const blink = useBlink()
  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(`$red $29 ${tcolor}${tlabel} `, context, false)

  const knob = active ? (blink ? '$26' : '$27') : '$4'
  const bar = strsplice('----:----', state, 1, `$green${knob}${tcolor}`)
    .replaceAll('-', '$7')
    .replaceAll(':', '$9')

  tokenizeandwritetextformat(
    `${tcolor}${labelmin}${bar}${labelmax} $green${state + 1}`,
    context,
    false,
  )

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.min(max, state + step))
    },
    [max, state, address],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.max(min, state - step))
    },
    [min, state, address],
  )

  return <>{active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} />}</>
}
