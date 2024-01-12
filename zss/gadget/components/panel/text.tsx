import React, { useState } from 'react'
import { MAYBE_TEXT, useSharedType } from 'zss/system/shared'

import {
  cacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from '../../data/textformat'
import { UserFocus, UserInput } from '../userinput'

import {
  PanelItemProps,
  inputcolor,
  mapTo,
  strsplice,
  useBlink,
} from './common'

export function PanelItemText({
  chip,
  active,
  label,
  args,
  context,
}: PanelItemProps) {
  const target = mapTo(args[0], '')

  // state
  const [value] = useSharedType<MAYBE_TEXT>(chip, target)
  const state = value?.toJSON() ?? ''

  const blink = useBlink()
  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)

  let tvalue = `${state} `
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  cacheWriteTextContext(context)

  if (focus && blink) {
    tvalue = strsplice(tvalue, cursor, 1, '$219+')
  }
  tokenizeAndWriteTextFormat(
    `$green  $20 $${tcolor}${tlabel}$green ${tvalue} \\`,
    context,
  )
  writeCharToEnd(' ', context)

  return (
    <>
      {active && (
        <UserInput
          OK_BUTTON={() => {
            if (value) {
              setFocus(true)
              setCursor(value.length)
            }
          }}
        />
      )}
      {focus && (
        <UserFocus blockhotkeys>
          <UserInput
            MOVE_LEFT={() => {
              setCursor((c) => Math.max(0, c - 1))
            }}
            MOVE_RIGHT={() => {
              setCursor((c) => Math.min(state.length, c + 1))
            }}
            CANCEL_BUTTON={() => setFocus(false)}
            OK_BUTTON={() => setFocus(false)}
            keydown={(event) => {
              if (!value) {
                return
              }

              const { key } = event
              const state = value.toJSON()

              switch (key.toLowerCase()) {
                case 'delete':
                  if (state.length > 0) {
                    value.delete(cursor, 1)
                  }
                  break
                case 'backspace':
                  if (cursor > 0) {
                    value.delete(cursor - 1, 1)
                    setCursor((state) => Math.max(0, state - 1))
                  }
                  break
                default:
                  if (key.length === 1 && state.length < context.width * 0.5) {
                    value.insert(cursor, key)
                    setCursor((state) => state + 1)
                  }
                  break
              }
            }}
          />
        </UserFocus>
      )}
    </>
  )
}
