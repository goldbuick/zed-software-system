import React, { useCallback, useState } from 'react'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from '../../data/textFormat'
import { UserFocus, UserInput, UserInputHandler } from '../userinput'

import { PanelItemProps, mapTo, strsplice, useBlink } from './common'

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
  const [value, setValue] = useState(Math.round((min + max) * 0.5))
  const [strvalue, setStrValue] = useState('')
  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  let tvalue = `${value}`
  const tlabel = label.trim()
  const tcolor = active ? 'grey' : 'white'

  // keep stable re-renders
  cacheWriteTextContext(context)

  if (focus) {
    tvalue = strvalue.padEnd(4)
    if (strvalue.length > 3) {
      tvalue = `${tvalue} `
    }
    if (blink) {
      tvalue = strsplice(tvalue, cursor, 1, '$219+')
    }
    tokenizeAndWriteTextFormat(`$green${tvalue}$${tcolor}${tlabel} \\`, context)
  } else {
    tokenizeAndWriteTextFormat(
      `$green${tvalue.padStart(3).padEnd(4)}$${tcolor}${tlabel} \\`,
      context,
    )
  }
  writeCharToEnd(' ', context)

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
        const str = `${value}`
        setStrValue(str)
        setCursor(str.length)
      } else {
        const num = parseFloat(strvalue)
        const newvalue = isNaN(num) ? 0 : num
        setValue(Math.min(max, Math.max(min, newvalue)))
      }
      return next
    })
  }, [setFocus, setStrValue, min, max, value, strvalue])

  return (
    <>
      {active && <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} OK_BUTTON={ok} />}
      {focus && (
        <UserFocus blockhotkeys>
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
              switch (event.key.toLowerCase()) {
                case 'delete':
                  if (strvalue.length > 0) {
                    setStrValue((state) => strsplice(state, cursor, 1))
                  }
                  break
                case 'backspace':
                  if (cursor > 0) {
                    setStrValue((state) => strsplice(state, cursor - 1, 1))
                    setCursor((state) => Math.max(0, state - 1))
                  }
                  break
              }

              if (
                event.key.length === 1 &&
                strvalue.length < context.width * 0.5
              ) {
                setStrValue((state) => strsplice(state, cursor, 0, event.key))
                setCursor((state) => state + 1)
              }
            }}
          />
        </UserFocus>
      )}
    </>
  )
}
