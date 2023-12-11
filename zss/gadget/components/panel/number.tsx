import React, { useCallback, useState } from 'react'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
} from '../../data/textFormat'
import { UserFocus, UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, mapTo, useBlink } from './common'

export function PanelItemNumber({
  player,
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const [target, maybemin, maybemax] = [
    mapTo(args[0], ''),
    mapTo(args[1], -1),
    mapTo(args[2], -1),
  ]

  let min: number
  let max: number
  if (maybemin === -1) {
    min = 0
    max = 31
  } else if (maybemax === -1) {
    min = 0
    max = maybemin
  } else {
    min = maybemin
    max = maybemax
  }

  // where does the current value live here ??
  const blink = useBlink()
  const [value, setValue] = useState(100)
  const [strvalue, setStrValue] = useState('')
  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  let tvalue = `${value}`
  const tcolor = active ? 'grey' : 'white'

  // keep stable re-renders
  cacheWriteTextContext(context)

  if (focus) {
    tvalue = strvalue.padEnd(4)
    if (blink) {
      tvalue = [
        tvalue.substring(0, cursor),
        '$219+',
        tvalue.substring(cursor + 1),
      ].join('')
    }
    tokenizeAndWriteTextFormat(
      `$green${tvalue}$${tcolor}${label.trim()}`,
      context,
    )
  } else {
    tokenizeAndWriteTextFormat(
      `$green${tvalue.padStart(3).padEnd(4)}$${tcolor}${label.trim()}    `,
      context,
    )
  }

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setValue((state) => Math.min(max, state + step))
    },
    [max, value],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setValue((state) => Math.max(min, state - step))
    },
    [min, value],
  )

  const ok = useCallback(() => {
    setFocus((state) => {
      const next = !state
      if (next) {
        setStrValue(`${value}`)
      }
      return next
    })
  }, [setFocus, setStrValue, value])

  return (
    <>
      {active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} OK_BUTTON={ok} />}
      {focus && (
        <UserFocus>
          <UserInput
            MOVE_LEFT={() => {
              setCursor((state) => Math.max(0, state - 1))
            }}
            MOVE_RIGHT={() => {
              setCursor((state) => Math.min(strvalue.length, state + 1))
            }}
            CANCEL_BUTTON={ok}
            OK_BUTTON={ok}
            keydown={(event) => {
              //
              console.info('XXX', event.key)
            }}
          />
        </UserFocus>
      )}
    </>
  )
}
