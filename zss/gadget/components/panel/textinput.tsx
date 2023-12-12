import React, { useState } from 'react'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from '../../data/textFormat'
import { UserFocus, UserInput } from '../userinput'

import { PanelItemProps, mapTo, strsplice, useBlink } from './common'

export function PanelItemInputText({
  player,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const target = mapTo(args[0], '')

  // where does the current value live here ??
  const blink = useBlink()
  const [value, setValue] = useState('')
  const [reset, setReset] = useState('')
  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  let tvalue = `${value} `
  const tlabel = label.trim()
  const tcolor = active ? 'grey' : 'white'

  // keep stable re-renders
  cacheWriteTextContext(context)

  if (focus) {
    if (blink) {
      tvalue = strsplice(tvalue, cursor, 1, '$219+')
    }
    tokenizeAndWriteTextFormat(
      `$green TX $${tcolor}${tlabel}$green ${tvalue} \\`,
      context,
    )
  } else {
    tokenizeAndWriteTextFormat(
      `$green TX $${tcolor}${tlabel}$green ${tvalue} \\`,
      context,
    )
  }
  writeCharToEnd(' ', context)

  return (
    <>
      {active && (
        <UserInput
          OK_BUTTON={() => {
            setReset(value)
            setFocus(true)
          }}
        />
      )}
      {focus && (
        <UserFocus blockhotkeys>
          <UserInput
            MOVE_LEFT={() => {
              setCursor((state) => Math.max(0, state - 1))
            }}
            MOVE_RIGHT={() => {
              setCursor((state) => Math.min(value.length, state + 1))
            }}
            CANCEL_BUTTON={() => {
              // revert changes
              setValue(reset)
              setFocus(false)
            }}
            OK_BUTTON={() => {
              // keep changes
              setFocus(false)
            }}
            keydown={(event) => {
              switch (event.key.toLowerCase()) {
                case 'delete':
                  if (value.length > 0) {
                    setValue((state) => strsplice(state, cursor, 1))
                  }
                  break
                case 'backspace':
                  if (cursor > 0) {
                    setValue((state) => strsplice(state, cursor - 1, 1))
                    setCursor((state) => Math.max(0, state - 1))
                  }
                  break
              }

              if (
                event.key.length === 1 &&
                value.length < context.width * 0.5
              ) {
                setValue((state) => strsplice(state, cursor, 0, event.key))
                setCursor((state) => state + 1)
              }
            }}
          />
        </UserFocus>
      )}
    </>
  )
}
