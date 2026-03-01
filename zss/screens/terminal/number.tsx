import { useCallback, useState } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { useBlink, useWriteText } from 'zss/gadget/hooks'
import {
  UserFocus,
  UserHotkey,
  UserInput,
  UserInputHandler,
} from 'zss/gadget/userinput'
import { maptonumber } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { inputcolor, strsplice } from 'zss/screens/panel/common'
import {
  TapeTerminalItemInputProps,
  setuplogitem,
} from 'zss/screens/tape/common'

const maybedefault = -111111

export function TerminalNumber({
  active,
  prefix,
  label,
  words,
  y,
}: TapeTerminalItemInputProps) {
  const context = useWriteText()

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
  const state = value ?? 0

  const blink = useBlink()
  const [strvalue, setstrValue] = useState('')
  const [cursor, setcursor] = useState(0)
  const [focus, setfocus] = useState(false)

  let tvalue = `${state}`
  const tlabel = label.trim()
  const tcolor = inputcolor(!!active)

  if (focus) {
    tvalue = blink ? strsplice(strvalue, cursor, 1, '$219+') : strvalue
  }

  setuplogitem(!!active, 0, y, context)
  context.writefullwidth = 32
  tokenizeandwritetextformat(
    ` # ${tcolor}${tlabel} $green${tvalue}`,
    context,
    false,
  )
  context.writefullwidth = undefined

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

  const ok = useCallback(() => {
    setfocus((prev) => {
      const next = !prev
      if (next) {
        const str = `${value}`
        setstrValue(str)
        setcursor(str.length)
      } else {
        const num = parseFloat(strvalue)
        const newvalue = isNaN(num) ? 0 : num
        modemwritevaluenumber(address, Math.min(max, Math.max(min, newvalue)))
      }
      return next
    })
  }, [address, max, min, strvalue, value])

  return (
    value !== undefined && (
      <>
        {active && !focus && (
          <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} OK_BUTTON={ok} />
        )}
        {focus && (
          <UserFocus blockhotkeys>
            <UserHotkey hotkey="ctrl+c">{() => {}}</UserHotkey>
            <UserHotkey hotkey="ctrl+v">{() => {}}</UserHotkey>
            <UserHotkey hotkey="ctrl+a">{() => {}}</UserHotkey>
            <UserInput
              MOVE_LEFT={() => {
                setcursor((c) => Math.max(0, c - 1))
              }}
              MOVE_RIGHT={() => {
                setcursor((c) => Math.min(strvalue.length, c + 1))
              }}
              CANCEL_BUTTON={ok}
              OK_BUTTON={ok}
              keydown={(event) => {
                switch (NAME(event.key)) {
                  case 'delete':
                    if (strvalue.length > 0) {
                      setstrValue((s) => strsplice(s, cursor, 1))
                    }
                    break
                  case 'backspace':
                    if (cursor > 0) {
                      setstrValue((s) => strsplice(s, cursor - 1, 1))
                      setcursor((c) => Math.max(0, c - 1))
                    }
                    break
                }
                if (
                  event.key.length === 1 &&
                  strvalue.length < context.width * 0.5
                ) {
                  setstrValue((s) => strsplice(s, cursor, 0, event.key))
                  setcursor((c) => c + 1)
                }
              }}
            />
          </UserFocus>
        )}
      </>
    )
  )
}
