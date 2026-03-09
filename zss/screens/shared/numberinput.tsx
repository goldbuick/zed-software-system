import { useCallback, useState } from 'react'
import { modemwritevaluenumber, useWaitForValueNumber } from 'zss/device/modem'
import { useBlink } from 'zss/gadget/blink'
import {
  UserFocus,
  UserHotkey,
  UserInput,
  UserInputHandler,
} from 'zss/gadget/userinput'
import { tokenizeandwritetextformat } from 'zss/words/textformat'
import type { WRITE_TEXT_CONTEXT } from 'zss/words/textformat'
import { NAME } from 'zss/words/types'

export type NumberInputAdapter = {
  context: WRITE_TEXT_CONTEXT
  setup: () => void
  writeaddress: string
  inputcolor: (active: boolean) => string
  strsplice: (
    s: string,
    cursor: number,
    deletecount: number,
    insert?: string,
  ) => string
}

export type NumberInputProps = {
  active: boolean
  address: string
  label: string
  min: number
  max: number
  adapter: NumberInputAdapter
}

export function NumberInput({
  active,
  address,
  label,
  min,
  max,
  adapter,
}: NumberInputProps) {
  const { context, setup, writeaddress, inputcolor, strsplice } = adapter
  setup()

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
    [address, max, state],
  )

  const down = useCallback<UserInputHandler>(
    (mods) => {
      const step = mods.alt ? 10 : 1
      modemwritevaluenumber(address, Math.max(min, state - step))
    },
    [address, min, state],
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
        modemwritevaluenumber(
          writeaddress,
          Math.min(max, Math.max(min, newvalue)),
        )
      }
      return next
    })
  }, [max, min, strvalue, value, writeaddress])

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
