import { useState } from 'react'
import {
  useCacheWriteTextContext,
  tokenizeAndWriteTextFormat,
  writeCharToEnd,
} from 'zss/gadget/data/textformat'
import { ispresent } from 'zss/mapping/types'

import { UserFocus, UserInput, UserInputMods, isMac } from '../userinput'
import { MAYBE_SHARED_TEXT, useSharedType } from '../useshared'

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
  const [value] = useSharedType<MAYBE_SHARED_TEXT>(chip, target)
  const state = value?.toJSON() ?? ''

  const blink = useBlink()
  const [cursor, setCursor] = useState(0)
  const [focus, setFocus] = useState(false)
  const [selection, setSelection] = useState<number | undefined>(undefined)

  let tvalue = `${state} `
  const tlabel = label.trim()
  const tcolor = inputcolor(active)

  // keep stable re-renders
  useCacheWriteTextContext(context)

  if (focus && blink) {
    tvalue = strsplice(tvalue, cursor, 1, '$219+')
  }
  tokenizeAndWriteTextFormat(`$green  $20 $${tcolor}${tlabel}$green\\`, context)
  const visiblerange = context.width - context.x - 2
  tokenizeAndWriteTextFormat(`${tvalue}\\`, context)
  writeCharToEnd(' ', context)

  return (
    <>
      {active && (
        <UserInput
          OK_BUTTON={() => {
            if (value) {
              setFocus(true)
              setCursor(value.length)
              setSelection(undefined)
            }
          }}
        />
      )}
      {focus && (
        <UserFocus blockhotkeys>
          <UserInput
            MOVE_LEFT={(mods) => {
              if (mods.shift && !selection) {
                setSelection(cursor)
              }
              setCursor((c) => Math.max(0, c - 1))
            }}
            MOVE_RIGHT={(mods) => {
              if (mods.shift && !selection) {
                setSelection(cursor)
              }
              setCursor((c) => Math.min(state.length, c + 1))
            }}
            CANCEL_BUTTON={() => setFocus(false)}
            OK_BUTTON={() => setFocus(false)}
            keydown={(event) => {
              if (!value) {
                return
              }

              const { key } = event
              const lkey = key.toLowerCase()
              const mods: UserInputMods = {
                alt: event.altKey,
                ctrl: isMac ? event.metaKey : event.ctrlKey,
                shift: event.shiftKey,
              }
              const state = value.toJSON()

              switch (lkey) {
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
                  if (mods.ctrl) {
                    switch (lkey) {
                      case 'c':
                        if (ispresent(navigator.clipboard)) {
                          navigator.clipboard
                            .writeText(value.toJSON())
                            .catch((err) => console.error(err))
                        }
                        break
                      case 'v':
                        if (ispresent(navigator.clipboard)) {
                          navigator.clipboard
                            .readText()
                            .then((text) => {
                              value.insert(cursor, text)
                            })
                            .catch((err) => console.error(err))
                        }
                        break
                      case 'x':
                        if (ispresent(navigator.clipboard)) {
                          navigator.clipboard
                            .writeText(value.toJSON())
                            .then(() => {
                              value.delete(0, value.length)
                            })
                            .catch((err) => console.error(err))
                        }
                        break
                    }
                  } else if (mods.alt) {
                    // no-op ??
                  } else if (key.length === 1 && state.length < visiblerange) {
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
