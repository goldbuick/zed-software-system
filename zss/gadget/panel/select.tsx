import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { WORD } from 'zss/words/types'

import { useBlink } from '../hooks'
import { UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelItemSelect({
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(row, context)

  const [target, ...pairs] = [maptovalue(args[0], ''), ...args.slice(1)]

  const valuelabels: WORD[] = []
  const values: WORD[] = []
  for (let i = 0; i < pairs.length; i += 2) {
    valuelabels.push(pairs[i])
    values.push(pairs[i + 1])
  }

  const min = 0
  const max = values.length - 1

  // state
  const address = paneladdress(chip, target)
  const modem = useWaitForValueNumber(address)
  const state = modem?.value ?? 0

  const blink = useBlink()

  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  const tvalue = `${valuelabels[state]}`
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  tokenizeandwritetextformat(` $dkred ? ${tcolor}${tlabel} `, context, false)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '/'
  tokenizeandwritetextformat(
    `${state + 1}$green${knob}${tcolor}${max + 1}`,
    context,
    false,
  )

  // write value
  context.writefullwidth = 32
  tokenizeandwritetextformat(` $green${tvalue}`, context, false)
  context.writefullwidth = undefined
  tokenizeandwritetextformat(`\n`, context, false)

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
