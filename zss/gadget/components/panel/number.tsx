import { useCallback, useState } from 'react'
import { MAYBE_NUMBER } from 'zss/mapping/types'

import {
  useCacheWriteTextContext,
  tokenizeandwritetextformat,
} from '../../data/textformat'
import { useBlink } from '../useblink'
import {
  UserFocus,
  UserHotkey,
  UserInput,
  UserInputHandler,
} from '../userinput'

import { PanelItemProps, inputcolor, mapTo, strsplice } from './common'

export function PanelItemNumber({
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

  // state
  const [value, setvalue] = useSharedValue<MAYBE_NUMBER>(chip, target)
  const state = value ?? 0

  const blink = useBlink()
  const [strvalue, setstrValue] = useState('')
  const [cursor, setcursor] = useState(0)
  const [focus, setfocus] = useState(false)

  let tvalue = `${value ?? 0}`
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  useCacheWriteTextContext(context)

  if (focus) {
    tvalue = blink ? strsplice(strvalue, cursor, 1, '$219+') : strvalue
  }

  tokenizeandwritetextformat(
    `  # ${tcolor}${tlabel} $green${tvalue}\n`,
    context,
    false,
  )

  const up = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setvalue(Math.min(max, state + step))
    },
    [max, setvalue, state],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      setvalue(Math.max(min, state - step))
    },
    [min, setvalue, state],
  )

  const ok = useCallback(() => {
    setfocus((state) => {
      const next = !state
      if (next) {
        const str = `${value}`
        setstrValue(str)
        setcursor(str.length)
      } else {
        const num = parseFloat(strvalue)
        const newvalue = isNaN(num) ? 0 : num
        setvalue(Math.min(max, Math.max(min, newvalue)))
      }
      return next
    })
  }, [setfocus, setstrValue, min, max, value, setvalue, strvalue])

  return (
    value !== undefined && (
      <>
        {active && (
          <UserInput MOVE_LEFT={down} MOVE_RIGHT={up} OK_BUTTON={ok} />
        )}
        {focus && (
          <UserFocus blockhotkeys>
            <UserHotkey hotkey="ctrl+c">
              {() => {
                console.info('copy')
              }}
            </UserHotkey>
            <UserHotkey hotkey="ctrl+v">
              {() => {
                console.info('paste')
              }}
            </UserHotkey>
            <UserHotkey hotkey="ctrl+a">
              {() => {
                console.info('select all')
              }}
            </UserHotkey>
            <UserInput
              MOVE_LEFT={() => {
                setcursor((state) => Math.max(0, state - 1))
              }}
              MOVE_RIGHT={() => {
                setcursor((state) => Math.min(strvalue.length, state + 1))
              }}
              CANCEL_BUTTON={ok}
              OK_BUTTON={ok}
              keydown={(event) => {
                switch (event.key.toLowerCase()) {
                  case 'delete':
                    if (strvalue.length > 0) {
                      setstrValue((state) => strsplice(state, cursor, 1))
                    }
                    break
                  case 'backspace':
                    if (cursor > 0) {
                      setstrValue((state) => strsplice(state, cursor - 1, 1))
                      setcursor((state) => Math.max(0, state - 1))
                    }
                    break
                }

                if (
                  event.key.length === 1 &&
                  strvalue.length < context.width * 0.5
                ) {
                  setstrValue((state) => strsplice(state, cursor, 0, event.key))
                  setcursor((state) => state + 1)
                }
              }}
            />
          </UserFocus>
        )}
      </>
    )
  )
}
