import { useCallback, useMemo } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import { UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { inputcolor } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { WORD } from 'zss/words/types'

export function TerminalSelect({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()
  const { valuelabels, values } = useMemo(() => {
    const pairs = words.slice(2)
    const valuelabels: WORD[] = []
    const values: WORD[] = []
    for (let i = 0; i < pairs.length; i += 2) {
      valuelabels.push(pairs[i])
      values.push(pairs[i + 1])
    }
    return { valuelabels, values }
  }, [words])

  const address = prefix
  const value = useWaitForValueNumber(address)
  const tvalue = `${value ?? 0}`
  let stateindex = values.indexOf(tvalue)
  if (stateindex < 0) {
    stateindex = 0
  }

  const blink = useBlink()
  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)

  setuplogitem(!!active, 0, y, context)
  tokenizeandwritetextformat(`$dkred ? ${tcolor}${tlabel} `, context, false)

  const knob = active ? (blink ? '$26' : '$27') : '/'
  tokenizeandwritetextformat(
    `${stateindex + 1}$green${knob}${tcolor}${values.length}`,
    context,
    false,
  )

  context.writefullwidth = 32
  tokenizeandwritetextformat(
    ` $green${valuelabels[stateindex] as string}`,
    context,
    false,
  )
  context.writefullwidth = undefined

  const up = useCallback<UserInputHandler>(() => {
    const next = Math.max(0, stateindex - 1)
    const nextvalue = parseFloat(values[next] as string)
    if (Number.isInteger(nextvalue)) {
      modemwritevaluenumber(address, nextvalue)
    }
  }, [stateindex, address, values])

  const down = useCallback<UserInputHandler>(() => {
    const next = Math.min(values.length - 1, stateindex + 1)
    const nextvalue = parseFloat(values[next] as string)
    if (Number.isInteger(nextvalue)) {
      modemwritevaluenumber(address, nextvalue)
    }
  }, [stateindex, address, values])

  return <>{active && <UserInput MOVE_LEFT={up} MOVE_RIGHT={down} />}</>
}
