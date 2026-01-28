import { useCallback, useState } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { paneladdress } from 'zss/gadget/data/types'
import { useBlink } from 'zss/gadget/hooks'
import {
  UserFocus,
  UserHotkey,
  UserInput,
  UserInputHandler,
} from 'zss/gadget/userinput'
import { maptonumber, maptovalue } from 'zss/mapping/value'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

import { PanelItemProps, inputcolor, setuppanelitem, strsplice } from './common'

const maybedefault = -111111

export function PanelNumber({
  sidebar,
  chip,
  row,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  setuppanelitem(sidebar, row, context)

  const [target, maybemin, maybemax] = [
    maptovalue(args[0], ''),
    maptonumber(args[1], maybedefault),
    maptonumber(args[2], maybedefault),
  ]

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

  // state
  const address = paneladdress(chip, target)
  const value = useWaitForValueNumber(address)
  const state = value ?? 0

  const blink = useBlink()
  const [strvalue, setstrValue] = useState('')
  const [cursor, setcursor] = useState(0)
  const [focus, setfocus] = useState(false)

  let tvalue = `${state}`
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  if (focus) {
    tvalue = blink ? strsplice(strvalue, cursor, 1, '$219+') : strvalue
  }

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
    setfocus((state) => {
      const next = !state
      if (next) {
        const str = `${value}`
        setstrValue(str)
        setcursor(str.length)
      } else {
        const num = parseFloat(strvalue)
        const newvalue = isNaN(num) ? 0 : num
        modemwritevaluenumber(target, Math.min(max, Math.max(min, newvalue)))
      }
      return next
    })
  }, [max, min, strvalue, target, value])

  return (
    value !== undefined && (
      <>
        {active && !focus && (
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
                switch (NAME(event.key)) {
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
