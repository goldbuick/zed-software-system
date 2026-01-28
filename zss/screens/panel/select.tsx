import { useCallback } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'
import { useBlink } from 'zss/gadget/hooks'
import { UserInput, UserInputHandler } from 'zss/gadget/userinput'
import { maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { WORD } from 'zss/words/types'

import { PanelItemProps, inputcolor, setuppanelitem } from './common'

export function PanelSelect({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const [target, ...pairs] = [maptovalue(args[0], ''), ...args.slice(1)]

  const valuelabels: WORD[] = []
  const values: WORD[] = []

  for (let i = 0; i < pairs.length; i += 2) {
    valuelabels.push(pairs[i])
    values.push(pairs[i + 1])
  }

  // const min = 0
  // const max = values.length - 1

  // state
  const address = paneladdress(chip, target)
  const value = useWaitForValueNumber(address)
  const tvalue = `${value ?? 0}`
  let stateindex = values.indexOf(tvalue)
  if (stateindex < 0) {
    stateindex = 0
  }

  const blink = useBlink()

  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  tokenizeandwritetextformat(`$dkred ? ${tcolor}${tlabel} `, context, false)

  // write range viewer
  const knob = active ? (blink ? '$26' : '$27') : '/'
  tokenizeandwritetextformat(
    `${stateindex + 1}$green${knob}${tcolor}${values.length}`,
    context,
    false,
  )

  // write value
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateindex, address])

  const down = useCallback<UserInputHandler>(() => {
    const next = Math.min(values.length - 1, stateindex + 1)
    const nextvalue = parseFloat(values[next] as string)
    if (Number.isInteger(nextvalue)) {
      modemwritevaluenumber(address, nextvalue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stateindex, address])

  return <>{active && <UserInput MOVE_LEFT={up} MOVE_RIGHT={down} />}</>
}
